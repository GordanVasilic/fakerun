import requests
import json
from datetime import datetime

# Base URL for the API
BASE_URL = "http://localhost:8000/api"

def test_endpoint(method, endpoint, data=None, headers=None, description=""):
    """Test an API endpoint and return the result"""
    url = f"{BASE_URL}{endpoint}"
    print(f"\n{'='*60}")
    print(f"Testing: {method} {endpoint}")
    print(f"Description: {description}")
    print(f"URL: {url}")
    
    try:
        if method == "GET":
            response = requests.get(url, headers=headers)
        elif method == "POST":
            response = requests.post(url, json=data, headers=headers)
        elif method == "PUT":
            response = requests.put(url, json=data, headers=headers)
        elif method == "DELETE":
            response = requests.delete(url, headers=headers)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        
        try:
            response_json = response.json()
            print(f"Response Body: {json.dumps(response_json, indent=2)}")
        except:
            print(f"Response Body (text): {response.text}")
            
        return response
        
    except requests.exceptions.ConnectionError:
        print("❌ ERROR: Could not connect to server. Is it running?")
        return None
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        return None

def main():
    print("🚀 Starting API Test Suite")
    print(f"Testing server at: {BASE_URL}")
    
    # Test 1: Basic endpoints that should work
    print("\n" + "="*80)
    print("SECTION 1: BASIC ENDPOINTS (Should work)")
    print("="*80)
    
    test_endpoint("GET", "/", description="Root endpoint")
    test_endpoint("GET", "/status", description="Get status checks")
    test_endpoint("POST", "/status", 
                 data={"client_name": "test_client"}, 
                 description="Create status check")
    
    # Test 2: Authentication endpoints (currently missing)
    print("\n" + "="*80)
    print("SECTION 2: AUTHENTICATION ENDPOINTS (Currently missing)")
    print("="*80)
    
    # Test registration
    test_data = {
        "email": "test@example.com",
        "username": "testuser",
        "password": "testpassword123"
    }
    response = test_endpoint("POST", "/auth/register", 
                           data=test_data, 
                           description="User registration")
    
    # Test login
    login_data = {
        "email": "test@example.com",
        "password": "testpassword123"
    }
    login_response = test_endpoint("POST", "/auth/login", 
                                 data=login_data, 
                                 description="User login")
    
    # Extract token if login was successful
    token = None
    if login_response and login_response.status_code == 200:
        try:
            token_data = login_response.json()
            token = token_data.get('access_token')
            print(f"✅ Token extracted: {token[:20]}..." if token else "❌ No token in response")
        except:
            print("❌ Could not extract token from response")
    
    # Test protected endpoints
    headers = {"Authorization": f"Bearer {token}"} if token else None
    
    test_endpoint("GET", "/auth/me", 
                 headers=headers, 
                 description="Get current user info")
    
    # Test 3: Route endpoints (should require authentication)
    print("\n" + "="*80)
    print("SECTION 3: ROUTE ENDPOINTS (Should require authentication)")
    print("="*80)
    
    test_endpoint("GET", "/routes", 
                 headers=headers, 
                 description="Get saved routes")
    
    route_data = {
        "name": "Test Route",
        "route": [[40.7128, -74.0060], [40.7589, -73.9851]],
        "runDetails": {
            "name": "Test Run",
            "date": "2024-01-15",
            "startTime": "08:00",
            "description": "Test run description",
            "avgPace": 5.5,
            "distance": 5.0,
            "duration": 1800,
            "elevationGain": 50,
            "activityType": "run"
        }
    }
    
    test_endpoint("POST", "/routes", 
                 data=route_data, 
                 headers=headers, 
                 description="Save a route")
    
    # Test 4: GPX generation (should work)
    print("\n" + "="*80)
    print("SECTION 4: GPX GENERATION (Should work)")
    print("="*80)
    
    gpx_data = {
        "route": [[40.7128, -74.0060], [40.7589, -73.9851]],
        "runDetails": {
            "name": "Test GPX Run",
            "date": "2024-01-15",
            "startTime": "08:00",
            "description": "Test GPX generation",
            "avgPace": 5.5,
            "distance": 5.0,
            "duration": 1800,
            "elevationGain": 50,
            "activityType": "run"
        }
    }
    
    test_endpoint("POST", "/generate-gpx", 
                 data=gpx_data, 
                 description="Generate GPX file")
    
    # Test 5: Check FastAPI docs
    print("\n" + "="*80)
    print("SECTION 5: FASTAPI DOCUMENTATION")
    print("="*80)
    
    print("\n📖 FastAPI Documentation URLs:")
    print(f"   Swagger UI: http://localhost:8000/docs")
    print(f"   ReDoc: http://localhost:8000/redoc")
    print(f"   OpenAPI JSON: http://localhost:8000/openapi.json")
    
    # Test the OpenAPI spec
    try:
        response = requests.get("http://localhost:8000/openapi.json")
        if response.status_code == 200:
            openapi_spec = response.json()
            paths = openapi_spec.get('paths', {})
            print(f"\n📋 Available endpoints in OpenAPI spec:")
            for path, methods in paths.items():
                for method in methods.keys():
                    print(f"   {method.upper()} {path}")
        else:
            print(f"❌ Could not fetch OpenAPI spec: {response.status_code}")
    except Exception as e:
        print(f"❌ Error fetching OpenAPI spec: {str(e)}")
    
    print("\n" + "="*80)
    print("🏁 TEST SUITE COMPLETED")
    print("="*80)
    print("\n💡 Analysis:")
    print("   - If auth endpoints return 404: Routes not registered")
    print("   - If auth endpoints return 422: Routes exist but validation failed")
    print("   - If auth endpoints return 500: Server error in route logic")
    print("   - Check the OpenAPI spec above to see which routes are actually registered")

if __name__ == "__main__":
    main()