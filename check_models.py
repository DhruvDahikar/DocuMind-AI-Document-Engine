import os
from dotenv import load_dotenv
from google import genai

load_dotenv()

api_key = os.getenv("GOOGLE_API_KEY")

if not api_key:
    print("❌ API Key not found!")
else:
    print(f"✅ Found API Key: {api_key[:5]}...")

try:
    client = genai.Client(api_key=api_key)
    print("\nAttempting to connect to Google...")
    
    # Try to get the flash model specifically
    try:
        model = client.models.get(model="gemini-1.5-flash")
        print(f"🎉 SUCCESS! Found model: {model.name}")
        print(f"👉 USE THIS NAME IN YOUR CODE: {model.name.split('/')[-1]}")
    except Exception as e:
        print(f"\n❌ Could not find 'gemini-1.5-flash'.\nError: {e}")
        
        # If that fails, list ALL available models
        print("\nListing ALL available models for your key:")
        for m in client.models.list():
            if "gemini" in m.name:
                print(f" - {m.name}")

except Exception as e:
    print(f"❌ Critical Connection Error: {e}")