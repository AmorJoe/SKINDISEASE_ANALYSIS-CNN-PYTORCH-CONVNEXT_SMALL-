import requests
import json
import os
from decouple import config

# Log to file
LOG_FILE = "models_log.txt"
def log(msg):
    print(msg)
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(msg + "\n")

# Clear log
with open(LOG_FILE, "w", encoding="utf-8") as f:
    f.write("--- Models Log ---\n")

print("--- Testing Gemini API via REST ---")

try:
    api_key = config('GOOGLE_API_KEY', default=None)
    if not api_key:
        log("❌ Error: Valid API Key not found")
        exit(1)
    
    log(f"API Key: ...{api_key[-4:]}")

    # Test 2: Generate Content (POST)
    model = "gemini-2.5-flash"
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    
    log(f"\n--- Generating Content with {model} ---")
    log(f"POST {url.split('?')[0]}...")
    
    headers = {'Content-Type': 'application/json'}
    data = {"contents": [{"parts": [{"text": "Hello, are you online?"}]}]}
    
    response = requests.post(url, headers=headers, json=data, timeout=15)
    
    log(f"Status: {response.status_code}")
    if response.status_code == 200:
        log("✅ Generation Success!")
        log(f"Response: {response.text[:200]}...")
    else:
        log("❌ Generation Failed:")
        log(response.text)

except Exception as e:
    log(f"❌ Exception: {e}")
