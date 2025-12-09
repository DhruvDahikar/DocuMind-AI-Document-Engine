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
        
        program = LLMTextCompletionProgram.from_defaults(
            output_cls=InvoiceSchema,
            llm=llm,
            prompt_template_str="Extract strict JSON data from this invoice text:\n\n{text}"
        )
        
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