"""
Test Backend Connection
Run this to verify backend is working correctly
"""
import requests
import json

API_BASE = 'http://localhost:8000/api'

print("=" * 60)
print("TESTING SKINSCAN BACKEND CONNECTION")
print("=" * 60)

# Test 1: Check if server is running
print("\n[1] Testing if backend server is running...")
try:
    response = requests.get('http://localhost:8000/', timeout=5)
    print(f"✓ Server is running! Status: {response.status_code}")
except requests.exceptions.ConnectionError:
    print("✗ ERROR: Cannot connect to backend on port 8000")
    print("  Make sure 'python manage.py runserver 8000' is running")
    exit(1)
except Exception as e:
    print(f"✗ ERROR: {e}")
    exit(1)

# Test 2: Test login endpoint
print("\n[2] Testing login endpoint...")
try:
    response = requests.post(
        f'{API_BASE}/auth/login',
        json={
            'email': 'test@skinscan.com',
            'password': 'test123'
        },
        headers={'Content-Type': 'application/json'},
        timeout=5
    )
    
    print(f"   Status Code: {response.status_code}")
    data = response.json()
    print(f"   Response: {json.dumps(data, indent=2)}")
    
    if data.get('status') == 'success':
        print("✓ Login successful!")
        print(f"   Token: {data['data']['token'][:50]}...")
    else:
        print(f"✗ Login failed: {data.get('message')}")
        if response.status_code == 401:
            print("\n   User might not exist. Create test user:")
            print("   python manage.py shell")
            print("   >>> from authentication.models import User")
            print("   >>> user = User.objects.create(full_name='Test User', email='test@skinscan.com', account_status='ACTIVE')")
            print("   >>> user.set_password('test123')")
            print("   >>> user.save()")
            
except requests.exceptions.ConnectionError:
    print("✗ ERROR: Cannot reach login endpoint")
    print("  Check if authentication app is configured correctly")
except Exception as e:
    print(f"✗ ERROR: {e}")

# Test 3: Test CORS headers
print("\n[3] Testing CORS headers...")
try:
    response = requests.options(
        f'{API_BASE}/auth/login',
        headers={
            'Origin': 'http://localhost:5500',
            'Access-Control-Request-Method': 'POST'
        },
        timeout=5
    )
    
    cors_header = response.headers.get('Access-Control-Allow-Origin')
    if cors_header:
        print(f"✓ CORS enabled: {cors_header}")
    else:
        print("✗ WARNING: CORS headers not found")
        print("  This might cause issues with frontend connection")
        
except Exception as e:
    print(f"✗ ERROR: {e}")

print("\n" + "=" * 60)
print("SUMMARY")
print("=" * 60)
print("\nIf all tests passed:")
print("1. Access frontend via: http://localhost:8000/login.html")
print("2. Use credentials: test@skinscan.com / test123")
print("\nIf login failed:")
print("- Create test user using the commands shown above")
print("\nIf CORS warning:")
print("- Make sure DEBUG=True in .env file")
print("=" * 60)
