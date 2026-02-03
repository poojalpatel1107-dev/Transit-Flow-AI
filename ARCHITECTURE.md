# 🏗️ Transit Flow AI - System Architecture

## Complete System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           TRANSIT FLOW AI                                │
│                      Smart Real-time Transit App                         │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React + Vite)                            │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌────────────────────┐  ┌──────────────────────────────────────────┐  │
│  │  AppEnhanced.jsx   │  │    State Management (Zustand Store)      │  │
│  │  (Main Container)  │  │  ───────────────────────────────────    │  │
│  └────────────────────┘  │  • Journey data                          │  │
│           │              │  • Bus location tracking                 │  │
│           │              │  • Transfer information                  │  │
│           │              │  • Recommendations                       │  │
│           │              │  • User location                         │  │
│           │              │  • AI insights                           │  │
│           │              └──────────────────────────────────────────┘  │
│           │                                                              │
│           ├─────────────────────────────────────────────────────────┐  │
│           │                    COMPONENTS                           │  │
│           │  ──────────────────────────────────────────────────── │  │
│           │                                                        │  │
│           ├──→ SearchBar.jsx                                       │  │
│           │    (Route selection)                                   │  │
│           │                                                        │  │
│           ├──→ MapWithRouteHighlight.jsx                           │  │
│           │    (Smart map - only selected route)                  │  │
│           │    • Route path visualization                         │  │
│           │    • Transfer station markers                         │  │
│           │    • Real-time bus location                           │  │
│           │                                                        │  │
│           ├──→ QuickInsightsPanel.jsx                              │  │
│           │    (Timetable + Transfer details)                     │  │
│           │    • Tabbed interface                                 │  │
│           │    • Segment breakdown                                │  │
│           │    • Transfer info                                    │  │
│           │                                                        │  │
│           ├──→ LiveProgressTracker.jsx                             │  │
│           │    (Uber-style progress)                              │  │
│           │    • Progress bar (0-100%)                            │  │
│           │    • Countdown timer                                  │  │
│           │    • Bus animation                                    │  │
│           │    • Segment metrics                                  │  │
│           │                                                        │  │
│           ├──→ NearestBusDetector.jsx                              │  │
│           │    (Find closest bus)                                 │  │
│           │    • Distance & ETA                                   │  │
│           │    • Occupancy bar                                    │  │
│           │    • Live status badge                                │  │
│           │                                                        │  │
│           └──→ AIRecommendations.jsx                               │  │
│                (Smart suggestions)                                 │  │
│                • Priority-based (HIGH/MED/LOW)                     │  │
│                • Actionable advice                                 │  │
│                • Confidence scores                                 │  │
│                                                                    │  │
│           └─────────────────────────────────────────────────────────┘  │
│                                                                           │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                    HTTP CLIENT (Fetch API)                         │ │
│  │  ───────────────────────────────────────────────────────────      │ │
│  │  Communicates with FastAPI backend                               │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
                              ↑↓ HTTP
┌──────────────────────────────────────────────────────────────────────────┐
│                       BACKEND (FastAPI + Python)                          │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                     Route Management APIs                          │ │
│  │  ───────────────────────────────────────────────────────────     │ │
│  │  • POST /api/calculate-journey                                   │ │
│  │    → Calculates multi-hop routes                                 │ │
│  │    → Detects transfers automatically                             │ │
│  │    → Returns path, segments, ETAs                                │ │
│  │                                                                   │ │
│  │  • GET /api/predict/{route_id}                                   │ │
│  │    → Physics-based predictions                                   │ │
│  │    → Crowd level, confidence score                               │ │
│  │                                                                   │ │
│  │  • GET /api/station-info                                         │ │
│  │    → System information                                          │ │
│  │    → Route details, operational params                           │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │              AI AGENT Module (ai_agent.py)                         │ │
│  │  ───────────────────────────────────────────────────────────     │ │
│  │  TransitAIAgent Class:                                           │ │
│  │                                                                   │ │
│  │  1. get_nearest_bus(lat, lng, route_id)                          │ │
│  │     → Finds closest bus with ETA                                 │ │
│  │     → Occupancy prediction                                       │ │
│  │     → Live status                                                │ │
│  │                                                                   │ │
│  │  2. get_live_bus_position(route_id, bus_id, progress%)           │ │
│  │     → Real-time GPS simulation                                   │ │
│  │     → Speed & direction                                          │ │
│  │     → Accuracy metrics                                           │ │
│  │                                                                   │ │
│  │  3. get_transfer_recommendations(origin, destination)            │ │
│  │     → Smart transfer advice                                      │ │
│  │     → Comfort level predictions                                  │ │
│  │     → Confidence scoring                                         │ │
│  │                                                                   │ │
│  │  4. predict_transfer_wait_time(station, from_route, to_route)    │ │
│  │     → Waits time estimation (2-8 min)                            │ │
│  │     → Amenity information                                        │ │
│  │     → Comfort recommendations                                    │ │
│  │                                                                   │ │
│  │  5. get_traffic_aware_eta(route_id, distance_km)                 │ │
│  │     → Dynamic ETA with confidence                                │ │
│  │     → Traffic factors applied                                    │ │
│  │     → Delay predictions                                          │ │
│  │                                                                   │ │
│  │  6. get_smart_boarding_time(route_id, station)                   │ │
│  │     → When to catch the bus                                      │ │
│  │     → Comfort-optimized                                          │ │
│  │     → Occupancy-aware                                            │ │
│  │                                                                   │ │
│  │  7. get_smart_recommendations(origin, destination)               │ │
│  │     → Holistic journey advice                                    │ │
│  │     → Priority-based (HIGH/MED/LOW)                              │ │
│  │     → Actionable suggestions                                     │ │
│  │                                                                   │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │          API Endpoints (FastAPI Routes)                            │ │
│  │  ───────────────────────────────────────────────────────────     │ │
│  │                                                                   │ │
│  │  NEW SMART ENDPOINTS (7 total):                                  │ │
│  │  • GET  /api/nearest-bus                                         │ │
│  │  • GET  /api/live-bus-position                                   │ │
│  │  • POST /api/transfer-recommendations                            │ │
│  │  • GET  /api/transfer-wait-time                                  │ │
│  │  • GET  /api/traffic-aware-eta                                   │ │
│  │  • GET  /api/smart-boarding-time                                 │ │
│  │  • POST /api/smart-recommendations                               │ │
│  │                                                                   │ │
│  │  EXISTING ENDPOINTS:                                             │ │
│  │  • POST /api/calculate-journey                                   │ │
│  │  • GET  /api/predict/{route_id}                                  │ │
│  │  • GET  /api/insight (origin-based ETA)                          │ │
│  │  • GET  /api/station-info                                        │ │
│  │                                                                   │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │          Data & Config Modules                                     │ │
│  │  ───────────────────────────────────────────────────────────     │ │
│  │  • janmarg_data.py                                               │ │
│  │    - Route definitions (1, 7, 15)                                │ │
│  │    - Station sequences (25+ stations)                            │ │
│  │    - GPS coordinates (full precision traces)                     │ │
│  │    - Distance data                                               │ │
│  │                                                                   │ │
│  │  • janmarg_config.py                                             │ │
│  │    - Operational parameters                                      │ │
│  │    - Peak hour definitions                                       │ │
│  │    - Traffic factors                                             │ │
│  │    - Headway calculations                                        │ │
│  │                                                                   │ │
│  │  • server.py                                                     │ │
│  │    - FastAPI app setup                                           │ │
│  │    - CORS configuration                                          │ │
│  │    - All route handlers                                          │ │
│  │                                                                   │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│                           DATA FLOW                                        │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  USER INTERACTION:                                                         │
│  1. Select "From" → "To" stations                                         │
│  2. Click "Search"                                                        │
│        │                                                                  │
│        ↓                                                                  │
│  FRONTEND (React):                                                        │
│  • Calls POST /api/calculate-journey {origin, destination}               │
│  • Stores journey data in Zustand store                                   │
│  • Renders route on map                                                   │
│  • Extracts transfer stations                                             │
│        │                                                                  │
│        ↓                                                                  │
│  BACKEND (FastAPI + AI):                                                  │
│  • Finds direct route OR multi-hop transfers                              │
│  • Calculates path coordinates                                            │
│  • Determines segments                                                    │
│  • Returns complete journey object                                        │
│        │                                                                  │
│        ↓                                                                  │
│  FRONTEND DISPLAY:                                                         │
│  • Left Panel: Map with route highlighting                                │
│  • Right Panel: Quick Insights (timetable + transfers)                    │
│  • Right Panel: AI Recommendations generated                              │
│  • Right Panel: Nearest Bus detected                                      │
│        │                                                                  │
│        ↓                                                                  │
│  USER STARTS TRACKING:                                                     │
│  • Clicks "Start Journey Tracking"                                        │
│  • Progress tracker replaces map                                          │
│  • Timer counts down                                                      │
│  • Bus animates along route                                               │
│  • Zustand updates position every second                                   │
│        │                                                                  │
│        ↓                                                                  │
│  CONTINUOUS UPDATES:                                                       │
│  • Nearest bus detector refreshes every 30 sec                            │
│  • Live bus position updated from AI agent                                │
│  • Progress bar and timer update in real-time                             │
│  • Transfer warnings shown when approaching                                │
│        │                                                                  │
│        ↓                                                                  │
│  JOURNEY COMPLETION:                                                       │
│  • Timer reaches 0, progress = 100%                                       │
│  • Tracking stops                                                         │
│  • Confirmation message shown                                             │
│  • Store resets for next journey                                          │
│                                                                            │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│                        TECHNOLOGY STACK                                    │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  FRONTEND:                          BACKEND:                              │
│  ├─ React 18                        ├─ FastAPI                            │
│  ├─ Vite 5                          ├─ Uvicorn                            │
│  ├─ React-Leaflet 4                 ├─ Python 3.x                         │
│  ├─ Leaflet 1.9                     └─ CORS Middleware                    │
│  ├─ Zustand 4.4                                                           │
│  ├─ Framer Motion 12                DEPLOYMENT:                           │
│  ├─ Lucide React                    ├─ http://localhost:8000 (API)        │
│  └─ Modern CSS3                     └─ http://localhost:3000 (UI)         │
│                                                                            │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│                      SMART FEATURES WORKFLOW                               │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ROUTE HIGHLIGHTING:                                                       │
│  Journey Object → Extract path → Plot on Leaflet → Show transfers        │
│                                                                            │
│  QUICK INSIGHTS:                                                           │
│  Journey Segments → Group by route → Calculate times → Display tabs       │
│                                                                            │
│  LIVE PROGRESS:                                                            │
│  Start button → Update timer & position every 1 sec → Animate path      │
│                                                                            │
│  NEAREST BUS:                                                              │
│  User location → Call AI agent → Find closest → Update every 30 sec      │
│                                                                            │
│  AI RECOMMENDATIONS:                                                       │
│  Journey data → AI agent → Priority ranking → Display with confidence    │
│                                                                            │
└──────────────────────────────────────────────────────────────────────────┘
```

## 🔄 State Management Flow (Zustand Store)

```
┌─────────────────────────────────────────────────────────────┐
│         useJourneyStore (Centralized State)                  │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  JOURNEY DATA:                                                │
│  • journey: { path, route_id, origin, destination, ...}    │
│  • originStation: string                                     │
│  • destinationStation: string                                │
│  • segments: [{route_id, from, to, distance, time}, ...]   │
│                                                               │
│  TRACKING STATE:                                              │
│  • isTracking: boolean                                       │
│  • currentSegmentIndex: number (0, 1, 2, ...)               │
│  • currentStationIndex: number                               │
│  • currentBusLocation: [lat, lng]                            │
│  • estimatedArrival: number (minutes)                        │
│                                                               │
│  TRANSFER INFO:                                               │
│  • transferStations: [{station, from_route, to_route}, ...] │
│  • nextTransferStation: string                               │
│  • nextTransferIn: number (minutes)                          │
│                                                               │
│  NEAREST BUS:                                                 │
│  • nearestBus: {route_id, distance, eta, occupancy, ...}   │
│  • userLocation: [lat, lng]                                  │
│                                                               │
│  AI INSIGHTS:                                                 │
│  • recommendations: [{priority, title, description}, ...]   │
│  • trafficAlert: string                                      │
│  • alternateRoutes: [...]                                    │
│                                                               │
│  ACTIONS:                                                     │
│  • setJourney(journey)                                       │
│  • startTracking()                                           │
│  • stopTracking()                                            │
│  • updateBusLocation(lat, lng)                               │
│  • setTransferStations(transfers)                            │
│  • reset()                                                    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
        ↑ Consumed by all components
        │
        ├─→ AppEnhanced (main orchestrator)
        ├─→ MapWithRouteHighlight (map rendering)
        ├─→ QuickInsightsPanel (timetable display)
        ├─→ LiveProgressTracker (progress tracking)
        ├─→ NearestBusDetector (bus detection)
        └─→ AIRecommendations (recommendations display)
```

## 🚀 API Request/Response Examples

```
REQUEST 1: Calculate Multi-hop Journey
─────────────────────────────────────────
POST /api/calculate-journey
Body: {
  "origin": "Anjali Cross Road",
  "destination": "Vishwakarma Government Engineering College"
}

RESPONSE:
{
  "path": [[23.003624, 72.554034], [23.002, 72.555], ...],
  "route_1": "1",
  "route_2": "15", 
  "route_3": "7",
  "transfer": true,
  "transfer_station_1": "ISKCON Cross Road",
  "transfer_station_2": "Ranip Cross-Road",
  "total_distance_km": 20.5,
  "eta_minutes": 35,
  "segments": [...]
}

REQUEST 2: Get Smart Recommendations
──────────────────────────────────────
POST /api/smart-recommendations
Body: {
  "origin": "Anjali Cross Road",
  "destination": "Vishwakarma Government Engineering College"
}

RESPONSE:
[
  {
    "priority": "HIGH",
    "title": "🚌 OPTIMAL BOARDING",
    "description": "Catch next bus in ~3 min (45% occupancy)",
    "action": "Head to nearest stop NOW",
    "icon": "⏱️"
  },
  {
    "priority": "MEDIUM",
    "title": "🔄 SMART TRANSFER",
    "description": "Use ISKCON Cross Road (covered platform, WiFi)",
    "action": "Wait ~5-8 min, use waiting area",
    "icon": "🏢"
  },
  ...
]

REQUEST 3: Find Nearest Bus
────────────────────────────
GET /api/nearest-bus?user_lat=23.027&user_lng=72.508

RESPONSE:
{
  "bus_id": "BUS-R1-234",
  "route_id": "1",
  "distance_km": 2.5,
  "eta_minutes": 8,
  "location": [23.029, 72.510],
  "occupancy_percent": 45,
  "heading": "approaching_your_route"
}
```

---

**This architecture supports:**
- ✅ Real-time tracking
- ✅ Multi-hop routing
- ✅ AI predictions
- ✅ Scalability
- ✅ Clean separation of concerns
- ✅ Easy feature additions
