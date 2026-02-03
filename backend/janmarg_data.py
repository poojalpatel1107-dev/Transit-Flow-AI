"""
JANMARG BRTS OPERATIONAL PARAMETERS
Source: World Bank/GEF Ahmedabad BRTS Operational Report

This knowledge base contains official operational statistics and parameters
for the Janmarg Bus Rapid Transit System in Ahmedabad, India.
"""

# ============================================================================
# 1. SPEED & TIMING PARAMETERS
# ============================================================================
COMMERCIAL_SPEED_KMH = 26.0  # Average speed including station stops
MAX_SPEED_KMH = 50.0         # Maximum allowed speed on BRT corridor
DWELL_TIME_SEC = 30          # Average dwell time at each station (seconds)

# ============================================================================
# 2. FREQUENCY (HEADWAY) - Time between consecutive buses
# ============================================================================
HEADWAY_PEAK = 2.5      # Bus arrives every 2.5 minutes during peak hours
HEADWAY_OFFPEAK = 8.0   # Bus arrives every 8 minutes during off-peak hours

# ============================================================================
# 3. CAPACITY (Passenger capacity per bus)
# ============================================================================
BUS_CAPACITY_STD = 80   # Standard bus capacity (passengers)
BUS_CAPACITY_ART = 150  # Articulated bus capacity (passengers)

# ============================================================================
# 4. PEAK HOURS DEFINITION (Hour of day, 24-hour format)
# ============================================================================
PEAK_HOURS_MORNING = (8, 11)   # Morning peak: 8:00 AM to 11:00 AM
PEAK_HOURS_EVENING = (17, 20)  # Evening peak: 5:00 PM to 8:00 PM

# ============================================================================
# 5. ROUTE DISTANCES (Approximate distances in kilometers)
# ============================================================================
ROUTE_DISTANCES = {
    '1': 12.0,   # Shivranjani to ISKCON: ~12 km
    '15': 25.0,  # ISKCON to Airport: ~25 km
    '7': 18.0,   # Ranip to Engineering College: ~18 km
}

# ============================================================================
# 5A. ROUTE STATION SEQUENCES (Ordered for distance calculation)
# ============================================================================
ROUTE_1_STOPS = [
    "Shivranjani",
    "Jodhpur",
    "Star Bazaar",
    "ISRO Colony",
    "Ramdev Nagar",
    "ISKCON"
]

ROUTE_7_STOPS = [
    "Airport Circle",
    "Sardarnagar",
    "Hansol",
    "Bhat",
    "Motera Stadium"
]

ROUTE_15_STOPS = [
    "ISKCON",
    "ISRO Colony",
    "Star Bazaar",
    "Jodhpur",
    "Himmatlal Park",
    "University",
    "Memnagar",
    "Sola Cross-Road",
    "Shastrinagar",
    "Pragatinagar",
    "Akbarnagar",
    "Ranip Cross-Road",
    "RTO Circle",
    "Airport"
]

# Average distance between consecutive stops (simplified for physics)
AVG_DIST_BETWEEN_STOPS_KM = 1.2

# ============================================================================
# 6. STATION COUNT (Number of stops per route)
# ============================================================================
ROUTE_STATIONS = {
    '1': 6,    # Route 1 has 6 stations
    '15': 14,  # Route 15 has 14 stations
    '7': 7,    # Route 7 has 7 stations
}

# ============================================================================
# 7. TRAFFIC FACTORS (Congestion multipliers)
# ============================================================================
TRAFFIC_FACTOR_PEAK = 1.4      # 40% slower during peak hours
TRAFFIC_FACTOR_OFFPEAK = 1.1   # 10% slower during off-peak
TRAFFIC_FACTOR_NIGHT = 0.9     # 10% faster at night (minimal traffic)

# ============================================================================
# 8. OCCUPANCY LEVELS (Based on time of day)
# ============================================================================
OCCUPANCY_CRITICAL = 0.90  # 90% capacity during peak hours
OCCUPANCY_MODERATE = 0.65  # 65% capacity during moderate hours
OCCUPANCY_LOW = 0.40       # 40% capacity during off-peak hours

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def is_peak_hour(hour: int) -> bool:
    """
    Determine if given hour falls within peak hours
    
    Args:
        hour: Hour of day (0-23)
    
    Returns:
        True if peak hour, False otherwise
    """
    return (PEAK_HOURS_MORNING[0] <= hour <= PEAK_HOURS_MORNING[1] or 
            PEAK_HOURS_EVENING[0] <= hour <= PEAK_HOURS_EVENING[1])

def get_traffic_factor(hour: int) -> float:
    """
    Get traffic congestion multiplier for given hour
    
    Args:
        hour: Hour of day (0-23)
    
    Returns:
        Traffic congestion multiplier
    """
    if is_peak_hour(hour):
        return TRAFFIC_FACTOR_PEAK
    elif 22 <= hour or hour <= 6:  # Night hours
        return TRAFFIC_FACTOR_NIGHT
    else:
        return TRAFFIC_FACTOR_OFFPEAK

def get_occupancy_level(hour: int) -> tuple[str, float]:
    """
    Get occupancy level and percentage for given hour
    
    Args:
        hour: Hour of day (0-23)
    
    Returns:
        Tuple of (level_name, occupancy_percentage)
    """
    if is_peak_hour(hour):
        return ("High (CRITICAL)", OCCUPANCY_CRITICAL)
    elif 12 <= hour <= 16:
        return ("Moderate", OCCUPANCY_MODERATE)
    else:
        return ("Low", OCCUPANCY_LOW)

def get_headway(hour: int) -> float:
    """
    Get bus frequency (headway) for given hour
    
    Args:
        hour: Hour of day (0-23)
    
    Returns:
        Minutes between consecutive buses
    """
    return HEADWAY_PEAK if is_peak_hour(hour) else HEADWAY_OFFPEAK

# ============================================================================
# SYSTEM INFORMATION (For API endpoints)
# ============================================================================

SYSTEM_INFO = {
    "name": "Janmarg BRTS Ahmedabad",
    "operator": "Ahmedabad Municipal Corporation",
    "commercial_speed": f"{COMMERCIAL_SPEED_KMH} km/h",
    "max_speed": f"{MAX_SPEED_KMH} km/h",
    "standard_bus_capacity": f"{BUS_CAPACITY_STD} passengers",
    "articulated_bus_capacity": f"{BUS_CAPACITY_ART} passengers",
    "peak_headway": f"{HEADWAY_PEAK} minutes",
    "offpeak_headway": f"{HEADWAY_OFFPEAK} minutes",
    "dwell_time": f"{DWELL_TIME_SEC} seconds",
    "peak_morning": f"{PEAK_HOURS_MORNING[0]:02d}:00 - {PEAK_HOURS_MORNING[1]:02d}:00",
    "peak_evening": f"{PEAK_HOURS_EVENING[0]:02d}:00 - {PEAK_HOURS_EVENING[1]:02d}:00",
    "source": "World Bank/GEF Operational Report"
}
