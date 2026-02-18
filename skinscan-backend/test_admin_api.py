import requests
import sys

BASE_URL = "http://localhost:8000/api"

def test_admin_api(email, password):
    # 1. Login
    print(f"Logging in as {email}...")
    login_url = f"{BASE_URL}/auth/login"
    try:
        response = requests.post(login_url, json={"email": email, "password": password})
    except requests.exceptions.ConnectionError:
        print("Error: Could not connect to server. Is it running?")
        return

    if response.status_code != 200:
        print(f"Login failed: {response.text}")
        return

    token = response.json().get('token')
    print("Login successful. Token received.")

    # 2. Fetch Users
    print("\nFetching Users (Admin)...")
    users_url = f"{BASE_URL}/admin/users/"
    headers = {"Authorization": f"Bearer {token}"}
    
    response = requests.get(users_url, headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        print(f"Success! Status Code: {response.status_code}")
        print(f"Response Structure Keys: {list(data.keys())}")
        if 'data' in data:
            print(f"User Count: {len(data['data'])}")
            print("First User Sample:", data['data'][0] if data['data'] else "No users found")
        else:
            print("WARNING: 'data' key missing in response!")
            print(data)
    else:
        print(f"Failed to fetch users. Status Code: {response.status_code}")
        print(response.text)


# Setup Django to fetch real user
import os
import django
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'skinscan.settings')
django.setup()
from authentication.models import User

def get_admin_creds():
    user = User.objects.filter(is_admin=True).first()
    if user:
        return user.email
    return None

if __name__ == "__main__":
    email = get_admin_creds()
    if not email:
        print("No admin user found in DB!")
    else:
        print(f"Found Admin User: {email}")
        if len(sys.argv) < 2:
             print("Please provide password: python test_admin_api.py <password>")
        else:
             test_admin_api(email, sys.argv[1])
