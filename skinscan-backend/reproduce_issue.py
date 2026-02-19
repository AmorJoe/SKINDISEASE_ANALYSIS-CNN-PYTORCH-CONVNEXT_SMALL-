import requests
import json

BASE_URL = 'http://localhost:8000/api/auth'

def test_profile_update():
    # 1. Login to get token
    import random
    import string
    
    email = "testuser@example.com"
    password = "Password123!"
    
    print(f"Attempting login for {email}...")
    login_response = requests.post(f"{BASE_URL}/login", json={
        "email": email, 
        "password": password
    })
    
    token = None
    if login_response.status_code == 200:
        token = login_response.json()['data']['token']
    else:
        print(f"Login failed: {login_response.status_code}")
        
        # Register randomized user
        rand_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))
        email = f"user{rand_suffix}@example.com"
        print(f"Registering new user {email}...")
        
        reg_response = requests.post(f"{BASE_URL}/register", json={
            "email": email,
            "password": password
        })
        
        if reg_response.status_code == 201:
            token = reg_response.json()['data']['token']
        else:
            print(f"Registration failed: {reg_response.status_code} {reg_response.text}")
            return
        
    print(f"Token obtained. Testing Profile Update...")
    
    # 2. Update Profile
    headers = {
        'Authorization': f'Bearer {token}'
    }
    # Simulate FormData by not setting Content-Type (requests does this with 'files' or 'data')
    # But for text fields, 'data' is form-encoded. Frontend uses FormData.
    data = {
        'first_name': 'UpdatedName',
        'skin_type': 'Oily',
        'date_of_birth': ''  # Simulate empty string input from HTML date field
    }
    
    # Simulate Multipart/Form-Data which the frontend uses
    # To force multipart in requests, we can provide a dummy file or just format properly
    # Using 'files' guarantees multipart
    
    files = {
        'avatar': (None, '') # Empty file field if not uploading
    }
    
    try:
        # Pass data and files to force multipart
        response = requests.put(f"{BASE_URL}/profile", headers=headers, data=data, files=files) 
        
        print(f"Status Code: {response.status_code}")
        print(f"Response URL: {response.url}") # Check for redirects
        if response.history:
            print(f"Redirect History: {[r.url for r in response.history]}")
        print(f"Response Body: {response.text}")
        
    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    test_profile_update()
