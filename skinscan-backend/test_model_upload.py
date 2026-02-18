import requests
import os

API_BASE_URL = "http://localhost:8000/api/admin"
# Note: You'll need a valid admin JWT token to run this
TOKEN = "YOUR_ADMIN_TOKEN_HERE"

def test_model_upload():
    # Create a dummy .pth file
    test_file = "test_model_v1.pth"
    with open(test_file, "w") as f:
        f.write("dummy model data")

    try:
        with open(test_file, "rb") as f:
            files = {"model_file": (test_file, f)}
            headers = {"Authorization": f"Bearer {TOKEN}"}
            response = requests.post(f"{API_BASE_URL}/models/upload/", headers=headers, files=files)
            
            print(f"Status Code: {response.status_code}")
            print(f"Response: {response.json()}")
    finally:
        if os.path.exists(test_file):
            os.remove(test_file)

if __name__ == "__main__":
    print("Testing Model Upload API...")
    # This is a template script; real testing requires active auth.
