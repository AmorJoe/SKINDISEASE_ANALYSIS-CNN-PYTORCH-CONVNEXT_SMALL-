import requests
import json
import os

BASE_URL = 'http://127.0.0.1:8000/api'
EMAIL = 'update_test@example.com'
PASSWORD = 'TestPass123!'

def test_profile_update():
    # 1. Register/Login
    print(f"Authenticating as {EMAIL}...")
    try:
        # Try register
        reg_resp = requests.post(f"{BASE_URL}/auth/register", json={
            'email': EMAIL, 
            'password': PASSWORD
        })
    except Exception as e:
        print(f"Registration request failed: {e}")

    # Login to get token
    login_resp = requests.post(f"{BASE_URL}/auth/login", json={
        'email': EMAIL, 
        'password': PASSWORD
    })
    
    if login_resp.status_code != 200:
        print(f"❌ Login failed: {login_resp.text}")
        return

    token = login_resp.json()['data']['token']
    print("✅ Login successful, token received")

    # 2. Update Profile (Multipart)
    print("Updating profile...")
    headers = {'Authorization': f'Bearer {token}'}
    
    # Data to update
    data = {
        'first_name': 'UpdatedName',
        'last_name': 'UpdatedLast',
        'phone': '1234567890',
        'country': 'TestCountry',
        'skin_type': 'Oily',
        'skin_tone': 'Type III'
    }
    
    # Simulating file upload (optional, but good to test parser)
    # files = {'avatar': ('test.jpg', b'fakecontent', 'image/jpeg')} 
    # For now just data to test FormParser
    
    resp = requests.put(f"{BASE_URL}/auth/profile", headers=headers, data=data)
    
    if resp.status_code == 200:
        print("✅ Profile update successful!")
        print(json.dumps(resp.json(), indent=2))
    else:
        print(f"❌ Profile update failed: {resp.status_code}")
        print(resp.text)

if __name__ == "__main__":
    test_profile_update()
