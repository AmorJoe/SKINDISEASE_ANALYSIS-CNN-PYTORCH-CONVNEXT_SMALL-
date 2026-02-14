"""
Test script to verify the scan-history API endpoint
"""
import requests
import json

# API Configuration
API_BASE_URL = 'http://127.0.0.1:8000/api'

def test_scan_history_endpoint():
    """Test the scan-history endpoint without authentication"""
    print("Testing scan-history endpoint...")
    print(f"URL: {API_BASE_URL}/predict/scan-history")
    
    try:
        response = requests.get(
            f"{API_BASE_URL}/predict/scan-history",
            headers={'Content-Type': 'application/json'}
        )
        
        print(f"\nStatus Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        print(f"\nResponse Body:")
        print(json.dumps(response.json(), indent=2))
        
        if response.status_code == 401:
            print("\n✓ Endpoint is working! (401 Unauthorized - expected without token)")
        elif response.status_code == 200:
            print("\n✓ Endpoint is working! (200 OK)")
        else:
            print(f"\n⚠ Unexpected status code: {response.status_code}")
            
    except requests.exceptions.ConnectionError:
        print("\n✗ Error: Could not connect to server. Is it running?")
    except Exception as e:
        print(f"\n✗ Error: {str(e)}")

if __name__ == "__main__":
    test_scan_history_endpoint()
