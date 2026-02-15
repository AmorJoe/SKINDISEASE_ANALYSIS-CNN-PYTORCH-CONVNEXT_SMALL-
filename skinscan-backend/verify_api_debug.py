import requests
import json
import os
from decouple import config

# Log to file
LOG_FILE = "debug_log.txt"
def log(msg):
    print(msg)
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(msg + "\n")

# Clear log
with open(LOG_FILE, "w", encoding="utf-8") as f:
    f.write("--- Debug Log ---\n")

print("--- Debugging Gemini API 404 ---")
log("Starting debug...")

try:
    api_key = config('GOOGLE_API_KEY', default=None)
    if not api_key:
        log("❌ Error: Valid API Key not found")
        exit(1)

    log(f"API Key: ...{api_key[-4:]}")

    # Payload
    headers = {'Content-Type': 'application/json'}
    data = {
        "contents": [{"parts": [{"text": "Hello"}]}]
    }

    # Variations to test
    variations = [
        ("v1beta", "models/gemini-1.5-flash"),
        ("v1beta", "gemini-1.5-flash"),
        ("v1", "models/gemini-1.5-flash"),
        ("v1beta", "models/gemini-pro"),
        ("v1beta", "models/gemini-1.0-pro"),
    ]

    for version, model in variations:
        url = f"https://generativelanguage.googleapis.com/{version}/{model}:generateContent?key={api_key}"
        
        log(f"\nTesting: {url.split('?')[0]}")
        try:
            response = requests.post(url, headers=headers, json=data, timeout=10)
            log(f"Status: {response.status_code}")
            if response.status_code == 200:
                log("✅ SUCCESS!")
                log(f"Response: {json.dumps(response.json(), indent=2)}")
                break
            else:
                log(f"❌ Failed Status: {response.status_code}")
                try:
                    err = response.json()
                    log(f"❌ Error JSON: {json.dumps(err, indent=2)}")
                except:
                    log(f"❌ Error Text: {response.text}")
        except Exception as e:
            log(f"❌ Exception: {e}")

except Exception as e:
    log(f"❌ Setup Error: {e}")
