import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("GOOGLE_API_KEY")
genai.configure(api_key=api_key)

print("🔍 Scanning available models for your API Key...")
print("-" * 40)

try:
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(f"✅ AVAILABLE LLM: {m.name}")
        if 'embedContent' in m.supported_generation_methods:
            print(f"🔹 AVAILABLE EMBEDDING: {m.name}")
except Exception as e:
    print(f"❌ ERROR: {e}")