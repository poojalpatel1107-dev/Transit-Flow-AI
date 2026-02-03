import requests
import json

print("=" * 50)
print("Testing Transit Flow AI Backend")
print("=" * 50)

# Test health endpoint
print("\n1. Testing Health Check...")
try:
    response = requests.get("http://localhost:8000/api/health")
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
except Exception as e:
    print(f"Error: {e}")

# Test prediction endpoints
routes = ['1', '15', '7']
for route_id in routes:
    print(f"\n2. Testing Route {route_id} Prediction...")
    try:
        response = requests.get(f"http://localhost:8000/api/predict/{route_id}")
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    except Exception as e:
        print(f"Error: {e}")

print("\n" + "=" * 50)
print("All tests completed!")
print("=" * 50)
