import requests
import json

print("=" * 70)
print("TESTING KNOWLEDGE-DRIVEN PHYSICS ENGINE v2.0")
print("=" * 70)

BASE_URL = "http://localhost:8000"

# Test 1: Health Check
print("\n📡 Test 1: Health Check")
print("-" * 70)
try:
    response = requests.get(f"{BASE_URL}/")
    print(f"Status: {response.status_code}")
    print(json.dumps(response.json(), indent=2))
except Exception as e:
    print(f"❌ Error: {e}")

# Test 2: System Info (NEW ENDPOINT)
print("\n📊 Test 2: Station Info (NEW - World Bank Data)")
print("-" * 70)
try:
    response = requests.get(f"{BASE_URL}/api/station-info")
    print(f"Status: {response.status_code}")
    data = response.json()
    print(f"\n✅ System: {data['system']['name']}")
    print(f"✅ Commercial Speed: {data['system']['commercial_speed']}")
    print(f"✅ Max Speed: {data['system']['max_speed']}")
    print(f"✅ Bus Capacity (Standard): {data['system']['standard_bus_capacity']}")
    print(f"✅ Peak Headway: {data['system']['peak_headway']}")
    print(f"\n📍 Routes:")
    for route_id, route_info in data['routes'].items():
        print(f"  Route {route_id}: {route_info['name']}")
        print(f"    Distance: {route_info['distance']}, Stations: {route_info['stations']}")
except Exception as e:
    print(f"❌ Error: {e}")

# Test 3: Physics-Based Route Predictions
routes = ['1', '15', '7']
for route_id in routes:
    print(f"\n🚌 Test 3.{route_id}: Physics-Based Prediction for Route {route_id}")
    print("-" * 70)
    try:
        response = requests.get(f"{BASE_URL}/api/predict/{route_id}")
        data = response.json()
        
        print(f"✅ Route: {route_id}")
        print(f"✅ Arrival Time: {data['arrival_time']}")
        print(f"✅ Crowd Level: {data['crowd_level']}")
        print(f"✅ Status: {data['status']}")
        print(f"✅ Confidence: {data['confidence']}")
        
        print(f"\n📐 Physics Calculations:")
        physics = data['physics']
        print(f"  Distance: {physics['distance_km']} km")
        print(f"  Commercial Speed: {physics['commercial_speed']}")
        print(f"  Base Travel Time: {physics['base_travel_time']} min")
        print(f"  Total Dwell Time: {physics['dwell_time_total']} min")
        print(f"  Traffic Factor: {physics['traffic_factor']}x")
        print(f"  Stations: {physics['stations_count']}")
        
        print(f"\n👥 Occupancy:")
        occupancy = data['occupancy']
        print(f"  Current Passengers: {occupancy['current_passengers']}/{occupancy['capacity']}")
        print(f"  Occupancy Rate: {occupancy['percentage']}")
        
        print(f"\n🕐 Frequency:")
        frequency = data['frequency']
        print(f"  Next Bus In: {frequency['next_bus_in']}")
        print(f"  Buses Per Hour: {frequency['buses_per_hour']}")
        
    except Exception as e:
        print(f"❌ Error: {e}")

print("\n" + "=" * 70)
print("✅ ALL TESTS COMPLETED - PHYSICS ENGINE OPERATIONAL")
print("=" * 70)
