from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy import make_url
from llama_index.core import VectorStoreIndex, Document, StorageContext, Settings
from llama_index.vector_stores.postgres import PGVectorStore
from llama_index.embeddings.gemini import GeminiEmbedding
from llama_index.llms.gemini import Gemini
from llama_index.core.program import LLMTextCompletionProgram
from llama_parse import LlamaParse
import shutil
import os
import pandas as pd
import nest_asyncio
import json
import re
from typing import List, Optional
from pydantic import BaseModel
from dotenv import load_dotenv

from validator import validate_and_correct
from schemas import InvoiceSchema, DocumentClassification, ContractSchema

nest_asyncio.apply()
load_dotenv()

app = FastAPI(title="DocuMind API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- AI CONFIGURATION ---
try:
    embed_model = GeminiEmbedding(
        model_name="models/text-embedding-004", 
        api_key=os.getenv("GOOGLE_API_KEY")
    )
    
    llm = Gemini(
        model="models/gemini-2.5-flash-lite", 
        api_key=os.getenv("GOOGLE_API_KEY")
    )
    
    Settings.embed_model = embed_model
    Settings.llm = llm

    parser = LlamaParse(
        api_key=os.getenv("LLAMA_CLOUD_API_KEY"),
        result_type="markdown",
        verbose=True
    )
    
    print("✅ AI Models Initialized Successfully")
except Exception as e:
    print(f"🔥 CRITICAL SETUP ERROR: {e}")

# --- DATABASE CONNECTION ---
DB_URL = os.getenv("DATABASE_URL")

def get_vector_store():
    if not DB_URL:
        raise ValueError("DATABASE_URL is missing in .env")

    try:
        url = make_url(DB_URL)
        return PGVectorStore.from_params(
            database=url.database,
            host=url.host,
            password=url.password,
            port=url.port or 5432,
            user=url.username,
            table_name="document_embeddings",
            embed_dim=768
        )
    except Exception as e:
        print(f"Connection Error: {e}")
        raise e

# --- UTILITIES ---
def smart_classify(text: str):
    text_lower = text.lower()[:3000] 
    
    invoice_keywords = [
        'invoice #', 'bill to:', 'ship to:', 'amount due', 'total balance', 
        'tax invoice', 'gst reg', 'vat reg', 'qty', 'unit price', 'subtotal'
    ]
    invoice_score = sum(1 for word in invoice_keywords if word in text_lower)
    
    contract_keywords = [
        'contract', 'agreement', 'bill of sale', 'mutual', 'confidentiality', 
        'party', 'parties', 'seller', 'buyer', 'witnesseth', 'whereas', 
        'governing law', 'jurisdiction', 'effective date', 'employment', 
        'non-disclosure', 'severability', 'entire agreement', 'termination', 
        'indemnification', 'warranty'
    ]
    contract_score = sum(1 for word in contract_keywords if word in text_lower)

    if contract_score >= 1: return 'contract'
    if invoice_score > contract_score: return 'invoice'
    return 'invoice'

def clean_json_text(text: str):
    text = re.sub(r'```json\s*', '', text)
    text = re.sub(r'```\s*', '', text)
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        return match.group(0)
    return text

def remove_file(path: str):
    try:
        os.remove(path)
    except Exception as e:
        print(f"Cleanup failed: {e}")

async def ingest_document_to_vector_db(text: str, filename: str, user_id: str):
    try:
        doc = Document(
            text=text, 
            metadata={
                "filename": filename,
                "user_id": user_id, 
                "type": "uploaded_doc"
            }
        )

        vector_store = get_vector_store()
        storage_context = StorageContext.from_defaults(vector_store=vector_store)

        VectorStoreIndex.from_documents(
            [doc], 
            storage_context=storage_context,
            show_progress=True
        )
    except Exception as e:
        print(f"Vector Ingestion Failed: {e}")

# --- ENDPOINTS ---

@app.post("/extract-data")
async def extract_invoice_data(
    file: UploadFile = File(...), 
    doc_type: str = Form("auto"),
    user_id: str = Form(...)
):
    temp_filename = f"temp_{file.filename}"
    try:
        with open(temp_filename, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        try:
            documents = await parser.aload_data(temp_filename)
            pdf_text = documents[0].text
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Parse Failed: {str(e)}")

        await ingest_document_to_vector_db(pdf_text, file.filename, user_id)

        if doc_type != "auto":
            classification = doc_type
        else:
            classification = smart_classify(pdf_text)
        
        final_data = {}

        if classification == 'invoice':
            prompt = """
            You are an expert Data Extraction AI. Extract data from this invoice/receipt into strict JSON.
            CRITICAL INSTRUCTIONS:
            1. **Discounts:** If you see a number in parentheses like '(50.00)', it is NEGATIVE. Extract it as -50.00.
            2. **Tax Hunt:** Look specifically at the bottom for "Tax", "VAT", or "%". Extract that amount into 'tax_amount'.
            3. **Consistency:** 'total_amount' must equal (Line Items Sum + Tax).
            Document Text:
            {text}
            """
            program = LLMTextCompletionProgram.from_defaults(output_cls=InvoiceSchema, llm=llm, prompt_template_str=prompt)
            output = program(text=pdf_text)
            data_dict = output.dict()

            items_sum = sum(item.get('total_price', 0) for item in data_dict.get('line_items', []))
            extracted_total = data_dict.get('total_amount', 0)
            diff = extracted_total - items_sum
            
            if data_dict.get('tax_amount', 0) == 0 and diff > 0.05:
                data_dict['tax_amount'] = round(diff, 2)
                data_dict['validation_log'] = "Fixed: Missing Tax Auto-Calculated"
            
            final_data = validate_and_correct(data_dict, pdf_text)

        elif classification == 'contract':
            prompt = (
                "You are a Senior Legal Analyst. Analyze this contract and extract data strictly according to the schema.\n"
                "CRITICAL: Output ONLY valid JSON. No Markdown.\n\nContract Text:\n{text}"
            )
            try:
                program = LLMTextCompletionProgram.from_defaults(output_cls=ContractSchema, llm=llm, prompt_template_str=prompt)
                output = program(text=pdf_text)
                final_data = output.dict()
            except Exception:
                raw = llm.complete(prompt.format(text=pdf_text)).text
                final_data = json.loads(clean_json_text(raw))

            final_data['vendor_name'] = final_data.get('parties_involved', ["Unknown"])[0] 
            final_data['total_amount'] = 0.00
            final_data['invoice_number'] = "NDA"
            final_data['invoice_date'] = final_data.get('effective_date', "N/A")
            final_data['line_items'] = []
            final_data['currency'] = "USD"
            final_data['validation_log'] = f"Risk Level: {final_data.get('overall_risk_level', 'Unknown')}"

        final_data['document_type'] = classification
        os.remove(temp_filename)
        return final_data

    except Exception as e:
        if os.path.exists(temp_filename): os.remove(temp_filename)
        raise HTTPException(status_code=500, detail=str(e))

class ChatRequest(BaseModel):
    message: str
    user_id: str

@app.post("/chat")
async def chat_with_docs(request: ChatRequest):
    try:
        vector_store = get_vector_store()
        index = VectorStoreIndex.from_vector_store(vector_store=vector_store)

        from llama_index.core.vector_stores import MetadataFilters, ExactMatchFilter
        
        filters = MetadataFilters(
            filters=[ExactMatchFilter(key="user_id", value=request.user_id)]
        )

        query_engine = index.as_query_engine(
            filters=filters,
            similarity_top_k=5
        )

        response = query_engine.query(request.message)
        return {"response": str(response)}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-excel")
async def generate_excel(data: dict, background_tasks: BackgroundTasks):
    try:
        excel_rows = []
        items = data.get('line_items', [])
        for item in items:
            excel_rows.append({
                "Vendor": data.get('vendor_name', ''),
                "Date": data.get('invoice_date', ''),
                "Invoice #": data.get('invoice_number', ''),
                "Description": item.get('description', ''),
                "Quantity": item.get('quantity', 1),
                "Unit Price": item.get('unit_price', 0),
                "Total": item.get('total_price', 0)
            })
        if data.get('tax_amount', 0) > 0:
            excel_rows.append({"Description": "TAX / VAT", "Total": data.get('tax_amount', 0)})
        excel_rows.append({"Description": "GRAND TOTAL", "Total": data.get('total_amount', 0)})
            
        df = pd.DataFrame(excel_rows)
        filename = f"report_{data.get('invoice_number', 'temp')}.xlsx"
        df.to_excel(filename, index=False)
        
        background_tasks.add_task(remove_file, filename)
        
        return FileResponse(filename, filename=filename, media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-summary")
async def generate_summary(data: dict, background_tasks: BackgroundTasks):
    try:
        report_content = f"""
LEGAL CONTRACT ANALYSIS
=======================
Type: {data.get('contract_type', 'Unknown')}
Risk: {data.get('overall_risk_level', 'Unknown')}
Parties: {", ".join(data.get('parties_involved', []))}

RISK ANALYSIS:
--------------
{data.get('risk_analysis', 'No analysis provided.')}

KEY TERMS:
----------
{chr(10).join(["- " + t for t in data.get('key_terms', [])])}
"""
        filename = f"summary_{data.get('invoice_number', 'temp')}.txt"
        with open(filename, "w", encoding="utf-8") as f: f.write(report_content)
        
        background_tasks.add_task(remove_file, filename)
            
        return FileResponse(filename, filename=filename, media_type='text/plain')
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))