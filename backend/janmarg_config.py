"""
📘 OFFICIAL JANMARG OPERATIONAL DATA
Source: World Bank/GEF Sustainable Urban Transport Project
Knowledge base for physics-based transit predictions
"""

# ========== SPEED & TIMING PARAMETERS ==========
COMMERCIAL_SPEED_KMH = 26.0  # Average commercial speed (including stops)
MAX_SPEED_KMH = 50.0         # Maximum corridor speed

# ========== FREQUENCY (HEADWAY IN MINUTES) ==========
HEADWAY_PEAK = 2.5            # Peak hours: 2.5 min between buses
HEADWAY_OFFPEAK = 8.0         # Off-peak: 8 min between buses

# ========== PEAK HOURS (24-HOUR FORMAT) ==========
PEAK_MORNING = range(8, 11)   # 8 AM - 11 AM
PEAK_EVENING = range(17, 20)  # 5 PM - 8 PM

# ========== OCCUPANCY LEVELS ==========
OCCUPANCY_PEAK = 0.90         # 90% capacity during peak
OCCUPANCY_MODERATE = 0.65     # 65% capacity moderate times
OCCUPANCY_LOW = 0.40          # 40% capacity off-peak

# ========== BUS CAPACITY ==========
BUS_CAPACITY_STANDARD = 80    # Standard bus capacity
BUS_CAPACITY_ARTICULATED = 150 # Articulated bus capacity

# ========== TRAFFIC FACTORS (Time-based multipliers) ==========
TRAFFIC_FACTOR_PEAK = 1.4     # 40% slower during peak
TRAFFIC_FACTOR_OFFPEAK = 1.1  # 10% slower during off-peak
TRAFFIC_FACTOR_NIGHT = 0.9    # 10% faster at night


def is_peak_hour(hour: int) -> bool:
    """Check if current hour is a peak hour"""
    return hour in PEAK_MORNING or hour in PEAK_EVENING


def get_headway(hour: int) -> float:
    """Get bus headway (minutes between buses) for given hour"""
    return HEADWAY_PEAK if is_peak_hour(hour) else HEADWAY_OFFPEAK


def get_traffic_factor(hour: int) -> float:
    """Get traffic congestion factor for given hour"""
    if is_peak_hour(hour):
        return TRAFFIC_FACTOR_PEAK
    elif hour >= 22 or hour < 6:  # Night time
        return TRAFFIC_FACTOR_NIGHT
    else:
        return TRAFFIC_FACTOR_OFFPEAK


def get_crowd_level(hour: int) -> tuple:
    """
    Get crowd level and occupancy ratio for given hour
    Returns: (crowd_level_string, occupancy_ratio)
    """
    if is_peak_hour(hour):
        return ("High (Standing)", OCCUPANCY_PEAK)
    elif hour >= 12 and hour < 17:
        return ("Moderate (Mixed)", OCCUPANCY_MODERATE)
    else:
        return ("Low (Seating Available)", OCCUPANCY_LOW)
