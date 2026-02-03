import urllib.request
import json

url = 'http://localhost:8000/api/calculate-journey'
data = json.dumps({'origin': 'Anjali Cross Road', 'destination': 'Vishwakarma Government Engineering College'}).encode()
req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})

try:
    with urllib.request.urlopen(req) as response:
        result = json.loads(response.read())
        print('SUCCESS - Multi-hop route found!')
        print(f'Route 1: {result.get("route_1")}')
        print(f'Route 2: {result.get("route_2")}')
        print(f'Route 3: {result.get("route_3")}')
        print(f'Transfer 1 at: {result.get("transfer_station_1")}')
        print(f'Transfer 2 at: {result.get("transfer_station_2")}')
        print(f'Total Distance: {result.get("total_distance_km")} km')
        print(f'ETA: {result.get("eta_minutes")} minutes')
except Exception as e:
    print(f'ERROR: {e}')
