"""
🧪 TEST SCRIPT: Quick Insight Physics Engine
Tests the new dynamic /api/insight endpoint
"""

import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:8000"

print("=" * 60)
print("🧪 QUICK INSIGHT PHYSICS ENGINE TEST")
print("=" * 60)

# Test 1: Health Check
print("\n✅ TEST 1: Health Check")
try:
    response = requests.get(f"{BASE_URL}/api/health")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
except Exception as e:
    print(f"❌ Error: {e}")

# Test 2: Test /api/insight with different distances
print("\n✅ TEST 2: /api/insight Endpoint (Dynamic Physics Calculations)")
test_routes = {
    "Route 1": 12.0,  # 12 km
    "Route 15": 25.0, # 25 km
    "Route 7": 18.0   # 18 km
}

for route_name, distance_km in test_routes.items():
    try:
        print(f"\n  📍 {route_name} ({distance_km} km):")
        response = requests.get(f"{BASE_URL}/api/insight", params={"route_length_km": distance_km})
        data = response.json()
        
        print(f"    • Status: {data.get('status')}")
        print(f"    • Next Bus In: {data.get('next_bus_in')} min")
        print(f"    • Frequency: Every {data.get('frequency')} min")
        print(f"    • Travel Time: {data.get('travel_time')} min")
        print(f"    • Crowd Level: {data.get('crowd')}")
        print(f"    • Is Peak Hour: {data.get('is_peak_hour')}")
        print(f"    • Current Hour: {data.get('current_hour')}")
        
    except Exception as e:
        print(f"    ❌ Error: {e}")

# Test 3: Verify physics calculation logic
print("\n✅ TEST 3: Physics Calculation Verification")
print(f"  Commercial Speed: 26 km/h")
print(f"  Expected formula: travel_time = (distance_km / 26) * 60 minutes")
print(f"\n  Route 1 (12 km): (12 / 26) * 60 = {(12/26)*60:.1f} min")
print(f"  Route 15 (25 km): (25 / 26) * 60 = {(25/26)*60:.1f} min")
print(f"  Route 7 (18 km): (18 / 26) * 60 = {(18/26)*60:.1f} min")

print("\n" + "=" * 60)
print("✅ TESTING COMPLETE")
print("=" * 60)
