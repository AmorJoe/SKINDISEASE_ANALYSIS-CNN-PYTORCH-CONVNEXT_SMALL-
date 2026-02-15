import os
import sys
import google.generativeai as genai
from decouple import config

# Force unbuffered output
sys.stdout.reconfigure(encoding='utf-8')

print("--- Starting Chatbot Verification ---", flush=True)

# Load Env
try:
    api_key = config('GOOGLE_API_KEY', default=None)
    if not api_key:
        print("❌ Error: GOOGLE_API_KEY not found in .env", flush=True)
        exit(1)
    
    # Check for placeholder
    if "PASTE_YOUR_API_KEY" in api_key:
        print("❌ Error: API Key is still the placeholder value.", flush=True)
        exit(1)
        
    print(f"✅ API Key found: {api_key[:5]}...{api_key[-4:]}", flush=True)
except Exception as e:
    print(f"❌ Error loading .env: {e}", flush=True)
    exit(1)

# Configure Gemini
print("Configuring Gemini...", flush=True)
try:
    genai.configure(api_key=api_key)
    print("✅ Configuration successful.", flush=True)
except Exception as e:
    print(f"❌ Configuration Failed: {e}", flush=True)
    exit(1)

# Test Generation
print("Sending test request to Gemini 1.5 Flash...", flush=True)
try:
    model = genai.GenerativeModel('gemini-1.5-flash')
    response = model.generate_content("Hello, this is a test.")
    
    if response and response.text:
        print(f"✅ Success! Response: {response.text}", flush=True)
    else:
        print("⚠️ Warning: Response object received specific content.", flush=True)
        print(response, flush=True)

except Exception as e:
    print(f"\n❌ Connection Failed!", flush=True)
    print(f"Error Type: {type(e).__name__}", flush=True)
    print(f"Error Message: {e}", flush=True)
    import traceback
    traceback.print_exc()
print("--- End Verification ---", flush=True)
