"""
🤖 AI AGENT MODULE - Smart Transit Intelligence Engine
Provides intelligent recommendations, real-time tracking, and traffic-aware predictions
"""

from datetime import datetime
from janmarg_data import (
    COMMERCIAL_SPEED_KMH,
    DWELL_TIME_SEC,
    HEADWAY_PEAK,
    HEADWAY_OFFPEAK,
    PEAK_HOURS_MORNING,
    PEAK_HOURS_EVENING,
    ROUTE_1_STOPS,
    ROUTE_7_STOPS,
    ROUTE_15_STOPS,
    ROUTE_1_FULL_TRACE,
    ROUTE_7_FULL_TRACE,
    ROUTE_15_FULL_TRACE,
    ROUTE_1_INDICES,
    ROUTE_7_INDICES,
    ROUTE_15_INDICES
)
import random
import math


class TransitAIAgent:
    """Smart AI agent for transit predictions and recommendations"""

    @staticmethod
    def _haversine_km(a, b):
        lat1, lon1 = a
        lat2, lon2 = b
        r = 6371.0
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        lat1 = math.radians(lat1)
        lat2 = math.radians(lat2)

        h = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
        return 2 * r * math.atan2(math.sqrt(h), math.sqrt(1 - h))

    @staticmethod
    def _station_points():
        route_defs = {
            "1": (ROUTE_1_STOPS, ROUTE_1_INDICES, ROUTE_1_FULL_TRACE),
            "7": (ROUTE_7_STOPS, ROUTE_7_INDICES, ROUTE_7_FULL_TRACE),
            "15": (ROUTE_15_STOPS, ROUTE_15_INDICES, ROUTE_15_FULL_TRACE)
        }

        points = []
        for route_id, (stops, indices, trace) in route_defs.items():
            for stop in stops:
                idx = indices.get(stop)
                if idx is None or idx >= len(trace):
                    continue
                points.append({
                    "route_id": route_id,
                    "station": stop,
                    "location": trace[idx]
                })
        return points

    @staticmethod
    def get_nearest_bus(user_lat, user_lng, user_route_id=None):
        """
        Find the nearest bus to user's current location
        
        Args:
            user_lat: User latitude
            user_lng: User longitude
            user_route_id: Optional - only find buses on this route
        
        Returns:
            {
                "bus_id": "BUS-001",
                "route_id": "1",
                "distance_km": 2.5,
                "eta_minutes": 8,
                "location": [lat, lng],
                "heading": "approaching_your_route"
            }
        """
        current_hour = datetime.now().hour
        
        user_point = [user_lat, user_lng]
        stations = TransitAIAgent._station_points()

        if user_route_id:
            stations = [s for s in stations if s["route_id"] == user_route_id]

        if not stations:
            return {
                "bus_id": None,
                "route_id": None,
                "distance_km": None,
                "eta_minutes": None,
                "location": None,
                "heading": "unavailable",
                "occupancy_percent": None,
                "timestamp": datetime.now().isoformat(),
                "station_name": None
            }

        # Find nearest station from predefined stops
        nearest = min(
            stations,
            key=lambda s: TransitAIAgent._haversine_km(user_point, s["location"])
        )

        distance_km = round(TransitAIAgent._haversine_km(user_point, nearest["location"]), 2)
        
        # Calculate ETA based on distance
        eta_minutes = round((distance_km / COMMERCIAL_SPEED_KMH) * 60 + random.uniform(1, 3))
        
        return {
            "bus_id": f"BUS-R{nearest['route_id']}-{random.randint(100, 999)}",
            "route_id": nearest["route_id"],
            "distance_km": distance_km,
            "eta_minutes": eta_minutes,
            "location": nearest["location"],
            "heading": "approaching_your_route" if distance_km < 2 else "in_transit",
            "occupancy_percent": round(random.uniform(30, 85)),
            "station_name": nearest["station"],
            "timestamp": datetime.now().isoformat()
        }

    @staticmethod
    def get_live_bus_position(route_id, bus_id, current_progress_percent):
        """
        Get simulated live position of a bus with realistic movement
        
        Args:
            route_id: Route identifier
            bus_id: Bus identifier
            current_progress_percent: 0-100, how far along the route
        
        Returns:
            {
                "bus_id": "BUS-001",
                "route_id": "1",
                "location": [lat, lng],
                "speed_kmh": 25,
                "last_station": "ISKCON Cross Road",
                "next_station": "ISRO Colony",
                "progress_percent": 5,
                "timestamp": "2026-02-03T15:30:45"
            }
        """
        # Route reference points (simplified)
        route_centers = {
            "1": {"start": [23.027159, 72.508525], "end": [23.003624, 72.554034]},
            "7": {"start": [23.109374, 72.596374], "end": [23.104768, 72.596371]},
            "15": {"start": [23.027159, 72.508525], "end": [23.188333, 72.778125]}
        }
        
        center = route_centers.get(route_id, route_centers["1"])
        progress = current_progress_percent / 100.0
        
        # Interpolate position along route
        lat = center["start"][0] + (center["end"][0] - center["start"][0]) * progress
        lng = center["start"][1] + (center["end"][1] - center["start"][1]) * progress
        
        # Simulate speed with traffic variation
        base_speed = COMMERCIAL_SPEED_KMH
        current_hour = datetime.now().hour
        is_peak = (PEAK_HOURS_MORNING[0] <= current_hour < PEAK_HOURS_MORNING[1] or
                   PEAK_HOURS_EVENING[0] <= current_hour < PEAK_HOURS_EVENING[1])
        
        speed = base_speed * (0.7 if is_peak else 1.0) + random.uniform(-2, 2)
        
        return {
            "bus_id": bus_id,
            "route_id": route_id,
            "location": [round(lat, 6), round(lng, 6)],
            "speed_kmh": round(speed, 1),
            "accuracy_meters": random.randint(5, 15),
            "progress_percent": current_progress_percent,
            "timestamp": datetime.now().isoformat()
        }

    @staticmethod
    def get_transfer_recommendations(origin, destination, current_hour=None):
        """
        Smart transfer recommendations for multi-hop journeys
        
        Returns:
            [
                {
                    "segment": 1,
                    "from_station": "ISKCON",
                    "to_station": "Jodhpur Char Rasta",
                    "route_id": "1",
                    "best_time_to_board": "Next bus in 3 minutes",
                    "alternative_time": "Bus in 12 minutes (more spacious)",
                    "distance_km": 3.2,
                    "duration_minutes": 8,
                    "comfort_level": "High (less crowded)"
                }
            ]
        """
        if current_hour is None:
            current_hour = datetime.now().hour
        
        is_peak = (PEAK_HOURS_MORNING[0] <= current_hour < PEAK_HOURS_MORNING[1] or
                   PEAK_HOURS_EVENING[0] <= current_hour < PEAK_HOURS_EVENING[1])
        
        headway = HEADWAY_PEAK if is_peak else HEADWAY_OFFPEAK
        
        recommendations = [
            {
                "segment": 1,
                "advice": "BEST TIME: Wait for next bus (3 min) - Lower crowd expected",
                "reasoning": "Bus approaching with 60% occupancy vs 85% for alternative",
                "crowd_level": "Moderate (60%)",
                "estimated_wait": 3,
                "confidence": 0.92
            },
            {
                "segment": 2,
                "advice": "TRANSFER: Use Ranip Cross-Road station (indoor waiting area)",
                "reasoning": "Covered platform available, nearest rest point",
                "transfer_station": "Ranip Cross-Road",
                "waiting_comfort": "High (seating + WiFi)",
                "confidence": 0.88
            },
            {
                "segment": 3,
                "advice": "FINAL LEG: Direct route, no additional transfers",
                "reasoning": "Route 7 operates every 8 minutes in off-peak hours",
                "next_bus_eta": 5,
                "confidence": 0.95
            }
        ]
        
        return recommendations

    @staticmethod
    def predict_transfer_wait_time(transfer_station, from_route, to_route, current_hour=None):
        """
        Predict waiting time at transfer station
        
        Returns:
            {
                "station": "Ranip Cross-Road",
                "wait_minutes": 4,
                "wait_range": "2-6",
                "confidence": 0.88,
                "recommendation": "Grab coffee at nearby shop",
                "amenities": ["Waiting Area", "Bathroom", "Water Fountain", "Shop"]
            }
        """
        if current_hour is None:
            current_hour = datetime.now().hour
        
        is_peak = (PEAK_HOURS_MORNING[0] <= current_hour < PEAK_HOURS_MORNING[1] or
                   PEAK_HOURS_EVENING[0] <= current_hour < PEAK_HOURS_EVENING[1])
        
        headway = HEADWAY_PEAK if is_peak else HEADWAY_OFFPEAK
        
        # Random wait between 0 and headway
        wait_minutes = round(random.uniform(0.5, headway), 1)
        
        return {
            "station": transfer_station,
            "from_route": from_route,
            "to_route": to_route,
            "wait_minutes": wait_minutes,
            "wait_range": f"{max(0.5, wait_minutes - 1.5):.1f}-{wait_minutes + 1.5:.1f}",
            "confidence": round(random.uniform(0.75, 0.95), 2),
            "recommendation": "Stretch legs and refresh" if wait_minutes > 5 else "Be ready to board",
            "amenities": ["Waiting Area", "Bathroom", "Water Fountain", "Shop"],
            "timestamp": datetime.now().isoformat()
        }

    @staticmethod
    def get_traffic_aware_eta(route_id, origin_idx, destination_idx, distance_km=None):
        """
        Get traffic-aware ETA with confidence score
        
        Returns:
            {
                "eta_minutes": 18,
                "eta_range": "15-22",
                "confidence": 0.92,
                "traffic_condition": "Light",
                "delay_minutes": 0,
                "speed_kmh": 26,
                "factors": ["Light traffic", "Bus not crowded", "No accidents reported"]
            }
        """
        current_hour = datetime.now().hour
        
        is_peak = (PEAK_HOURS_MORNING[0] <= current_hour < PEAK_HOURS_MORNING[1] or
                   PEAK_HOURS_EVENING[0] <= current_hour < PEAK_HOURS_EVENING[1])
        
        if distance_km is None:
            distance_km = 5.0  # default
        
        # Base ETA
        base_eta = (distance_km / COMMERCIAL_SPEED_KMH) * 60
        
        # Apply traffic factor
        if is_peak:
            traffic_factor = 1.4
            traffic_condition = "Heavy"
            confidence = 0.75
        elif 12 <= current_hour < 17:
            traffic_factor = 1.15
            traffic_condition = "Moderate"
            confidence = 0.85
        else:
            traffic_factor = 1.0
            traffic_condition = "Light"
            confidence = 0.92
        
        eta_minutes = round(base_eta * traffic_factor)
        delay = round((eta_minutes - base_eta) * 0.7)  # Some of the factor is natural variation
        
        factors = []
        if is_peak:
            factors.append("Peak hour traffic")
        factors.append(f"{traffic_condition.lower()} traffic")
        if delay > 2:
            factors.append(f"Estimated {delay} min delay")
        
        return {
            "route_id": route_id,
            "eta_minutes": eta_minutes,
            "eta_range": f"{max(5, eta_minutes - 3)}-{eta_minutes + 3}",
            "confidence": confidence,
            "traffic_condition": traffic_condition,
            "delay_minutes": delay,
            "speed_kmh": round(COMMERCIAL_SPEED_KMH * (1 / traffic_factor), 1),
            "factors": factors,
            "timestamp": datetime.now().isoformat()
        }

    @staticmethod
    def get_smart_boarding_time(route_id, origin_station, current_hour=None):
        """
        Recommend smart time to catch bus (real-time)
        
        Returns:
            {
                "recommendation": "Catch next bus NOW",
                "reason": "High comfort score, arriving in 3 minutes",
                "bus_eta": 3,
                "occupancy_percent": 45,
                "wait_if_miss": 8,
                "comfort_score": 8.5,
                "confidence": 0.9
            }
        """
        if current_hour is None:
            current_hour = datetime.now().hour
        
        is_peak = (PEAK_HOURS_MORNING[0] <= current_hour < PEAK_HOURS_MORNING[1] or
                   PEAK_HOURS_EVENING[0] <= current_hour < PEAK_HOURS_EVENING[1])
        
        headway = HEADWAY_PEAK if is_peak else HEADWAY_OFFPEAK
        
        next_bus_eta = round(random.uniform(1, headway * 0.8), 1)
        bus_after_eta = round(next_bus_eta + headway, 1)
        occupancy = round(random.uniform(30, 80))
        
        # Comfort score (0-10)
        comfort_score = 10 - (occupancy / 10)
        
        if next_bus_eta <= 3:
            recommendation = "Catch NEXT bus NOW!"
            reason = f"High comfort ({10 - occupancy/10:.1f}/10), arriving in {next_bus_eta} min"
        elif occupancy > 70:
            recommendation = "Wait for bus after next"
            reason = f"Avoid crowding. {bus_after_eta} min wait for {9 - occupancy/10:.1f}/10 comfort"
        else:
            recommendation = "Next bus is good"
            reason = f"Decent comfort ({10 - occupancy/10:.1f}/10), arrive in {next_bus_eta} min"
        
        return {
            "recommendation": recommendation,
            "reason": reason,
            "route_id": route_id,
            "station": origin_station,
            "next_bus_eta": next_bus_eta,
            "bus_after_next_eta": bus_after_eta,
            "occupancy_percent": occupancy,
            "comfort_score": round(comfort_score, 1),
            "confidence": 0.88,
            "timestamp": datetime.now().isoformat()
        }

    @staticmethod
    def get_smart_recommendations(origin, destination, journey_data=None):
        """
        Generate holistic smart recommendations for the entire journey
        
        Returns:
            [
                {
                    "priority": "HIGH",
                    "title": "Optimal Boarding Strategy",
                    "description": "Catch next Route 1 bus - arrives in 3 min with 45% occupancy",
                    "action": "Head to nearest stop",
                    "icon": "🚌"
                },
                {
                    "priority": "MEDIUM",
                    "title": "Smart Transfer Point",
                    "description": "Use Jodhpur Char Rasta - covered waiting area + shops",
                    "action": "Transfer estimated 8 minutes later",
                    "icon": "🔄"
                }
            ]
        """
        current_hour = datetime.now().hour

        # Prefer actual journey transfer stations when available
        transfer_station_1 = None
        transfer_station_2 = None
        if isinstance(journey_data, dict) and journey_data.get("transfer"):
            transfer_station_1 = journey_data.get("transfer_station_1") or journey_data.get("transfer_station")
            transfer_station_2 = journey_data.get("transfer_station_2")

        if transfer_station_1 and transfer_station_2:
            transfer_description = f"Use {transfer_station_1} then {transfer_station_2} for transfers"
            transfer_action = "Wait ~5-8 min at each transfer point"
        elif transfer_station_1:
            transfer_description = f"Use {transfer_station_1} for transfer (covered platform, WiFi)"
            transfer_action = "Wait ~5-8 min, use waiting area"
        else:
            transfer_description = "Use ISKCON Cross Road for transfer (covered platform, WiFi)"
            transfer_action = "Wait ~5-8 min, use waiting area"
        
        recommendations = [
            {
                "priority": "HIGH",
                "title": "🚌 OPTIMAL BOARDING",
                "description": f"Catch next bus in ~3 min (45% occupancy - Very Comfortable)",
                "action": "Head to nearest stop NOW",
                "eta": 3,
                "icon": "⏱️"
            },
            {
                "priority": "MEDIUM",
                "title": "🔄 SMART TRANSFER",
                "description": transfer_description,
                "action": transfer_action,
                "icon": "🏢"
            },
            {
                "priority": "MEDIUM",
                "title": "⚡ ROUTE OPTIMIZATION",
                "description": "Direct 2-hop journey: Route 1→15→7 (Most efficient)",
                "total_time": "~35 mins",
                "icon": "✅"
            },
            {
                "priority": "LOW",
                "title": "💡 TRAVEL TIP",
                "description": "Off-peak hours - light traffic expected, no delays",
                "action": "Good conditions for this journey",
                "icon": "🌟"
            }
        ]
        
        return recommendations


# Initialize agent
transit_ai = TransitAIAgent()
