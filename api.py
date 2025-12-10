from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import shutil
import os
import pandas as pd
import nest_asyncio
import json
import re
from dotenv import load_dotenv
from llama_parse import LlamaParse
from llama_index.llms.google_genai import GoogleGenAI
from llama_index.core.program import LLMTextCompletionProgram
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
    parser = LlamaParse(
        api_key=os.getenv("LLAMA_CLOUD_API_KEY"),
        result_type="markdown",
        verbose=True
    )

    llm = GoogleGenAI(
        model="gemini-flash-latest", # Keep this if it allowed server start
        api_key=os.getenv("GOOGLE_API_KEY")
    )
except Exception as e:
    print(f"🔥 CRITICAL SETUP ERROR: {e}")

def clean_json_text(text: str):
    # Strip markdown and find the JSON brackets
    text = re.sub(r'```json\s*', '', text)
    text = re.sub(r'```\s*', '', text)
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        return match.group(0)
    return text

def classify_document(text: str):
    print("🎩 Sorting Hat: Classifying document...")
    try:
        preview_text = text[:2000]
        program = LLMTextCompletionProgram.from_defaults(
            output_cls=DocumentClassification,
            llm=llm,
            prompt_template_str="Classify this document as 'invoice', 'receipt', 'contract', or 'other'.\n\nDocument Text:\n{text}"
        )
        output = program(text=preview_text)
        print(f"🎩 Result: {output.document_type} ({output.confidence})")
        return output
    except Exception as e:
        print(f"🔥 CLASSIFICATION ERROR: {e}")
        raise e

# --- ENDPOINT 1: EXTRACT DATA ---
@app.post("/extract-data")
async def extract_invoice_data(file: UploadFile = File(...)):
    temp_filename = f"temp_{file.filename}"
    try:
        # 1. Save File
        with open(temp_filename, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # 2. Parse PDF (LlamaParse)
        print(f"📄 Step 1: Parsing Document {temp_filename}...")
        try:
            documents = await parser.aload_data(temp_filename)
            pdf_text = documents[0].text
            print(f"📄 Parsed successfully! Length: {len(pdf_text)} chars")
        except Exception as e:
            print(f"🔥 LLAMA PARSE ERROR: {e}")
            raise HTTPException(status_code=500, detail=f"LlamaParse Failed: {str(e)}")

        # 3. Classify
        classification = classify_document(pdf_text)

        # 4. Route
        final_data = {}
        if classification.document_type in ['invoice', 'receipt']:
            print("⚡ Routing to: INVOICE AGENT")
            program = LLMTextCompletionProgram.from_defaults(
                output_cls=InvoiceSchema,
                llm=llm,
                prompt_template_str="Extract strict JSON data from this invoice/receipt:\n\n{text}"
            )
            output = program(text=pdf_text)
            data_dict = output.dict()
            final_data = validate_and_correct(data_dict, pdf_text)

        elif classification.document_type == 'contract':
            print("📜 Routing to: CONTRACT AGENT")
            prompt = (
                "You are a Senior Legal Analyst. Analyze this contract and extract data strictly according to the schema.\n"
                "CRITICAL: Output ONLY valid JSON. Do not use Markdown formatting (no ```json). Do not add introductory text.\n\n"
                "Contract Text:\n{text}"
            )
            try:
                program = LLMTextCompletionProgram.from_defaults(
                    output_cls=ContractSchema,
                    llm=llm,
                    prompt_template_str=prompt
                )
                output = program(text=pdf_text)
                final_data = output.dict()
            except Exception as e:
                print(f"⚠️ Strict Parsing Failed: {e}. Attempting manual cleanup...")
                raw_response = llm.complete(prompt.format(text=pdf_text)).text
                cleaned_json = clean_json_text(raw_response)
                final_data = json.loads(cleaned_json)

            # Dummy fields
            final_data['vendor_name'] = final_data.get('parties_involved', ["Unknown"])[0] 
            final_data['total_amount'] = 0.00
            final_data['invoice_number'] = "NDA"
            final_data['invoice_date'] = final_data.get('effective_date', "N/A")
            final_data['line_items'] = []
            final_data['currency'] = "USD"
            final_data['validation_log'] = f"Risk Level: {final_data.get('overall_risk_level', 'Unknown')}"
        
        else:
             final_data = { "vendor_name": "UNKNOWN", "total_amount": 0.00, "invoice_number": "N/A", "line_items": [], "validation_log": "⚠️ File type not supported" }

        final_data['document_type'] = classification.document_type
        os.remove(temp_filename)
        return final_data

    except Exception as e:
        if os.path.exists(temp_filename):
            os.remove(temp_filename)
        print(f"❌ GLOBAL ERROR: {e}") # <--- This will tell us the real problem
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-excel")
async def generate_excel(data: dict):
    # Keep your excel logic here (abbreviated for safety)
    try:
        excel_rows = []
        # ... existing logic ...
        return FileResponse("report.xlsx", filename="report.xlsx") # Stub return
    except:
        pass

# --- ENDPOINT 3: GENERATE TEXT SUMMARY (For Contracts) ---
@app.post("/generate-summary")
async def generate_summary(data: dict):
    try:
        # Create a readable text report
        report_content = f"""
==================================================
        LEGAL CONTRACT ANALYSIS REPORT
==================================================
Type:       {data.get('contract_type', 'Unknown')}
Effective:  {data.get('effective_date', 'N/A')}
Parties:    {", ".join(data.get('parties_involved', []))}
Risk Level: {data.get('overall_risk_level', 'Unknown')}
==================================================

KEY TERMS:
----------
"""
        for term in data.get('key_terms', []):
            report_content += f"- {term}\n"
            
        report_content += f"""
        
RISK ANALYSIS:
--------------
{data.get('risk_analysis', 'No analysis provided.')}

==================================================
Generated by DocuMind AI
"""
        
        # Save to temp file
        filename = "contract_summary.txt"
        with open(filename, "w", encoding="utf-8") as f:
            f.write(report_content)
            
        return FileResponse(filename, filename=filename, media_type='text/plain')

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))