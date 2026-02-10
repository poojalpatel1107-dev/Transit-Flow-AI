from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import random
from math import radians, sin, cos, sqrt, atan2
import os
import json
import socket
import time
import re
from urllib import request as urllib_request
from urllib.error import URLError
from janmarg_data import (
    COMMERCIAL_SPEED_KMH,
    MAX_SPEED_KMH,
    DWELL_TIME_SEC,
    ROUTE_DISTANCES,
    ROUTE_STATIONS,
    SYSTEM_INFO,
    ROUTE_1_STOPS,
    ROUTE_7_STOPS,
    ROUTE_15_STOPS,
    ROUTE_4_STOPS,
    AVG_DIST_BETWEEN_STOPS_KM,
    is_peak_hour,
    get_traffic_factor,
    get_occupancy_level,
    get_headway,
    ROUTE_1_FULL_TRACE,
    ROUTE_1_INDICES,
    ROUTE_15_FULL_TRACE,
    ROUTE_15_INDICES,
    ROUTE_7_FULL_TRACE,
    ROUTE_7_INDICES,
    ROUTE_4_FULL_TRACE,
    ROUTE_4_INDICES,
    FARE_BASE_INR,
    FARE_PER_KM_INR
)
from janmarg_config import (
    is_peak_hour as is_peak_hour_config,
    get_headway as get_headway_config,
    get_traffic_factor as get_traffic_factor_config,
    get_crowd_level
)
from ai_agent import transit_ai
from ai_engine import JanmargBrain
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title="Transit Flow AI Backend",
    description="Knowledge-driven AI engine for Janmarg BRTS predictions",
    version="2.0.0"
)

janmarg_brain = JanmargBrain()

# Enable CORS for all origins (allows React frontend to communicate)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    """Health check endpoint"""
    return {
        "status": "Transit Flow AI Backend is running",
        "version": "2.0.0 - Knowledge-Driven Physics Engine",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/predict/{route_id}")
def predict_route(route_id: str):
    """
    Physics-based route prediction using official operational parameters
    
    Args:
        route_id: Route identifier ('1', '15', '7', or '4')
    
    Returns:
        JSON object with physics-calculated arrival_time, crowd_level, status, confidence
    """
    # Validate route
    if route_id not in ROUTE_DISTANCES:
        raise HTTPException(status_code=404, detail=f"Route {route_id} not found")
    
    # Get current real-time hour
    current_hour = datetime.now().hour
    
    # ========== PHYSICS-BASED CALCULATION ==========
    # Get route distance from knowledge base
    distance_km = ROUTE_DISTANCES[route_id]
    num_stations = ROUTE_STATIONS[route_id]
    
    # Calculate base travel time using commercial speed
    # Formula: Time = Distance / Speed
    travel_time_hours = distance_km / COMMERCIAL_SPEED_KMH
    travel_time_minutes = travel_time_hours * 60
    
    # Add dwell time for all stations (convert seconds to minutes)
    total_dwell_minutes = (num_stations * DWELL_TIME_SEC) / 60
    
    # Apply traffic congestion factor based on time of day
    traffic_factor = get_traffic_factor(current_hour)
    
    # Add random real-time variation (±10% for unpredictable events)
    random_factor = random.uniform(0.9, 1.1)
    
    # Calculate final arrival time
    arrival_time = (travel_time_minutes + total_dwell_minutes) * traffic_factor * random_factor
    arrival_minutes = int(round(arrival_time))
    
    # ========== CROWD PREDICTION ==========
    crowd_level, occupancy_ratio = get_occupancy_level(current_hour)
    
    # Calculate actual passenger count
    bus_capacity = 80  # Standard bus
    current_passengers = int(bus_capacity * occupancy_ratio)
    
    # Determine status based on crowd level
    if "CRITICAL" in crowd_level:
        status = "Heavy Traffic - High Demand"
    elif crowd_level == "Moderate":
        status = "Normal Flow"
    else:
        status = "Light Traffic - Low Demand"
    
    # ========== CONFIDENCE CALCULATION ==========
    # Higher confidence during peak hours (more predictable patterns)
    if is_peak_hour(current_hour):
        confidence = random.randint(88, 96)
    else:
        confidence = random.randint(75, 88)
    
    # Get next bus frequency
    headway = get_headway(current_hour)
    
    # Return physics-based prediction
    return {
        "route_id": route_id,
        "arrival_time": f"{arrival_minutes} min",
        "crowd_level": crowd_level,
        "status": status,
        "confidence": f"{confidence}%",
        "timestamp": datetime.now().isoformat(),
        "current_hour": current_hour,
        # Additional physics data
        "physics": {
            "distance_km": distance_km,
            "commercial_speed": f"{COMMERCIAL_SPEED_KMH} km/h",
            "base_travel_time": round(travel_time_minutes, 1),
            "dwell_time_total": round(total_dwell_minutes, 1),
            "traffic_factor": traffic_factor,
            "stations_count": num_stations
        },
        "occupancy": {
            "current_passengers": current_passengers,
            "capacity": bus_capacity,
            "percentage": f"{int(occupancy_ratio * 100)}%"
        },
        "frequency": {
            "next_bus_in": f"{headway} min",
            "buses_per_hour": int(60 / headway)
        }
    }

@app.get("/api/station-info")
def get_station_info():
    """
    Get official Janmarg BRTS system information
    
    Returns:
        JSON object with system specifications and operational parameters
    """
    return {
        "system": SYSTEM_INFO,
        "routes": {
            "1": {
                "name": "Shivranjani → ISKCON",
                "distance": f"{ROUTE_DISTANCES['1']} km",
                "stations": ROUTE_STATIONS['1'],
                "color": "Red"
            },
            "15": {
                "name": "ISKCON → Airport",
                "distance": f"{ROUTE_DISTANCES['15']} km",
                "stations": ROUTE_STATIONS['15'],
                "color": "Blue"
            },
            "7": {
                "name": "Ranip → Engineering College",
                "distance": f"{ROUTE_DISTANCES['7']} km",
                "stations": ROUTE_STATIONS['7'],
                "color": "Purple"
            }
        },
        "current_time": datetime.now().isoformat(),
        "is_peak_hour": is_peak_hour(datetime.now().hour)
    }

@app.get("/api/health")
def health_check():
    """Health check endpoint for monitoring"""
    return {
        "status": "healthy",
        "service": "Transit Flow AI Agent",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/insight")
def get_insight(
    route_length_km: float = None,
    route_id: str = None,
    origin_station_name: str = None
):
    """
    Origin-Based ETA Prediction endpoint
    
    Returns when the bus arrives at a specific station, not just the start of the route.
    
    Args:
        route_length_km: Distance of the entire route (optional, for backwards compatibility)
        route_id: Route identifier ('1', '15', '7', or '4')
        origin_station_name: Name of the station where user wants to board
    
    Returns:
        JSON object with origin-based ETA, status, crowd, frequency
    """
    current_hour = datetime.now().hour
    current_minute = datetime.now().minute
    
    # Determine if we're in peak hours
    is_peak = is_peak_hour_config(current_hour)
    
    # Get headway (minutes between buses)
    frequency = get_headway_config(current_hour)
    
    # Initialize response
    response = {
        "current_hour": current_hour,
        "current_minute": current_minute,
        "is_peak_hour": is_peak,
        "frequency": frequency,
        "timestamp": datetime.now().isoformat()
    }
    
    # === ORIGIN-BASED ETA LOGIC ===
    if origin_station_name and route_id:
        # Map route IDs to station sequences
        route_stops_map = {
            '1': ROUTE_1_STOPS,
            '7': ROUTE_7_STOPS,
            '15': ROUTE_15_STOPS,
            '4': ROUTE_4_STOPS
        }
        
        route_stops = route_stops_map.get(route_id)
        
        if not route_stops:
            raise HTTPException(status_code=404, detail=f"Route {route_id} not found")
        
        # Find the origin station index
        origin_index = None
        for idx, stop in enumerate(route_stops):
            if stop.lower() == origin_station_name.lower():
                origin_index = idx
                break
        
        if origin_index is None:
            raise HTTPException(
                status_code=404,
                detail=f"Station '{origin_station_name}' not found on Route {route_id}"
            )
        
        # === CALCULATE DISTANCE FROM DEPOT TO ORIGIN ===
        distance_from_start = origin_index * AVG_DIST_BETWEEN_STOPS_KM
        
        # === CALCULATE TRAVEL TIME TO ORIGIN ===
        time_to_station = (distance_from_start / COMMERCIAL_SPEED_KMH) * 60  # in minutes
        
        # === LIVE ADJUSTMENT: Calculate wait time ===
        # The bus leaves the depot every HEADWAY minutes
        # Calculate the next arrival slot relative to time_to_station
        current_total_minutes = current_hour * 60 + current_minute
        
        # Find when the next bus arrives at this station
        # Formula: wait_time = (HEADWAY - (current_minute % HEADWAY))
        wait_at_depot = (frequency - (current_minute % frequency)) if (current_minute % frequency) != 0 else 0
        
        # ETA to origin = time from depot to station + wait for next bus
        eta_to_origin = round(wait_at_depot + time_to_station, 1)
        
        response.update({
            "route_id": route_id,
            "origin_station": origin_station_name,
            "origin_index": origin_index,
            "distance_from_start_km": round(distance_from_start, 1),
            "travel_time_to_station": round(time_to_station, 1),
            "wait_for_next_bus": round(wait_at_depot, 1),
            "eta": eta_to_origin,
            "status": "Incoming from Depot",
            "message": f"Next bus arriving at {origin_station_name} in {eta_to_origin} minutes"
        })
    
    # === FALLBACK: Route-based calculation (for backwards compatibility) ===
    elif route_length_km:
        # Calculate travel time for entire route
        travel_time_minutes = (route_length_km / COMMERCIAL_SPEED_KMH) * 60
        
        # Predict next bus arrival
        next_bus_in = round(random.uniform(0.3, frequency), 1)
        
        # Get crowd level
        crowd_level, occupancy_ratio = get_crowd_level(current_hour)
        
        # Determine status
        if is_peak:
            status = "Peak Hour - Heavy Demand"
        elif 12 <= current_hour < 17:
            status = "Moderate Traffic"
        else:
            status = "Light Traffic"
        
        response.update({
            "status": status,
            "travel_time": round(travel_time_minutes, 1),
            "next_bus_in": next_bus_in,
            "crowd": crowd_level,
            "occupancy_ratio": occupancy_ratio
        })
    
    else:
        # No valid parameters provided
        raise HTTPException(
            status_code=400,
            detail="Provide either (route_id + origin_station_name) or route_length_km"
        )
    
    return response

@app.post("/api/calculate-journey")
def calculate_journey(request_data: dict):
    """
    Calculate exact journey path from origin to destination.
    Handles both single-route and multi-route (transfer) journeys.
    
    Request:
    {
        "origin": "Anjali Cross Road",
        "destination": "Shivranjani"
    }
    
    Response (Single Route):
    {
        "path": [[lat, lng], ...],
        "route_id": "1",
        "direction": "Onward (↓)",
        ...
    }
    
    Response (Multi-Route Transfer):
    {
        "path": [[lat, lng], ...],  # Concatenated segments
        "route_1": "1D",
        "route_2": "15D",
        "transfer_station": "Jodhpur Char Rasta",
        ...
    }
    """
    origin = request_data.get("origin", "").strip()
    destination = request_data.get("destination", "").strip()
    
    if not origin or not destination:
        raise HTTPException(status_code=400, detail="Missing origin or destination")
    
    # Define route mappings
    routes_map = {
        '1': {
            'stops': ROUTE_1_STOPS,
            'trace': ROUTE_1_FULL_TRACE,
            'indices': ROUTE_1_INDICES
        },
        '15': {
            'stops': ROUTE_15_STOPS,
            'trace': ROUTE_15_FULL_TRACE,
            'indices': ROUTE_15_INDICES
        },
        '7': {
            'stops': ROUTE_7_STOPS,
            'trace': ROUTE_7_FULL_TRACE,
            'indices': ROUTE_7_INDICES
        },
        '4': {
            'stops': ROUTE_4_STOPS,
            'trace': ROUTE_4_FULL_TRACE,
            'indices': ROUTE_4_INDICES
        }
    }
    
    # ========== STEP 1: Find direct route ==========
    for route_id, route_data in routes_map.items():
        stops = route_data['stops']
        origin_idx = next((i for i, s in enumerate(stops) if s.lower() == origin.lower()), -1)
        dest_idx = next((i for i, s in enumerate(stops) if s.lower() == destination.lower()), -1)
        
        if origin_idx != -1 and dest_idx != -1:
            # Direct route found
            return _calculate_direct_path(route_id, origin_idx, dest_idx, origin, destination, routes_map)
    
    # ========== STEP 2: Find transfer route ==========
    transfer_result = _find_transfer_route(origin, destination, routes_map)
    if transfer_result:
        return transfer_result
    
    # No route found
    raise HTTPException(status_code=404, detail=f"No route found between {origin} and {destination}")


def _haversine_km(a, b):
    """Great-circle distance between two [lat, lng] points in km."""
    lat1, lon1 = a
    lat2, lon2 = b
    r = 6371.0
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    lat1 = radians(lat1)
    lat2 = radians(lat2)

    h = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
    return 2 * r * atan2(sqrt(h), sqrt(1 - h))


def _path_distance_km(path):
    if not path or len(path) < 2:
        return 0.0
    return sum(_haversine_km(path[i], path[i + 1]) for i in range(len(path) - 1))


def _point_to_segment_distance_km(point, a, b):
    lat1, lon1 = point
    lat2, lon2 = a
    lat3, lon3 = b

    lat1r = radians(lat1)
    lat2r = radians(lat2)
    lat3r = radians(lat3)

    x1 = lon1 * cos(lat1r)
    y1 = lat1
    x2 = lon2 * cos(lat2r)
    y2 = lat2
    x3 = lon3 * cos(lat3r)
    y3 = lat3

    dx = x3 - x2
    dy = y3 - y2
    if dx == 0 and dy == 0:
        return _haversine_km(point, a)

    t = ((x1 - x2) * dx + (y1 - y2) * dy) / (dx * dx + dy * dy)
    t = max(0.0, min(1.0, t))
    proj = [y2 + t * dy, (x2 + t * dx) / cos(radians(y2 + t * dy))]
    return _haversine_km(point, proj)


def _path_mean_deviation_km(path, corridor):
    if not path or not corridor or len(corridor) < 2:
        return 0.0
    total = 0.0
    for point in path:
        best = None
        for i in range(len(corridor) - 1):
            d = _point_to_segment_distance_km(point, corridor[i], corridor[i + 1])
            if best is None or d < best:
                best = d
        total += best if best is not None else 0.0
    return total / max(1, len(path))


def _decode_polyline(polyline_str, precision=6):
    coords = []
    index = 0
    lat = 0
    lng = 0
    factor = 10 ** precision
    length = len(polyline_str)

    while index < length:
        shift = 0
        result = 0
        while True:
            if index >= length:
                return coords
            b = ord(polyline_str[index]) - 63
            index += 1
            result |= (b & 0x1f) << shift
            shift += 5
            if b < 0x20:
                break
        delta_lat = ~(result >> 1) if (result & 1) else (result >> 1)
        lat += delta_lat

        shift = 0
        result = 0
        while True:
            if index >= length:
                return coords
            b = ord(polyline_str[index]) - 63
            index += 1
            result |= (b & 0x1f) << shift
            shift += 5
            if b < 0x20:
                break
        delta_lng = ~(result >> 1) if (result & 1) else (result >> 1)
        lng += delta_lng

        coords.append([lat / factor, lng / factor])

    return coords


VALHALLA_URL = os.getenv("VALHALLA_URL", "https://valhalla1.openstreetmap.de/route").strip()
VALHALLA_TRACE_URL = os.getenv("VALHALLA_TRACE_URL", "https://valhalla1.openstreetmap.de/trace_route").strip()
USE_VALHALLA = os.getenv("USE_VALHALLA", "true").strip().lower() not in ("0", "false", "no", "off")

SEGMENT_CACHE_TTL_SEC = int(os.getenv("SEGMENT_CACHE_TTL_SEC", "900"))
SEGMENT_CACHE_MAX = int(os.getenv("SEGMENT_CACHE_MAX", "128"))
_SEGMENT_CACHE = {}


def _cache_get_segment(key):
    entry = _SEGMENT_CACHE.get(key)
    if not entry:
        return None
    if (time.time() - entry["ts"]) > SEGMENT_CACHE_TTL_SEC:
        _SEGMENT_CACHE.pop(key, None)
        return None
    return entry["value"]


def _cache_set_segment(key, value):
    if len(_SEGMENT_CACHE) >= SEGMENT_CACHE_MAX:
        oldest_key = min(_SEGMENT_CACHE.items(), key=lambda item: item[1]["ts"])[0]
        _SEGMENT_CACHE.pop(oldest_key, None)
    _SEGMENT_CACHE[key] = {"value": value, "ts": time.time()}


def _downsample_path(path, max_points=600):
    if not path or len(path) <= max_points:
        return path
    step = max(1, len(path) // max_points)
    sampled = path[::step]
    if sampled[-1] != path[-1]:
        sampled.append(path[-1])
    return sampled


def _densify_path(path, max_segment_meters=120):
    if not path or len(path) < 2:
        return path
    densified = [path[0]]
    for i in range(1, len(path)):
        start = path[i - 1]
        end = path[i]
        dist_m = _haversine_km(start, end) * 1000
        if dist_m > max_segment_meters:
            steps = int(dist_m // max_segment_meters)
            for step in range(1, steps + 1):
                t = step / (steps + 1)
                densified.append([
                    start[0] + (end[0] - start[0]) * t,
                    start[1] + (end[1] - start[1]) * t
                ])
        densified.append(end)
    return densified


def _valhalla_trace(path):
    if not VALHALLA_TRACE_URL or not path or len(path) < 2:
        return None

    guide_path = _densify_path(path)
    shape = [
        {"lat": coord[0], "lon": coord[1]}
        for coord in _downsample_path(guide_path)
    ]

    base_payload = {
        "shape": shape,
        "trace_options": {
            "search_radius": 45,
            "gps_accuracy": 8.0
        },
        "shape_format": "geojson",
        "directions_options": {"units": "kilometers"}
    }

    try:
        for shape_match in ("map_snap", "edge_walk"):
            for costing, costing_options in (
                ("bus", {"bus": {"use_bus": 1.0, "use_roads": 1.0, "use_highways": 0.2}}),
                ("auto", None)
            ):
                payload = {
                    **base_payload,
                    "shape_match": shape_match,
                    "costing": costing
                }
                if costing_options:
                    payload["costing_options"] = costing_options

                data = json.dumps(payload).encode("utf-8")
                req = urllib_request.Request(
                    VALHALLA_TRACE_URL,
                    data=data,
                    headers={"Content-Type": "application/json"}
                )
                with urllib_request.urlopen(req, timeout=6) as resp:
                    result = json.loads(resp.read().decode("utf-8"))

                leg = result.get("trip", {}).get("legs", [])[0]
                shape_data = leg.get("shape", {})
                coords = []
                if isinstance(shape_data, dict):
                    coords = shape_data.get("coordinates", [])
                    if coords:
                        traced_path = [[lat, lon] for lon, lat in coords]
                    else:
                        traced_path = []
                elif isinstance(shape_data, str):
                    coords = _decode_polyline(shape_data, precision=6)
                    if not coords:
                        coords = _decode_polyline(shape_data, precision=5)
                    traced_path = coords
                else:
                    traced_path = []

                if not traced_path:
                    continue

                summary = leg.get("summary", {})
                distance_km = round(summary.get("length", _path_distance_km(traced_path)), 2)
                eta_minutes = int(round(summary.get("time", 0) / 60))

                return {
                    "path": traced_path,
                    "distance_km": distance_km,
                    "eta_minutes": eta_minutes
                }
    except (URLError, TimeoutError, socket.timeout, KeyError, IndexError, ValueError, AttributeError):
        return None


def _is_trace_acceptable(traced_path, corridor_path, max_mean_deviation_km=0.25):
    if not traced_path or not corridor_path:
        return False
    deviation_km = _path_mean_deviation_km(traced_path, corridor_path)
    if deviation_km > max_mean_deviation_km:
        return False

    start_dist = _haversine_km(traced_path[0], corridor_path[0])
    end_dist = _haversine_km(traced_path[-1], corridor_path[-1])
    if start_dist > 0.45 or end_dist > 0.45:
        return False

    base_len = _path_distance_km(corridor_path)
    trace_len = _path_distance_km(traced_path)
    if base_len > 0:
        ratio = trace_len / base_len
        if ratio < 0.75 or ratio > 1.45:
            return False

    return True


def _valhalla_route(start_coord, end_coord):
    if not VALHALLA_URL:
        return None

    base_payload = {
        "locations": [
            {"lat": start_coord[0], "lon": start_coord[1]},
            {"lat": end_coord[0], "lon": end_coord[1]}
        ],
        "shape_format": "geojson",
        "directions_options": {"units": "kilometers"}
    }

    for costing in ("bus", "auto"):
        payload = {**base_payload, "costing": costing}
        try:
            data = json.dumps(payload).encode("utf-8")
            req = urllib_request.Request(
                VALHALLA_URL,
                data=data,
                headers={"Content-Type": "application/json"}
            )
            with urllib_request.urlopen(req, timeout=6) as resp:
                result = json.loads(resp.read().decode("utf-8"))

            leg = result.get("trip", {}).get("legs", [])[0]
            shape = leg.get("shape", {})
            coords = []
            if isinstance(shape, dict):
                coords = shape.get("coordinates", [])
                if coords:
                    # Valhalla returns [lon, lat]
                    path = [[lat, lon] for lon, lat in coords]
                else:
                    path = []
            elif isinstance(shape, str):
                coords = _decode_polyline(shape, precision=6)
                if not coords:
                    coords = _decode_polyline(shape, precision=5)
                path = coords
            else:
                path = []

            if not path:
                continue
            summary = leg.get("summary", {})
            distance_km = round(summary.get("length", _path_distance_km(path)), 2)
            eta_minutes = int(round(summary.get("time", 0) / 60))

            return {
                "path": path,
                "distance_km": distance_km,
                "eta_minutes": eta_minutes
            }
        except (URLError, KeyError, IndexError, ValueError, AttributeError):
            continue

    return None


def _valhalla_route_via(path, max_points=16):
    if not VALHALLA_URL or not path or len(path) < 2:
        return None

    sampled = _downsample_path(path, max_points=max_points)
    if len(sampled) < 2:
        return None

    locations = []
    for idx, coord in enumerate(sampled):
        loc_type = "break" if idx in (0, len(sampled) - 1) else "through"
        locations.append({"lat": coord[0], "lon": coord[1], "type": loc_type})

    base_payload = {
        "locations": locations,
        "shape_format": "geojson",
        "directions_options": {"units": "kilometers"}
    }

    for costing in ("bus", "auto"):
        payload = {**base_payload, "costing": costing}
        try:
            data = json.dumps(payload).encode("utf-8")
            req = urllib_request.Request(
                VALHALLA_URL,
                data=data,
                headers={"Content-Type": "application/json"}
            )
            with urllib_request.urlopen(req, timeout=6) as resp:
                result = json.loads(resp.read().decode("utf-8"))

            leg = result.get("trip", {}).get("legs", [])[0]
            shape = leg.get("shape", {})
            coords = []
            if isinstance(shape, dict):
                coords = shape.get("coordinates", [])
                if coords:
                    path_out = [[lat, lon] for lon, lat in coords]
                else:
                    path_out = []
            elif isinstance(shape, str):
                coords = _decode_polyline(shape, precision=6)
                if not coords:
                    coords = _decode_polyline(shape, precision=5)
                path_out = coords
            else:
                path_out = []

            if not path_out:
                continue

            summary = leg.get("summary", {})
            distance_km = round(summary.get("length", _path_distance_km(path_out)), 2)
            eta_minutes = int(round(summary.get("time", 0) / 60))

            return {
                "path": path_out,
                "distance_km": distance_km,
                "eta_minutes": eta_minutes
            }
        except (URLError, KeyError, IndexError, ValueError, AttributeError):
            continue

    return None


def _station_coord(route_id, station_name, routes_map):
    route = routes_map.get(route_id)
    if not route:
        return None
    idx = route["indices"].get(station_name)
    trace = route["trace"]
    if idx is None or idx >= len(trace):
        return None
    return trace[idx]


def _segment_info(route_id, start_station_idx, end_station_idx, routes_map):
    """Calculate path, distance, and ETA for a segment between two stations on the same route."""
    cache_key = (route_id, start_station_idx, end_station_idx)
    cached = _cache_get_segment(cache_key)
    if cached:
        return cached

    route = routes_map[route_id]
    full_trace = route['trace']
    indices = route['indices']
    stops = route['stops']

    start_idx = indices.get(stops[start_station_idx])
    end_idx = indices.get(stops[end_station_idx])

    if start_idx is None or end_idx is None:
        start_idx = int(len(full_trace) * (start_station_idx / len(stops)))
        end_idx = int(len(full_trace) * (end_station_idx / len(stops)))

    start_station = stops[start_station_idx]
    end_station = stops[end_station_idx]

    if start_idx < end_idx:
        base_path = full_trace[start_idx: end_idx + 1]
    else:
        base_path = full_trace[end_idx: start_idx + 1][::-1]

    force_base_path = False
    if route_id == "4":
        himmat_idx = stops.index("Himmatlal Park")
        in_range = (start_station_idx <= himmat_idx <= end_station_idx) or (end_station_idx <= himmat_idx <= start_station_idx)
        force_base_path = in_range

    if force_base_path or not USE_VALHALLA:
        path = base_path
        distance_km = round(_path_distance_km(path), 2)
        eta_minutes = int(round((distance_km / COMMERCIAL_SPEED_KMH) * 60))
    else:
        trace_result = _valhalla_trace(base_path)
        if trace_result and _is_trace_acceptable(trace_result["path"], base_path):
            path = trace_result["path"]
            distance_km = trace_result["distance_km"]
            eta_minutes = trace_result["eta_minutes"]
        else:
            via_result = _valhalla_route_via(base_path, max_points=18)
            if via_result and _is_trace_acceptable(via_result["path"], base_path, max_mean_deviation_km=0.55):
                path = via_result["path"]
                distance_km = via_result["distance_km"]
                eta_minutes = via_result["eta_minutes"]
            else:
                start_coord = _station_coord(route_id, start_station, routes_map) or base_path[0]
                end_coord = _station_coord(route_id, end_station, routes_map) or base_path[-1]
                route_result = _valhalla_route(start_coord, end_coord)
                if route_result and _is_trace_acceptable(route_result["path"], base_path, max_mean_deviation_km=0.55):
                    path = route_result["path"]
                    distance_km = route_result["distance_km"]
                    eta_minutes = route_result["eta_minutes"]
                else:
                    path = base_path
                    distance_km = round(_path_distance_km(path), 2)
                    eta_minutes = int(round((distance_km / COMMERCIAL_SPEED_KMH) * 60))

    station_count = abs(end_station_idx - start_station_idx) + 1
    if eta_minutes <= 0:
        dwell_minutes = (station_count * DWELL_TIME_SEC) / 60
        eta_minutes = int(round((distance_km / COMMERCIAL_SPEED_KMH) * 60 + dwell_minutes))

    result = {
        "path": path,
        "distance_km": distance_km,
        "eta_minutes": eta_minutes,
        "station_count": station_count
    }
    _cache_set_segment(cache_key, result)
    return result


def _calculate_direct_path(route_id, origin_idx, dest_idx, origin, destination, routes_map):
    """Calculate path for single-route journey"""
    route = routes_map[route_id]
    full_trace = route['trace']
    indices = route['indices']
    stops = route['stops']
    
    # Get coordinate indices
    start_idx = indices.get(stops[origin_idx])
    end_idx = indices.get(stops[dest_idx])
    
    if start_idx is None or end_idx is None:
        # Fallback: estimate based on station position
        start_idx = int(len(full_trace) * (origin_idx / len(stops)))
        end_idx = int(len(full_trace) * (dest_idx / len(stops)))
    
    # Extract path (handle reverse)
    if start_idx < end_idx:
        direction = "Onward (↓)"
    else:
        direction = "Return (↑)"

    segment = _segment_info(route_id, origin_idx, dest_idx, routes_map)
    path = segment["path"]
    distance_km = segment["distance_km"]
    eta_minutes = segment["eta_minutes"]
    
    return {
        "path": path,
        "total_nodes": len(path),
        "total_distance_km": distance_km,
        "eta_minutes": eta_minutes,
        "route_id": route_id,
        "direction": direction,
        "origin": origin,
        "destination": destination,
        "transfer": False,
        "segments": [
            {
                "route_id": route_id,
                "from_station": origin,
                "to_station": destination,
                "distance_km": distance_km,
                "duration_minutes": eta_minutes
            }
        ],
        "timestamp": datetime.now().isoformat()
    }


def _find_transfer_route(origin, destination, routes_map):
    """Find multi-route transfer path (supports up to 2 transfers for multi-hop journeys)"""
    
    # Find all routes containing origin and destination
    routes_with_origin = []
    routes_with_dest = []
    
    for route_id, route_data in routes_map.items():
        stops = route_data['stops']
        
        origin_idx = next((i for i, s in enumerate(stops) if s.lower() == origin.lower()), -1)
        dest_idx = next((i for i, s in enumerate(stops) if s.lower() == destination.lower()), -1)
        
        if origin_idx != -1:
            routes_with_origin.append({'route_id': route_id, 'index': origin_idx})
        if dest_idx != -1:
            routes_with_dest.append({'route_id': route_id, 'index': dest_idx})
    
    # ========== TRY SINGLE TRANSFER (origin_route → transfer_station → dest_route) ==========
    for origin_route in routes_with_origin:
        for dest_route in routes_with_dest:
            if origin_route['route_id'] == dest_route['route_id']:
                continue  # Same route, already checked
            
            # Find common stations
            origin_stops = routes_map[origin_route['route_id']]['stops']
            dest_stops = routes_map[dest_route['route_id']]['stops']
            
            common_stations = [s for s in origin_stops if s in dest_stops and s != origin and s != destination]
            
            if common_stations:
                best = None
                for transfer_station in common_stations:
                    transfer_idx_origin = origin_stops.index(transfer_station)
                    transfer_idx_dest = dest_stops.index(transfer_station)

                    # Calculate first segment
                    segment1 = _segment_info(
                        origin_route['route_id'],
                        origin_route['index'],
                        transfer_idx_origin,
                        routes_map
                    )

                    # Calculate second segment
                    segment2 = _segment_info(
                        dest_route['route_id'],
                        transfer_idx_dest,
                        dest_route['index'],
                        routes_map
                    )

                    if not (segment1 and segment2):
                        continue

                    distance_km = segment1["distance_km"] + segment2["distance_km"]
                    eta_minutes = segment1["eta_minutes"] + segment2["eta_minutes"] + 3  # +3min for transfer
                    score = (eta_minutes, distance_km)

                    if best is None or score < best["score"]:
                        best = {
                            "transfer_station": transfer_station,
                            "segment1": segment1,
                            "segment2": segment2,
                            "distance_km": distance_km,
                            "eta_minutes": eta_minutes,
                            "score": score
                        }

                if best:
                    segment1 = best["segment1"]
                    segment2 = best["segment2"]
                    transfer_station = best["transfer_station"]
                    # Concatenate paths
                    full_path = segment1["path"][:-1] + segment2["path"]  # Remove duplicate transfer station
                    distance_km = round(best["distance_km"], 2)
                    eta_minutes = best["eta_minutes"]

                    return {
                        "path": full_path,
                        "total_nodes": len(full_path),
                        "total_distance_km": distance_km,
                        "eta_minutes": eta_minutes,
                        "transfer": True,
                        "route_1": origin_route['route_id'],
                        "route_2": dest_route['route_id'],
                        "transfer_station": transfer_station,
                        "origin": origin,
                        "destination": destination,
                        "segments": [
                            {
                                "route_id": origin_route['route_id'],
                                "from_station": origin,
                                "to_station": transfer_station,
                                "distance_km": segment1["distance_km"],
                                "duration_minutes": segment1["eta_minutes"]
                            },
                            {
                                "route_id": dest_route['route_id'],
                                "from_station": transfer_station,
                                "to_station": destination,
                                "distance_km": segment2["distance_km"],
                                "duration_minutes": segment2["eta_minutes"]
                            }
                        ],
                        "timestamp": datetime.now().isoformat()
                    }
    
    # ========== TRY DOUBLE TRANSFER (origin_route → mid1 → mid_route → mid2 → dest_route) ==========
    # This handles cases like: Route 1 → Route 15 → Route 7
    for origin_route in routes_with_origin:
        origin_stops = routes_map[origin_route['route_id']]['stops']
        
        # Find all routes that share a station with origin_route
        for mid_route_id, mid_route_data in routes_map.items():
            if mid_route_id == origin_route['route_id']:
                continue
                
            mid_stops = mid_route_data['stops']
            
            # Find common stations between origin_route and mid_route
            common_1 = [s for s in origin_stops if s in mid_stops and s != origin and s != destination]
            if not common_1:
                continue

            # Now try to reach destination through another route
            for dest_route in routes_with_dest:
                if dest_route['route_id'] in [origin_route['route_id'], mid_route_id]:
                    continue
                
                dest_stops = routes_map[dest_route['route_id']]['stops']
                
                # Find common stations between mid_route and dest_route
                common_2 = [s for s in mid_stops if s in dest_stops and s != origin and s != destination]
                if not common_2:
                    continue

                best = None
                for transfer_1 in common_1:
                    transfer_1_idx_origin = origin_stops.index(transfer_1)
                    transfer_1_idx_mid = mid_stops.index(transfer_1)

                    for transfer_2 in common_2:
                        transfer_2_idx_mid = mid_stops.index(transfer_2)
                        transfer_2_idx_dest = dest_stops.index(transfer_2)

                        segment1 = _segment_info(
                            origin_route['route_id'],
                            origin_route['index'],
                            transfer_1_idx_origin,
                            routes_map
                        )

                        segment2 = _segment_info(
                            mid_route_id,
                            transfer_1_idx_mid,
                            transfer_2_idx_mid,
                            routes_map
                        )

                        segment3 = _segment_info(
                            dest_route['route_id'],
                            transfer_2_idx_dest,
                            dest_route['index'],
                            routes_map
                        )

                        if not (segment1 and segment2 and segment3):
                            continue

                        distance_km = segment1["distance_km"] + segment2["distance_km"] + segment3["distance_km"]
                        eta_minutes = segment1["eta_minutes"] + segment2["eta_minutes"] + segment3["eta_minutes"] + 6
                        score = (eta_minutes, distance_km)

                        if best is None or score < best["score"]:
                            best = {
                                "transfer_1": transfer_1,
                                "transfer_2": transfer_2,
                                "segment1": segment1,
                                "segment2": segment2,
                                "segment3": segment3,
                                "distance_km": distance_km,
                                "eta_minutes": eta_minutes,
                                "score": score
                            }

                if best:
                    segment1 = best["segment1"]
                    segment2 = best["segment2"]
                    segment3 = best["segment3"]
                    transfer_1 = best["transfer_1"]
                    transfer_2 = best["transfer_2"]

                    # Concatenate all three paths, removing duplicate transfer stations
                    full_path = segment1["path"][:-1] + segment2["path"][:-1] + segment3["path"]
                    distance_km = round(best["distance_km"], 2)
                    eta_minutes = best["eta_minutes"]
                    
                    return {
                        "path": full_path,
                        "total_nodes": len(full_path),
                        "total_distance_km": distance_km,
                        "eta_minutes": eta_minutes,
                        "transfer": True,
                        "route_1": origin_route['route_id'],
                        "route_2": mid_route_id,
                        "route_3": dest_route['route_id'],
                        "transfer_station_1": transfer_1,
                        "transfer_station_2": transfer_2,
                        "origin": origin,
                        "destination": destination,
                        "segments": [
                            {
                                "route_id": origin_route['route_id'],
                                "from_station": origin,
                                "to_station": transfer_1,
                                "distance_km": segment1["distance_km"],
                                "duration_minutes": segment1["eta_minutes"]
                            },
                            {
                                "route_id": mid_route_id,
                                "from_station": transfer_1,
                                "to_station": transfer_2,
                                "distance_km": segment2["distance_km"],
                                "duration_minutes": segment2["eta_minutes"]
                            },
                            {
                                "route_id": dest_route['route_id'],
                                "from_station": transfer_2,
                                "to_station": destination,
                                "distance_km": segment3["distance_km"],
                                "duration_minutes": segment3["eta_minutes"]
                            }
                        ],
                        "timestamp": datetime.now().isoformat()
                    }
    
    return None


def _calculate_segment(route_id, start_station_idx, end_station_idx, routes_map):
    """Calculate path for a segment between two stations on same route"""
    route = routes_map[route_id]
    full_trace = route['trace']
    indices = route['indices']
    stops = route['stops']
    
    start_idx = indices.get(stops[start_station_idx])
    end_idx = indices.get(stops[end_station_idx])
    
    if start_idx is None or end_idx is None:
        start_idx = int(len(full_trace) * (start_station_idx / len(stops)))
        end_idx = int(len(full_trace) * (end_station_idx / len(stops)))
    
    if start_idx < end_idx:
        return full_trace[start_idx : end_idx + 1]
    else:
        return full_trace[end_idx : start_idx + 1][::-1]


def _find_route_id_by_stations(origin, destination, routes_map):
    for route_id, route_data in routes_map.items():
        stops = route_data['stops']
        if origin in stops and destination in stops:
            return route_id
    return None


def _resolve_route_id_from_text(message, journey, routes_map):
    text = message.lower()
    for rid in ('15', '7', '1'):
        if f"route {rid}" in text or f"r{rid}" in text:
            return rid

    if journey:
        return journey.get("route_id") or journey.get("route_1") or journey.get("route")

    return None


def _format_stops(stops):
    return ", ".join(stops)


def _build_chat_answer(message, origin, destination, journey, routes_map):
    text = message.lower()
    sources = []

    route_id = _resolve_route_id_from_text(message, journey, routes_map)
    if not route_id and origin and destination:
        route_id = _find_route_id_by_stations(origin, destination, routes_map)

    if any(word in text for word in ("fare", "price", "ticket")):
        distance_km = None
        if journey and journey.get("total_distance_km"):
            distance_km = journey.get("total_distance_km")
        elif route_id and route_id in ROUTE_DISTANCES:
            distance_km = ROUTE_DISTANCES[route_id]

        if distance_km is None:
            return {
                "answer": "Provide a route or origin and destination so I can estimate the fare based on official distance data.",
                "sources": []
            }

        fare = int(round(FARE_BASE_INR + (distance_km * FARE_PER_KM_INR)))
        sources.extend([
            "FARE_BASE_INR",
            "FARE_PER_KM_INR",
            "ROUTE_DISTANCES"
        ])
        return {
            "answer": f"Estimated fare: ₹{fare} (base ₹{FARE_BASE_INR} + ₹{FARE_PER_KM_INR}/km for {round(distance_km, 1)} km).",
            "sources": sources
        }

    if any(word in text for word in ("route", "stations", "stops", "station list")):
        if not route_id:
            return {
                "answer": "Tell me a route number (1, 7, 15) or select stations so I can list the official stops.",
                "sources": []
            }
        stops = routes_map[route_id]["stops"]
        distance = ROUTE_DISTANCES.get(route_id)
        sources.extend(["ROUTE_1_STOPS", "ROUTE_7_STOPS", "ROUTE_15_STOPS", "ROUTE_DISTANCES"])
        return {
            "answer": f"Route {route_id} stops: {_format_stops(stops)}. Distance ≈ {distance} km.",
            "sources": sources
        }

    if any(word in text for word in ("bus", "capacity", "headway", "frequency", "peak")):
        sources.extend([
            "HEADWAY_PEAK",
            "HEADWAY_OFFPEAK",
            "BUS_CAPACITY_STD",
            "BUS_CAPACITY_ART",
            "PEAK_HOURS_MORNING",
            "PEAK_HOURS_EVENING"
        ])
        return {
            "answer": (
                f"Official service info: peak headway ≈ {HEADWAY_PEAK} min, off-peak ≈ {HEADWAY_OFFPEAK} min. "
                f"Standard bus capacity {BUS_CAPACITY_STD} passengers (articulated {BUS_CAPACITY_ART}). "
                "Peak hours are 8–11 AM and 5–8 PM."
            ),
            "sources": sources
        }

    return {
        "answer": (
            "I can share official Janmarg data on routes, stops, headways, capacity, and fares. "
            "Ask about a route number, stations, bus frequency, or fare."
        ),
        "sources": ["ROUTE_DISTANCES", "ROUTE_1_STOPS", "ROUTE_7_STOPS", "ROUTE_15_STOPS"]
    }


# ============================================================================
# 🤖 AI AGENT ENDPOINTS - Smart Transit Intelligence
# ============================================================================

@app.get("/api/nearest-bus")
def nearest_bus(
    user_lat: float,
    user_lng: float,
    route_id: str = None
):
    """
    Find the nearest bus to user's current location
    
    Args:
        user_lat: User's latitude
        user_lng: User's longitude
        route_id: Optional - filter to specific route
    
    Returns:
        Nearest bus info with distance and ETA
    """
    return transit_ai.get_nearest_bus(user_lat, user_lng, route_id)


@app.get("/api/live-bus-position")
def live_bus_position(
    route_id: str,
    bus_id: str,
    progress_percent: float = 0
):
    """
    Get real-time position of a bus moving along route
    
    Returns:
        Current GPS location, speed, and progress
    """
    return transit_ai.get_live_bus_position(route_id, bus_id, progress_percent)


@app.post("/api/transfer-recommendations")
def transfer_recommendations(request_data: dict):
    """
    Get smart recommendations for transfers and segment travel
    
    Args:
        origin: Starting station
        destination: Ending station
    
    Returns:
        List of intelligent transfer recommendations
    """
    origin = request_data.get("origin")
    destination = request_data.get("destination")
    
    return transit_ai.get_transfer_recommendations(origin, destination)


@app.get("/api/transfer-wait-time")
def transfer_wait_time(
    transfer_station: str,
    from_route: str,
    to_route: str
):
    """
    Predict waiting time at a transfer station
    
    Returns:
        Wait time estimate with confidence and amenities info
    """
    return transit_ai.predict_transfer_wait_time(transfer_station, from_route, to_route)


@app.get("/api/traffic-aware-eta")
def traffic_aware_eta(
    route_id: str,
    origin_idx: int = 0,
    destination_idx: int = 10,
    distance_km: float = None
):
    """
    Get traffic-aware ETA with dynamic adjustments
    
    Returns:
        ETA with confidence score and traffic factors
    """
    return transit_ai.get_traffic_aware_eta(route_id, origin_idx, destination_idx, distance_km)


@app.get("/api/smart-boarding-time")
def smart_boarding_time(
    route_id: str,
    origin_station: str
):
    """
    Get smart recommendation for when to board
    
    Returns:
        Recommendation to catch next bus or wait
    """
    return transit_ai.get_smart_boarding_time(route_id, origin_station)


@app.post("/api/smart-recommendations")
def smart_recommendations(request_data: dict):
    """
    Get holistic smart recommendations for entire journey
    
    Args:
        origin: Starting station
        destination: Ending station
        journey: Optional - complete journey data
    
    Returns:
        Array of prioritized smart recommendations
    """
    origin = request_data.get("origin")
    destination = request_data.get("destination")
    journey = request_data.get("journey")
    
    return transit_ai.get_smart_recommendations(origin, destination, journey)


STATION_ALIASES = {
    "iskcon": "ISKCON Cross Road",
    "iskcon cross road": "ISKCON Cross Road",
    "iskcon crossroads": "ISKCON Cross Road",
    "iskon": "ISKCON Cross Road",
    "iskon cross road": "ISKCON Cross Road",
    "vgc": "Vishwakarma Government Engineering College",
    "vgec": "Vishwakarma Government Engineering College",
    "engineering college": "Vishwakarma Government Engineering College",
    "vishwakarma": "Vishwakarma Government Engineering College",
    "vishwakarma college": "Vishwakarma Government Engineering College",
    "ld engineering college": "L.D. Engineering College",
    "ld college": "L.D. Engineering College",
    "ld": "L.D. Engineering College",
    "l d engineering college": "L.D. Engineering College",
    "airport": "Ahmedabad Domestic Airport",
    "domestic airport": "Ahmedabad Domestic Airport",
    "ahmedabad airport": "Ahmedabad Domestic Airport",
    "rto": "RTO Circle",
    "university": "University",
    "memnagar": "Memnagar",
    "himmatlal park": "Himmatlal Park",
    "jodhpur": "Jodhpur Char Rasta",
    "jodhpur char rasta": "Jodhpur Char Rasta",
    "ramdev nagar": "Ramdev Nagar",
    "ramdevnagar": "Ramdev Nagar",
    "nehrunagar": "Nehrunagar",
    "manekbag": "Manekbag",
    "dharnidhar": "Dharnidhar Derasar",
    "dharni dhar": "Dharnidhar Derasar",
    "anjali": "Anjali Cross Road",
    "anjali cross road": "Anjali Cross Road",
    "star bazaar": "Star Bazaar",
    "isro colony": "ISRO Colony",
    "sola": "Sola Cross-Road",
    "sola cross road": "Sola Cross-Road",
    "shastrinagar": "Shastrinagar",
    "pragatinagar": "Pragatinagar",
    "akbarnagar": "Akbarnagar",
    "ranip": "Ranip Cross-Road",
    "ranip cross road": "Ranip Cross-Road",
    "sabarmati power house": "Sabarmati Power-House",
    "sabarmati power-house": "Sabarmati Power-House",
    "sabarmati police": "Sabarmati Police Station",
    "motera": "Motera Cross-Road",
    "visat": "Visat-Gandhinagar Junction",
    "visat gandhinagar": "Visat-Gandhinagar Junction",
    "shivranjani": "Shivranjani",
}


def _normalize_station_name(name: str) -> str:
    if not name:
        return ""
    cleaned = name.strip().lower()
    cleaned = cleaned.replace("&", "and")
    cleaned = re.sub(r"[^a-z0-9\s]", " ", cleaned)
    return " ".join(cleaned.split())


def _resolve_station_name(name: str, stops) -> str:
    normalized = _normalize_station_name(name)
    if not normalized:
        return ""
    alias = STATION_ALIASES.get(normalized)
    if alias and alias in stops:
        return alias
    for stop in stops:
        if _normalize_station_name(stop) == normalized:
            return stop
    return ""


def _build_station_lookup(routes_map):
    lookup = {}
    for route_data in routes_map.values():
        for stop in route_data.get("stops", []):
            lookup[_normalize_station_name(stop)] = stop
    for alias, canonical in STATION_ALIASES.items():
        lookup[_normalize_station_name(alias)] = canonical
    return lookup


def _extract_stations_from_message(message: str, routes_map):
    normalized = _normalize_station_name(message)
    if not normalized:
        return []

    lookup = _build_station_lookup(routes_map)
    candidates = list(lookup.keys())
    matches = []

    for key in candidates:
        idx = normalized.find(key)
        if idx >= 0:
            matches.append((idx, lookup[key]))

    if not matches:
        return []

    matches.sort(key=lambda item: item[0])
    ordered = []
    for _, station in matches:
        if station not in ordered:
            ordered.append(station)
        if len(ordered) >= 2:
            break

    return ordered


def _is_route_question(message: str) -> bool:
    q = (message or "").lower()
    return any(phrase in q for phrase in (
        "how do i go",
        "how to go",
        "how to reach",
        "route from",
        "route to",
        "go from",
        "get from",
        "directions",
        "which bus",
        "which route",
        "travel from"
    ))


def _route_guidance(origin: str, destination: str, routes_map):
    routes_with_origin = []
    routes_with_dest = []

    for route_id, route_data in routes_map.items():
        stops = route_data["stops"]
        origin_idx = next((i for i, s in enumerate(stops) if s.lower() == origin.lower()), -1)
        dest_idx = next((i for i, s in enumerate(stops) if s.lower() == destination.lower()), -1)
        if origin_idx != -1:
            routes_with_origin.append({"route_id": route_id, "index": origin_idx})
        if dest_idx != -1:
            routes_with_dest.append({"route_id": route_id, "index": dest_idx})

    for origin_route in routes_with_origin:
        for dest_route in routes_with_dest:
            if origin_route["route_id"] == dest_route["route_id"]:
                return (
                    f"Take Route {origin_route['route_id']} from {origin} to {destination}."
                )

    best = None
    for origin_route in routes_with_origin:
        origin_stops = routes_map[origin_route["route_id"]]["stops"]
        for dest_route in routes_with_dest:
            if origin_route["route_id"] == dest_route["route_id"]:
                continue
            dest_stops = routes_map[dest_route["route_id"]]["stops"]
            common = [s for s in origin_stops if s in dest_stops and s not in (origin, destination)]
            if not common:
                continue
            for transfer in common:
                score = abs(origin_route["index"] - origin_stops.index(transfer)) + abs(dest_route["index"] - dest_stops.index(transfer))
                if best is None or score < best["score"]:
                    best = {
                        "score": score,
                        "transfer": transfer,
                        "route_1": origin_route["route_id"],
                        "route_2": dest_route["route_id"]
                    }

    if best:
        return (
            f"Take Route {best['route_1']} from {origin} to {best['transfer']}, "
            f"then transfer to Route {best['route_2']} and continue to {destination}."
        )

    best_double = None
    for origin_route in routes_with_origin:
        origin_stops = routes_map[origin_route["route_id"]]["stops"]
        for mid_route_id, mid_route in routes_map.items():
            if mid_route_id == origin_route["route_id"]:
                continue
            mid_stops = mid_route["stops"]
            common_1 = [s for s in origin_stops if s in mid_stops and s not in (origin, destination)]
            if not common_1:
                continue
            for dest_route in routes_with_dest:
                if dest_route["route_id"] in (origin_route["route_id"], mid_route_id):
                    continue
                dest_stops = routes_map[dest_route["route_id"]]["stops"]
                common_2 = [s for s in mid_stops if s in dest_stops and s not in (origin, destination)]
                if not common_2:
                    continue
                for transfer_1 in common_1:
                    for transfer_2 in common_2:
                        score = (
                            abs(origin_route["index"] - origin_stops.index(transfer_1)) +
                            abs(mid_stops.index(transfer_1) - mid_stops.index(transfer_2)) +
                            abs(dest_route["index"] - dest_stops.index(transfer_2))
                        )
                        if best_double is None or score < best_double["score"]:
                            best_double = {
                                "score": score,
                                "transfer_1": transfer_1,
                                "transfer_2": transfer_2,
                                "route_1": origin_route["route_id"],
                                "route_2": mid_route_id,
                                "route_3": dest_route["route_id"]
                            }

    if best_double:
        return (
            f"Take Route {best_double['route_1']} from {origin} to {best_double['transfer_1']}, "
            f"transfer to Route {best_double['route_2']} to {best_double['transfer_2']}, "
            f"then Route {best_double['route_3']} to {destination}."
        )

    return ""


def _estimate_distance_from_stations(origin: str, destination: str):
    # Try route-based exact distance first
    routes = [
        ("1", ROUTE_1_STOPS, ROUTE_DISTANCES.get("1")),
        ("4", ROUTE_4_STOPS, ROUTE_DISTANCES.get("4")),
        ("7", ROUTE_7_STOPS, ROUTE_DISTANCES.get("7")),
        ("15", ROUTE_15_STOPS, ROUTE_DISTANCES.get("15")),
    ]
    
    # 1. First Pass: Same Route Check
    for route_id, stops, total_distance in routes:
        if not total_distance or not stops:
            continue
        resolved_origin = _resolve_station_name(origin, stops)
        resolved_destination = _resolve_station_name(destination, stops)
        
        if resolved_origin and resolved_destination:
            if resolved_origin == resolved_destination:
                return 0.0, route_id
            try:
                origin_index = stops.index(resolved_origin)
                destination_index = stops.index(resolved_destination)
                span = abs(destination_index - origin_index)
                if len(stops) > 1:
                    segment_km = total_distance * (span / (len(stops) - 1))
                    return segment_km, route_id
            except ValueError:
                continue

    # 2. Second Pass: Multi-route or Vague Distance (Heuristic)
    # If not on same route, provide a rough estimate based on system average
    if origin and destination:
        # Match canonical names to robustly estimate distance
        o_can = origin.lower()
        d_can = destination.lower()
        
        # ISKCON to VGEC (Transfers involve multiple routes)
        if ("iskcon" in o_can and "vishwakarma" in d_can) or ("vishwakarma" in o_can and "iskcon" in d_can):
            return 18.2, "1+7"
            
        # LD College to VGEC
        if ("l.d." in o_can and "vishwakarma" in d_can) or ("vishwakarma" in o_can and "l.d." in d_can):
            return 12.5, "4+7"
            
        # ISKCON to Airport
        if ("iskcon" in o_can and "airport" in d_can) or ("airport" in o_can and "iskcon" in d_can):
            return 25.0, "15"

        # General cross-route fallback
        return 10.0, "mixed" 

    return None, None



@app.post("/api/chat")
def janmarg_ai_chat(request_data: dict):
    """
    RAG-powered chat endpoint using the World Bank GEF report.
    """
    message = (request_data.get("message") or "").strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message is required")

    origin = (request_data.get("origin") or "").strip()
    destination = (request_data.get("destination") or "").strip()
    journey = request_data.get("journey") or {}
    history = request_data.get("history") or []

    routes_map = {
        '1': {
            'stops': ROUTE_1_STOPS,
            'trace': ROUTE_1_FULL_TRACE,
            'indices': ROUTE_1_INDICES
        },
        '15': {
            'stops': ROUTE_15_STOPS,
            'trace': ROUTE_15_FULL_TRACE,
            'indices': ROUTE_15_INDICES
        },
        '7': {
            'stops': ROUTE_7_STOPS,
            'trace': ROUTE_7_FULL_TRACE,
            'indices': ROUTE_7_INDICES
        },
        '4': {
            'stops': ROUTE_4_STOPS,
            'trace': ROUTE_4_FULL_TRACE,
            'indices': ROUTE_4_INDICES
        }
    }

    if (not origin or not destination) and message:
        extracted = _extract_stations_from_message(message, routes_map)
        if len(extracted) >= 2:
            origin = origin or extracted[0]
            destination = destination or extracted[1]

    if _is_route_question(message) and origin and destination:
        guidance = _route_guidance(origin, destination, routes_map)
        if guidance:
            return {
                "response": guidance,
                "timestamp": datetime.now().isoformat()
            }

    user_context = ""
    if origin or destination:
        user_context = f"origin={origin}, destination={destination}"
    if journey:
        distance = journey.get("total_distance_km")
        route_id = journey.get("route_id") or journey.get("route_1")
        if distance is not None:
            user_context = f"{user_context}, distance_km={distance}" if user_context else f"distance_km={distance}"
        if route_id:
            user_context = f"{user_context}, route={route_id}" if user_context else f"route={route_id}"
    else:
        estimated_distance, estimated_route = _estimate_distance_from_stations(origin, destination)
        if estimated_distance is not None:
            user_context = f"{user_context}, distance_km={estimated_distance:.2f}" if user_context else f"distance_km={estimated_distance:.2f}"
        if estimated_route:
            user_context = f"{user_context}, route={estimated_route}" if user_context else f"route={estimated_route}"

    response = janmarg_brain.ask_llama(
        message,
        user_context=user_context or None,
        history=history
    )
    return {
        "response": response,
        "timestamp": datetime.now().isoformat()
    }


@app.post("/api/janmarg-chat")
def janmarg_chat(request_data: dict):
    """
    Chat endpoint for official Janmarg data: routes, stops, fares, and bus info.
    """
    message = (request_data.get("message") or "").strip()
    origin = (request_data.get("origin") or "").strip()
    destination = (request_data.get("destination") or "").strip()
    journey = request_data.get("journey") or None

    if not message:
        raise HTTPException(status_code=400, detail="Message is required")

    routes_map = {
        '1': {
            'stops': ROUTE_1_STOPS,
            'trace': ROUTE_1_FULL_TRACE,
            'indices': ROUTE_1_INDICES
        },
        '15': {
            'stops': ROUTE_15_STOPS,
            'trace': ROUTE_15_FULL_TRACE,
            'indices': ROUTE_15_INDICES
        },
        '7': {
            'stops': ROUTE_7_STOPS,
            'trace': ROUTE_7_FULL_TRACE,
            'indices': ROUTE_7_INDICES
        }
    }

    response = _build_chat_answer(message, origin, destination, journey, routes_map)
    response["timestamp"] = datetime.now().isoformat()
    return response


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
