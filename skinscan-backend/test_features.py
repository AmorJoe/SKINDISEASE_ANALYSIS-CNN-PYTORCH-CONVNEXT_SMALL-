import requests
import json
import os

BASE_URL = 'http://127.0.0.1:8000/api'
EMAIL = 'history_test@example.com'
PASSWORD = 'TestPass123!'

def test_features():
    print(f"--- Testing Features for {EMAIL} ---")
    
    # 1. Register/Login
    reg_resp = requests.post(f"{BASE_URL}/auth/register", json={'email': EMAIL, 'password': PASSWORD})
    login_resp = requests.post(f"{BASE_URL}/auth/login", json={'email': EMAIL, 'password': PASSWORD})
    token = login_resp.json()['data']['token']
    headers = {'Authorization': f'Bearer {token}'}
    print("✅ Authenticated")

    # 2. Test Chatbot
    print("Testing Chatbot...")
    chat_resp = requests.post(f"{BASE_URL}/chat/message", headers=headers, json={'message': 'Hello, what is melanoma?'})
    if chat_resp.status_code == 200:
        print("✅ Chatbot response received")
        print(f"Bot: {chat_resp.json()['data']['bot_message'][:100]}...")
    else:
        print(f"❌ Chatbot failed: {chat_resp.text}")

    # 3. Test Chat History
    history_resp = requests.get(f"{BASE_URL}/chat/history", headers=headers)
    if history_resp.status_code == 200 and history_resp.json()['data']['total_messages'] > 0:
        print(f"✅ Chat history persistent ({history_resp.json()['data']['total_messages']} messages)")
    else:
        print("❌ Chat history verification failed")

    # 4. Test Save Report & History
    print("Testing Scan History...")
    # Simulate a report save
    report_data = {
        'disease_name': 'Eczema',
        'confidence': 85.5,
        'recommendation': 'Use moisturizer',
        'body_location': 'Left Arm',
        'title': 'Test Scan'
    }
    # Mocking a small transparent PNG for the image
    image_content = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n\x2e\xe6\x00\x00\x00\x00IEND\xaeB`\x82'
    files = {'image': ('test.png', image_content, 'image/png')}
    
    save_resp = requests.post(f"{BASE_URL}/predict/save-report", headers=headers, data=report_data, files=files)
    if save_resp.status_code == 200:
        print("✅ Report saved to backend")
    else:
        print(f"❌ Save report failed: {save_resp.text}")

    # 5. Verify Scan History
    scan_history_resp = requests.get(f"{BASE_URL}/predict/scan-history", headers=headers)
    if scan_history_resp.status_code == 200 and len(scan_history_resp.json()['data']['scans']) > 0:
        print(f"✅ Scan history verified ({len(scan_history_resp.json()['data']['scans'])} scans)")
    else:
        print(f"❌ Scan history verification failed: {scan_history_resp.text}")

if __name__ == "__main__":
    test_features()
