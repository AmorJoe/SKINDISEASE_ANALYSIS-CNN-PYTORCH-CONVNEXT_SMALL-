import requests

API_URL = "http://localhost:8000/api/admin/models/"
# We need an admin token. Since I can't easily get one, I'll check if it's a 500 or 403.
# If it's 500, it's a backend crash.
try:
    response = requests.get(API_URL)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text[:500]}")
except Exception as e:
    print(f"Error: {e}")
