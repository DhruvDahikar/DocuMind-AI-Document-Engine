from fastapi import FastAPI, UploadFile, File, Form, HTTPException
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
        model="gemini-flash-latest", 
        api_key=os.getenv("GOOGLE_API_KEY")
    )
except Exception as e:
    print(f"🔥 CRITICAL SETUP ERROR: {e}")

def clean_json_text(text: str):
    text = re.sub(r'```json\s*', '', text)
    text = re.sub(r'```\s*', '', text)
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        return match.group(0)
    return text

# --- ⚡ OPTIMIZATION: Python Keyword Classifier ---
def smart_classify(text: str):
    print("⚡ Speed-Sorting: analyzing keywords locally...")
    text_lower = text.lower()[:3000] 
    
    invoice_keywords = ['invoice', 'bill to', 'amount due', 'total balance', 'receipt', 'payment', 'subtotal', 'tax']
    invoice_score = sum(1 for word in invoice_keywords if word in text_lower)
    
    contract_keywords = ['agreement', 'mutual', 'confidentiality', 'party', 'parties', 'witnesseth', 'whereas', 'governing law']
    contract_score = sum(1 for word in contract_keywords if word in text_lower)

    print(f"📊 Scores -> Invoice: {invoice_score} | Contract: {contract_score}")
    
    if contract_score > invoice_score:
        return 'contract'
    return 'invoice'

# --- ENDPOINT 1: EXTRACT DATA ---
@app.post("/extract-data")
async def extract_invoice_data(
    file: UploadFile = File(...), 
    doc_type: str = Form("auto") # <--- NEW PARAMETER
):
    temp_filename = f"temp_{file.filename}"
    try:
        with open(temp_filename, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        print(f"📄 Step 1: Parsing Document {temp_filename}...")
        try:
            documents = await parser.aload_data(temp_filename)
            pdf_text = documents[0].text
        except Exception as e:
            print(f"🔥 PARSE ERROR: {e}")
            raise HTTPException(status_code=500, detail=f"Parse Failed: {str(e)}")

        # --- DETERMINISTIC ROUTING LOGIC ---
        if doc_type != "auto":
            print(f"🔒 Manual Override Active: Forcing {doc_type.upper()} Agent")
            classification = doc_type
        else:
            classification = smart_classify(pdf_text)
            print(f"🎩 Auto-Classified as: {classification.upper()}")
        
        final_data = {}

        if classification == 'invoice':
            print("⚡ Routing to: INVOICE AGENT")
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

            # --- 🔧 MATH PATCH: Auto-Calculate Missing Tax ---
            items_sum = sum(item.get('total_price', 0) for item in data_dict.get('line_items', []))
            extracted_total = data_dict.get('total_amount', 0)
            diff = extracted_total - items_sum
            
            if data_dict.get('tax_amount', 0) == 0 and diff > 0.05:
                print(f"🔧 Auto-Healing: AI missed Tax. Detected gap of {diff:.2f}. Injecting as Tax.")
                data_dict['tax_amount'] = round(diff, 2)
                data_dict['validation_log'] = "Fixed: Missing Tax Auto-Calculated"
            
            final_data = validate_and_correct(data_dict, pdf_text)

        elif classification == 'contract':
            print("📜 Routing to: CONTRACT AGENT")
            prompt = (
                "You are a Senior Legal Analyst. Analyze this contract and extract data strictly according to the schema.\n"
                "CRITICAL: Output ONLY valid JSON. No Markdown.\n\nContract Text:\n{text}"
            )
            try:
                program = LLMTextCompletionProgram.from_defaults(output_cls=ContractSchema, llm=llm, prompt_template_str=prompt)
                output = program(text=pdf_text)
                final_data = output.dict()
            except Exception:
                # Fallback cleanup
                raw = llm.complete(prompt.format(text=pdf_text)).text
                final_data = json.loads(clean_json_text(raw))

            # Dummy fields for UI
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
        print(f"❌ GLOBAL ERROR: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-excel")
async def generate_excel(data: dict):
    # (Same Excel Logic as before - kept short here for readability)
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
        filename = "report.xlsx"
        df.to_excel(filename, index=False)
        return FileResponse(filename, filename=filename, media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-summary")
async def generate_summary(data: dict):
    # (Same Summary Logic as before)
    try:
        report_content = f"LEGAL REPORT\nType: {data.get('contract_type')}\nRisk: {data.get('overall_risk_level')}\n\nRISK ANALYSIS:\n{data.get('risk_analysis')}"
        filename = "contract_summary.txt"
        with open(filename, "w", encoding="utf-8") as f: f.write(report_content)    
        return FileResponse(filename, filename=filename, media_type='text/plain')
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))