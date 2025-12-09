from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import shutil
import os
import pandas as pd # New tool for Excel
import nest_asyncio
from dotenv import load_dotenv
from llama_parse import LlamaParse
from llama_index.llms.google_genai import GoogleGenAI
from llama_index.core.program import LLMTextCompletionProgram
from schemas import InvoiceSchema
from validator import validate_and_correct
from schemas import InvoiceSchema, DocumentClassification


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
parser = LlamaParse(
    api_key=os.getenv("LLAMA_CLOUD_API_KEY"),
    result_type="markdown",
    verbose=True
)

llm = GoogleGenAI(
    model="gemini-flash-latest",
    api_key=os.getenv("GOOGLE_API_KEY")
)

def classify_document(text: str):
    print("🎩 Sorting Hat: Classifying document...")

    # We only need the first 2000 chars to decide type
    preview_text = text[:2000]

    program = LLMTextCompletionProgram.from_defaults(
        output_cls=DocumentClassification,
        llm=llm,
        prompt_template_str="Classify this document as 'invoice', 'receipt', 'contract', or 'other'.\n\nDocument Text:\n{text}"
    )

    output = program(text=preview_text)
    print(f"🎩 Result: {output.document_type} ({output.confidence})")
    return output

# --- ENDPOINT 1: EXTRACT DATA (Updated with Validator) ---
@app.post("/extract-data")
async def extract_invoice_data(file: UploadFile = File(...)):
    temp_filename = f"temp_{file.filename}"
    try:
        with open(temp_filename, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        print(f"📄 Processing: {temp_filename}")
        documents = await parser.aload_data(temp_filename)
        pdf_text = documents[0].text

        # 1. RUN THE CLASSIFIER (The Sorting Hat)
        classification = classify_document(pdf_text)

        # 2. ROUTING LOGIC
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

            # Run Guardrails only for financial docs
            final_data = validate_and_correct(data_dict, pdf_text)

        elif classification.document_type == 'contract':
            print("📜 Routing to: CONTRACT AGENT (Stub)")
            # TODO: Build real contract extraction later
            final_data = {
                "vendor_name": "CONTRACT DETECTED",
                "total_amount": 0.00,
                "invoice_number": "N/A",
                "invoice_date": "N/A",
                "line_items": [],
                "currency": "USD",
                "validation_log": "⚠️ Contract Mode Not Implemented Yet"
            }

        else:
             print("❓ Unknown Document Type")
             final_data = {
                "vendor_name": "UNKNOWN DOCUMENT",
                "total_amount": 0.00,
                "invoice_number": "N/A",
                "line_items": [],
                "validation_log": "⚠️ File type not supported"
            }

        # Inject the detected type so Frontend knows
        final_data['document_type'] = classification.document_type

        os.remove(temp_filename)
        return final_data

    except Exception as e:
        if os.path.exists(temp_filename):
            os.remove(temp_filename)
        print(f"❌ Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
        
        # 1. Get AI Output
        output = program(text=pdf_text)
        
        # 2. Cleanup file
        os.remove(temp_filename)
        
        # --- 🕵️‍♂️ ENGINEERING GUARDRAIL START ---
        print("🤖 AI finished. Running Engineering Guardrails...")
        
        # Convert Pydantic object to standard Python Dict
        data_dict = output.dict()
        
        # Run the Math Check & Self-Correction
        final_data = validate_and_correct(data_dict, pdf_text)
        # --- 🕵️‍♂️ ENGINEERING GUARDRAIL END ---
        
        # Return the verified data
        return final_data 

    except Exception as e:
        if os.path.exists(temp_filename):
            os.remove(temp_filename)
        print(f"❌ Error: {e}") # Added print for easier debugging
        raise HTTPException(status_code=500, detail=str(e))
        
        output = program(text=pdf_text)
        os.remove(temp_filename)
        
        # Return the data as a clean dictionary
        return output.dict() 

    except Exception as e:
        if os.path.exists(temp_filename):
            os.remove(temp_filename)
        raise HTTPException(status_code=500, detail=str(e))

# --- ENDPOINT 2: GENERATE EXCEL (The Download) ---
@app.post("/generate-excel")
async def generate_excel(data: dict):
    try:
        # 1. Create a simplified flat table for Excel
        # We want the main invoice info on every row
        excel_rows = []
        
        for item in data['line_items']:
            row = {
                "Vendor": data['vendor_name'],
                "Date": data['invoice_date'],
                "Invoice #": data['invoice_number'],
                "Total Invoice Amount": data['total_amount'],
                "Currency": data['currency'],
                "Item Description": item['description'],
                "Quantity": item['quantity'],
                "Unit Price": item['unit_price'],
                "Line Total": item['total_price']
            }
            excel_rows.append(row)
            
        # 2. Convert to DataFrame (Pandas Magic)
        df = pd.DataFrame(excel_rows)
        
        # 3. Save to a temporary Excel file
        filename = "invoice_report.xlsx"
        df.to_excel(filename, index=False)
        
        # 4. Send the file to the user
        return FileResponse(filename, filename=filename, media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))