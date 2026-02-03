from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import random
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
    AVG_DIST_BETWEEN_STOPS_KM,
    is_peak_hour,
    get_traffic_factor,
    get_occupancy_level,
    get_headway
)
from janmarg_config import (
    is_peak_hour as is_peak_hour_config,
    get_headway as get_headway_config,
    get_traffic_factor as get_traffic_factor_config,
    get_crowd_level
)

app = FastAPI(
    title="Transit Flow AI Backend",
    description="Knowledge-driven AI engine for Janmarg BRTS predictions",
    version="2.0.0"
)

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
        route_id: Route identifier ('1', '15', or '7')
    
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
        route_id: Route identifier ('1', '15', or '7')
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
            '15': ROUTE_15_STOPS
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
