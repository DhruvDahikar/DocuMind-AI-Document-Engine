import os
import asyncio
import nest_asyncio  
from dotenv import load_dotenv
from llama_parse import LlamaParse
from llama_index.llms.google_genai import GoogleGenAI
from llama_index.core.program import LLMTextCompletionProgram
from schemas import InvoiceSchema

# Apply the patch immediately
nest_asyncio.apply()  

# 1. Load keys
load_dotenv()

# Check keys
if not os.getenv("GOOGLE_API_KEY") or not os.getenv("LLAMA_CLOUD_API_KEY"):
    print("❌ Error: Keys missing. Check .env file.")
    exit()

print("✅ Keys loaded. Setting up AI...")

# 2. Setup the 'Eyes' (LlamaParse)
parser = LlamaParse(
    api_key=os.getenv("LLAMA_CLOUD_API_KEY"),
    result_type="markdown",
    verbose=True
)

# 3. Setup the 'Brain' (GoogleGenAI)
llm = GoogleGenAI(
    model="gemini-flash-latest", 
    api_key=os.getenv("GOOGLE_API_KEY")
)

async def process_invoice(pdf_filename):
    print(f"\n📄 Reading '{pdf_filename}'... (LlamaParse)")
    documents = await parser.aload_data(pdf_filename)
    pdf_text = documents[0].text
    
    print("🧠 Thinking... (Gemini Flash)")
    program = LLMTextCompletionProgram.from_defaults(
        output_cls=InvoiceSchema,
        llm=llm,
        prompt_template_str="Extract strict JSON data from this invoice text:\n\n{text}"
    )
    
    # We await the program execution here to be safe
    output = program(text=pdf_text)
    return output

def main():
    pdf_file = "invoice.pdf"
    if not os.path.exists(pdf_file):
        print(f"❌ Error: Could not find '{pdf_file}'")
        return

    try:
        # use a cleaner way to run the async loop
        result = asyncio.run(process_invoice(pdf_file))
        print("\n🎉 SUCCESS! Data Extracted:\n")
        print(result.model_dump_json(indent=2))
    except RuntimeError:
        # Fallback if the loop is already running
        loop = asyncio.get_event_loop()
        result = loop.run_until_complete(process_invoice(pdf_file))
        print("\n🎉 SUCCESS! Data Extracted:\n")
        print(result.model_dump_json(indent=2))
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    main()