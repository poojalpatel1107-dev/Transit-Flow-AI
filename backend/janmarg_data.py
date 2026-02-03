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
    '1': 8.5,    # ISKCON to Anjali Cross Road: ~8.5 km (Extended)
    '15': 25.0,  # ISKCON to Airport: ~25 km
    '7': 18.0,   # Ranip to Engineering College: ~18 km
}

# ============================================================================
# 5A. ROUTE STATION SEQUENCES (Ordered for distance calculation)
# ============================================================================
ROUTE_1_STOPS = [
    "ISKCON Cross Road",
    "ISRO Colony",
    "Star Bazaar",
    "Jodhpur Char Rasta",
    "Shivranjani",
    "Jhansi Ki Rani",
    "Nehrunagar",
    "Manekbag",
    "Dharnidhar Derasar",
    "Anjali Cross Road"
]

ROUTE_7_STOPS = [
    "Ranip Cross-Road",
    "RTO Circle",
    "Sabarmati Power-House",
    "Sabarmati Police Station",
    "Motera Cross-Road",
    "Visat-Gandhinagar Junction",
    "Vishwakarma Government Engineering College"
]

ROUTE_15_STOPS = [
    "ISKCON Cross Road",
    "ISRO Colony",
    "Star Bazaar",
    "Jodhpur Char Rasta",
    "Himmatlal Park",
    "University",
    "Memnagar",
    "Sola Cross-Road",
    "Shastrinagar",
    "Pragatinagar",
    "Akbarnagar",
    "Ranip Cross-Road",
    "RTO Circle",
    "Ahmedabad Domestic Airport"
]

# Average distance between consecutive stops (simplified for physics)
AVG_DIST_BETWEEN_STOPS_KM = 1.2

# ============================================================================
# 5B. ROUTE 1 STATION DISTANCES (From ISKCON Cross Road in kilometers)
# ============================================================================
ROUTE_1_DISTANCES = {
    "ISKCON Cross Road": 0.0,
    "Ramdev Nagar": 1.8,
    "Shivranjani": 3.2,
    "Jhansi Ki Rani": 4.1,
    "Nehrunagar": 5.0,
    "Manekbag": 5.9,
    "Dharnidhar Derasar": 7.2,
    "Anjali Cross Road": 8.5
}

# ============================================================================
# 🗺️ FULL GEOMETRY TRACES (High-precision GPS coordinates)
# Format: [Latitude, Longitude]
# Index 0 = Route start, Last Index = Route end
# ============================================================================

# ROUTE 1: ISKCON Cross Road → Anjali Cross Road (Full High-Precision Trace)
ROUTE_1_FULL_TRACE = [
    [23.027159639975665, 72.508525610134],  # 0: ISKCON Cross Road (Start)
    [23.02720927254964, 72.5091813959142],
    [23.027358431765975, 72.50989865710105],
    [23.027387067972725, 72.51040917670278],
    [23.027387067971844, 72.51148506848367],
    [23.027508685615174, 72.51262334710938],
    [23.02764133548355, 72.51393369138452],
    [23.027779871051393, 72.51512099453345],
    [23.027805058941752, 72.51564100105563],
    [23.027724100520743, 72.51638386915974],
    [23.027612554047565, 72.51704853914885],
    [23.027725196848948, 72.51771969181848],
    [23.027908708586608, 72.51856030386509],
    [23.02789791378467, 72.51880662274189],
    [23.0277647778328, 72.51937354714505],
    [23.027725198084255, 72.5204371208236],
    [23.027678420542614, 72.52117216763406],
    [23.027520096435083, 72.5216100678627],
    [23.026916211015646, 72.52265573430012],
    [23.026495210030163, 72.5232695765842],
    [23.02619066643301, 72.5241388026524],
    [23.026111503528355, 72.52451023588168],  # 21: Ramdev Nagar
    [23.025726385038723, 72.52639504360843],
    [23.025611238584645, 72.52674301789526],
    [23.025179388035653, 72.52741188217877],
    [23.024815955229727, 72.52824467457714],
    [23.024495932715595, 72.52943742306203],
    [23.024344801594864, 72.53023111722567],
    [23.024336, 72.531295],
    [23.024228, 72.532460],
    [23.023868, 72.533222],
    [23.023272, 72.535304],
    [23.022953, 72.536837],  # 32: Jhansi Ki Rani area
    [23.022681, 72.538441],
    [23.022535, 72.540835],  # 34: Nehrunagar
    [23.022557, 72.542263],
    [23.022280, 72.543048],
    [23.021288, 72.543244],
    [23.018310, 72.544083],  # 38: Manekbag
    [23.015248, 72.544788],
    [23.011757, 72.545753],
    [23.008230, 72.549334],  # 41: Dharnidhar
    [23.005135, 72.552457],
    [23.003624, 72.554034]   # 43: Anjali Cross Road (End)
]

# ROUTE 1 STATION COORDINATE INDICES (for slicing accuracy)
# Maps station name to approximate index in ROUTE_1_FULL_TRACE
ROUTE_1_INDICES = {
    "ISKCON Cross Road": 0,
    "ISRO Colony": 5,
    "Star Bazaar": 15,
    "Jodhpur Char Rasta": 20,
    "Ramdev Nagar": 21,
    "Shivranjani": 30,
    "Jhansi Ki Rani": 32,
    "Nehrunagar": 34,
    "Manekbag": 38,
    "Dharnidhar Derasar": 41,
    "Anjali Cross Road": 43
}

# ROUTE 15: ISKCON Cross Road → Airport (Full High-Precision Trace)
ROUTE_15_FULL_TRACE = [
    [23.0271689591748, 72.50851750341766],   # 0: ISKCON Cross Road
    [23.027178236221317, 72.50892071328661],
    [23.027271006657216, 72.50954568858455],
    [23.027393102221635, 72.51052318893742],
    [23.027561649226196, 72.51210068604866],
    [23.027731, 72.517758],                  # 5: ISRO Colony
    [23.027650485922673, 72.51880687976286],
    [23.027587869888098, 72.51952066127206],
    [23.02741108031352, 72.52143022797524],
    [23.026786769387175, 72.52298005549104],
    [23.026466850999999, 72.52390160099999],  # 10: Star Bazaar
    [23.026178, 72.524171],
    [23.025815211003892, 72.52530700894486],
    [23.025199, 72.527388],                  # 13: Jodhpur Char Rasta
    [23.024981685701156, 72.52908936834825],
    [23.024810267152405, 72.53062169725476],
    [23.024641, 72.532089],
    [23.025156, 72.532958],
    [23.025872, 72.533694],
    [23.029735356028695, 72.53239012107093], # 19: Himmatlal Park
    [23.0321908, 72.5346893],
    [23.0346293, 72.5377768],
    [23.0375949, 72.5401882],
    [23.0398887065532, 72.53865002912585],   # 23: University
    [23.0421779, 72.5408788],
    [23.044548098, 72.5422348],
    [23.045547336007317, 72.54243339214219], # 26: Memnagar
    [23.0480485, 72.5442945],
    [23.0506896, 72.5463938],
    [23.052736811320898, 72.54681408496907], # 29: Sola Cross-Road
    [23.0553868, 72.5486819],
    [23.0573922, 72.5501926],
    [23.062205155157585, 72.55297099449686], # 32: Shastrinagar
    [23.0642542, 72.5553433],
    [23.06461206268891, 72.55602276456955],  # 34: Pragatinagar
    [23.0660652, 72.5597819],
    [23.067657096672463, 72.56575610643137], # 36: Akbarnagar
    [23.0673293, 72.5679939],
    [23.067700028201443, 72.574104939802],   # 38: Ranip Cross-Road
    [23.0686455, 72.5764903],
    [23.06889090440967, 72.5814969639411],   # 40: RTO Circle
    [23.0697247, 72.5868255],
    [23.0705696, 72.5917825],
    [23.0709747, 72.5945236],
    [23.071803, 72.604286],
    [23.0729008, 72.6100161],
    [23.0747516, 72.6168486],
    [23.0757438, 72.6210074],
    [23.054583554099153, 72.59092479057566],
    [23.054720663188192, 72.59093063411649],
    [23.054939768601884, 72.5909452429685],
    [23.058774124970412, 72.59094164668275],
    [23.05942082267326, 72.59098557440535],
    [23.059651528773088, 72.59106649440827],
    [23.059830186392333, 72.59124448596097],
    [23.060954235137004, 72.59280595730431],
    [23.061505090034302, 72.59382536346581],
    [23.062779574798142, 72.59669936878257],
    [23.063758779303228, 72.59883172939607],
    [23.063874767975065, 72.59906094633058],
    [23.06525555795622, 72.60002369439468],
    [23.067027116801526, 72.60064664902245],
    [23.07137775791759, 72.6032800481367],
    [23.076146664614512, 72.60730579890483],
    [23.078552324053916, 72.60936440255256],
    [23.07873620026365, 72.60970243795202],
    [23.081431065590934, 72.61604383999477],
    [23.081652502411146, 72.61616639017151],
    [23.081785046859537, 72.61636809994599],
    [23.081718774651677, 72.61654099403839],
    [23.081599484594506, 72.61655540188016],
    [23.081440431021164, 72.61658421756223],
    [23.081069305284387, 72.61678592733671],
    [23.079677574648272, 72.61775125268824],
    [23.078548752059405, 72.61847877672434],
    [23.077579089108795, 72.61897351797123],
    [23.077077800600193, 72.61925020328596],
    [23.076535545272023, 72.61957054058223],
    [23.07595792306155, 72.61991650486075],
    [23.075380298369524, 72.62044185802745],
    [23.07538118687566, 72.62063087225764],
    [23.075337619096544, 72.62069401464296],
    [23.075240801759577, 72.62072032397037],
    [23.075173029581734, 72.62073610956634],
    [23.07507621212629, 72.62084134687507],
    [23.074882577006306, 72.62103603589645],
    [23.074610834382568, 72.62133782274967],
    [23.07320873407882, 72.6228507204778],
    [23.073065452932923, 72.62290634171706],
    [23.072911937249586, 72.62293971446158],
    [23.07270724939994, 72.62292859021304],
    [23.072553733307785, 72.62287296897378],
    [23.072359279340688, 72.62271722950209],
    [23.07213519923083, 72.62246195544128],
    [23.07181793109845, 72.622128228002]    # 100: Airport (End)
]

# ROUTE 15 STATION COORDINATE INDICES
ROUTE_15_INDICES = {
    "ISKCON Cross Road": 0,
    "ISRO Colony": 5,
    "Star Bazaar": 11,
    "Jodhpur Char Rasta": 13,
    "Himmatlal Park": 19,
    "University": 23,
    "Memnagar": 26,
    "Sola Cross-Road": 29,
    "Shastrinagar": 32,
    "Pragatinagar": 34,
    "Akbarnagar": 36,
    "Ranip Cross-Road": 38,
    "RTO Circle": 40,
    "Ahmedabad Domestic Airport": 100
}

# ROUTE 7: Airport Circle → Vishwakarma College (Full High-Precision Trace)
ROUTE_7_FULL_TRACE = [
    [23.067693, 72.574044],    # 0: Airport Circle (Ranip start)
    [23.067753, 72.575951],
    [23.067738, 72.576863],
    [23.067798, 72.577727],
    [23.068173, 72.579356],
    [23.068487, 72.580790],
    [23.068723, 72.581368],
    [23.068933, 72.581824],
    [23.069023, 72.582232],
    [23.069233, 72.583079],
    [23.069353, 72.584089],
    [23.069458, 72.584953],
    [23.069413, 72.585931],
    [23.069383, 72.587039],
    [23.069830, 72.588982],
    [23.069992, 72.589290],
    [23.070448, 72.589685],
    [23.071211, 72.590212],
    [23.073211, 72.591768],    # 18: Hansol Turn
    [23.074506, 72.592818],
    [23.076260, 72.594200],
    [23.077179, 72.595019],
    [23.077602, 72.595160],
    [23.077967, 72.595160],
    [23.078297, 72.595096],
    [23.078604, 72.594930],
    [23.079169, 72.594508],
    [23.080664, 72.593573],
    [23.082218, 72.593074],
    [23.083819, 72.592549],
    [23.086056, 72.591833],    # 30: Bhat Village
    [23.089169, 72.590909],
    [23.090250, 72.590546],
    [23.094005, 72.589496],
    [23.097867, 72.588357],    # 34: Stadium Approach
    [23.098006, 72.588311],
    [23.098062, 72.588289],
    [23.098097, 72.588209],
    [23.098162, 72.588177],
    [23.098233, 72.588148],
    [23.098295, 72.588148],
    [23.098345, 72.588186],
    [23.098369, 72.588244],
    [23.098374, 72.588289],
    [23.098380, 72.588350],
    [23.098363, 72.588398],
    [23.098407, 72.588462],
    [23.098640, 72.588824],
    [23.099347, 72.589672],
    [23.100187, 72.590749],
    [23.100834, 72.591552],
    [23.103288, 72.594599],
    [23.104768, 72.596371]     # 52: Vishwakarma College (End)
]

# ROUTE 7 STATION COORDINATE INDICES
ROUTE_7_INDICES = {
    "Ranip Cross-Road": 0,
    "RTO Circle": 3,
    "Sabarmati Power-House": 12,
    "Sabarmati Police Station": 30,
    "Motera Cross-Road": 34,
    "Visat-Gandhinagar Junction": 35,
    "Vishwakarma Government Engineering College": 52
}

# ============================================================================
# 6. STATION COUNT (Number of stops per route)
# ============================================================================
ROUTE_STATIONS = {
    '1': 8,    # Route 1 has 8 stations (Extended: ISKCON to Anjali)
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
