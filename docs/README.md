# Transit-Flow AI - Complete Documentation

A real-time BRTS (Bus Rapid Transit System) navigation application for Ahmedabad with AI-powered insights, live ETA tracking, and smart route optimization.

---

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture](#architecture)
3. [Features](#features)
4. [Core Systems](#core-systems)
5. [API Integration](#api-integration)
6. [Project Structure](#project-structure)
7. [Development Guide](#development-guide)

---

## 🚀 Quick Start

### Prerequisites
- Node.js (v18+)
- Python (v3.8+)
- pip

### Installation & Launch

**Backend Setup:**
```bash
cd backend
pip install -r requirements.txt
python server.py
```

**Frontend Setup (new terminal):**
```bash
npm install
npm run dev
```

Access the app at `http://localhost:3000`
Backend API at `http://localhost:8000`

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│         Frontend (React 18 + Vite)              │
│  localhost:3000 - Leaflet Maps, Real-time UI    │
└──────────────────┬──────────────────────────────┘
                   │ HTTP/REST
┌──────────────────▼──────────────────────────────┐
│       Backend (Python FastAPI + Uvicorn)        │
│  localhost:8000 - Route Analysis, ETA Calc      │
└─────────────────────────────────────────────────┘
```

### Technology Stack

**Frontend:**
- React 18 with Hooks
- Vite 5.4 (Build tool)
- React-Leaflet (Map visualization)
- Framer Motion (Animations)
- CartoDB Voyager (Map tiles)
- Lucide React (Icons)

**Backend:**
- Python FastAPI
- Uvicorn (ASGI server)
- Haversine Distance Calculations
- Real-time Analytics

**Data:**
- Route coordinates (GPS-based)
- Station metadata (names, coordinates)
- Dynamic bus load/crowd data
- Frequency patterns (2.5-3 min intervals)

---

## ✨ Features

### User Interface
- **Startup Welcome Screen** - Centered overlay with station selection
- **Real-time Route Visualization** - Solid & dashed lines for transfers
- **Interactive Map** - Click stations for analytics
- **Live ETA Display** - Dynamic countdown based on bus position
- **Dynamic Status** - "APPROACHING", "En Route", "Bus Left"
- **Smart Transfer Detection** - Auto-finds multi-route journeys

### Route Management
- **3 Active Routes** - Route 1, Route 15, Route 7
- **Multi-route Transfer Logic** - Automatic connection finding
- **Route Direction Handling** - Forward (D) and Reverse (U) directions
- **Station Highlighting** - Color-coded by route

### Bus Tracking
- **Real-time Bus Animation** - 1-second interval updates
- **Stop-and-Go Logic** - 3-second pause at stations
- **Distance-based ETA** - Geographic calculations (12 km/h effective speed)
- **Occupancy Monitoring** - Dynamic comfort level (0-100%)
- **Crowd Prediction** - Next hour density graph

### AI & Analytics
- **Origin-based ETA** - Calculates time to your boarding station
- **Next Bus Frequency** - 2.5-3 minute intervals
- **Route Recommendations** - Suggests better routes based on comfort
- **Crowd Analysis** - Standing room, mixed, or seating available

---

## 🔧 Core Systems

### 1. Route Finding Algorithm
**Location:** `src/App.jsx` (findRoute function, lines 815-1020)

**Logic:**
1. Checks for direct routes (origin & destination on same route)
2. If not found, searches for transfer routes
3. Finds common transfer stations between route pairs
4. Validates direction of travel correctness
5. Sets map center and displays route with stations

**Key Variables:**
- `selectedRoute` - Currently active route (1, 15, 7)
- `routeDirection` - Forward (D) or Reverse (U)
- `segmentCoordinates` - Path between origin and destination
- `transferStation` - Connection point for multi-route journeys

### 2. ETA Calculation System
**Location:** `src/App.jsx` (lines 1127-1195)

**Distance-Based Calculation:**
```javascript
Distance to Station (km) / 0.2 km/min = ETA (minutes)
// 0.2 km/min ≈ 12 km/h (realistic with stops/traffic)
```

**Status Logic:**
- **APPROACHING** - Within 0.5 km before station
- **En Route** - Normal transit (2-20 min)
- **Bus Left** - Passed station, show next bus based on frequency
- **Frequency** - 2.5 min (Route 1), 3 min (Route 15)

### 3. Bus Animation Engine
**Location:** `src/App.jsx` (useEffect from line ~400)

**Features:**
- requestAnimationFrame for smooth movement
- Stop-and-go at stations (3-second pause)
- Direction-aware animation (forward/reverse)
- Haversine distance calculation between waypoints
- Speed-factor: 0.011 meters/millisecond

### 4. Station & Route Database
**Location:** `src/RouteCoordinates.js`

**Structure:**
```javascript
ROUTE_MAP = {
  '1': STATIONS,           // Route 1 stations
  '15': ROUTE_15_STATIONS, // Route 15 stations  
  '7': ROUTE_7_STATIONS    // Route 7 stations
}

UNIQUE_STATIONS = [...new Set([...STATIONS, ...ROUTE_15_STATIONS, ...ROUTE_7_STATIONS].map(s => s.name))]
```

### 5. Occupancy Management
**Location:** `src/App.jsx` (busData object, line ~130)

**Load Calculation:**
```javascript
getBusLoad(hour) {
  if (hour >= 8 && hour <= 11) return 85 + Math.random() * 11      // Morning peak
  if (hour >= 12 && hour <= 16) return 40 + Math.random() * 21     // Afternoon
  if (hour >= 17 && hour <= 20) return 90 + Math.random() * 6      // Evening peak
  return 30 + Math.random() * 21                                    // Off-peak
}
```

**Comfort Levels:**
- 0-33% - 🟢 Green (Seating Available)
- 33-66% - 🟡 Yellow (Mixed)
- 66-100% - 🔴 Red (Standing)

---

## 🔌 API Integration

### Backend Endpoints

**GET `/route-analytics/{route_id}`**
- Returns crowd data, comfort levels, and frequency info
- Used for insights panel

**POST `/route-insight`**
- Accepts: `origin_station`, `route_id`
- Returns: ETA, crowd status, next bus time
- Example:
```json
{
  "origin_station": "ISRO Colony",
  "route_id": "15",
  "eta": "5 min",
  "crowd": "High (Standing)",
  "next_bus_in": "2.5 min"
}
```

### Communication Flow
```
User selects route → Frontend calls findRoute() 
  → Backend /route-insight 
  → Returns insight data 
  → Updates panel with ETA/crowd/comfort
```

---

## 📁 Project Structure

```
transit-flow ai/
├── src/
│   ├── App.jsx              # Main app (2821 lines)
│   ├── App.css              # Styling
│   ├── main.jsx             # Entry point
│   ├── index.css            # Global styles
│   ├── RouteCoordinates.js  # Route & station data
│   ├── services/
│   │   └── AIAgent.js       # Backend API calls
│   └── components/
│       ├── CommutInsights.jsx
│       ├── SearchBar.jsx
│       └── FixMap.jsx
├── backend/
│   ├── server.py            # FastAPI server
│   └── requirements.txt
├── docs/                    # Consolidated documentation
├── index.html
├── package.json
├── vite.config.js
└── README.md (root)
```

---

## 👨‍💻 Development Guide

### Adding a New Route

**Step 1:** Add route coordinates in `src/RouteCoordinates.js`
```javascript
export const ROUTE_NEW_COORDINATES = [
  [lat1, lon1], [lat2, lon2], ...
]
```

**Step 2:** Add stations
```javascript
export const ROUTE_NEW_STATIONS = [
  { id: 1, name: "Station A", coords: [lat, lon] },
  { id: 2, name: "Station B", coords: [lat, lon] },
  ...
]
```

**Step 3:** Update ROUTE_MAP in `src/App.jsx`
```javascript
const ROUTE_MAP = {
  '1': STATIONS,
  '15': ROUTE_15_STATIONS,
  'NEW': ROUTE_NEW_STATIONS
}
```

**Step 4:** Update route colors and data
```javascript
const busData = {
  'NEW': {
    name: 'New Route',
    color: '#newcolor',
    load: 50,
    baseTime: 15
  }
}
```

### Modifying ETA Behavior

**Threshold for "APPROACHING":** Line 1180
```javascript
if (distToOriginKm < 0.5 && activeProgress < estimatedOriginProgress) {
  // Change 0.5 to adjust proximity threshold
}
```

**Speed Factor:** Line 1175
```javascript
const etaFromDistance = Math.ceil(distToOriginKm / 0.2)
// Change 0.2 to adjust speed (lower = faster ETA)
```

### Debugging

**Check ETA Calculation:**
- Open browser console (F12)
- Select route and origin station
- Check `busStatusMessage`, `etaMinutes`, `isApproaching`

**Verify Route Finding:**
- Search console for `findRoute` function calls
- Check `foundRoute` variable and transfer station logic

**Monitor Bus Animation:**
- Check `bus1Progress`, `bus15Progress` values
- Should increment from 0 to 1 continuously

---

## 🎨 UI Components

### Top Search Bar
- Real-time search with datalist
- Origin/destination inputs
- "Find Bus" action button

### Startup Screen
- Centered card overlay
- Two station inputs with full list
- Feature grid (Real-Time, AI, Live Updates)
- Professional glassmorphic design

### Insights Panel
- Transfer indicator (orange banner)
- Bus status (EN ROUTE, APPROACHING, LEFT)
- ETA countdown (dynamic, color-coded)
- Crowd level assessment
- Comfort meter with sparkline
- Route switching button (if alternative exists)

### Station Info Card
- Shows station name and analytics
- Frequency and crowd data
- Click-activated from map

---

## 🐛 Known Issues & Fixes

### Issue: ETA shows wrong time for nearby stations
**Fix:** Adjusted speed factor to 0.2 km/min (realistic 12 km/h)

### Issue: Transfer button showing when no alternative route
**Fix:** Added validation to check if alternate route has both origin & destination

### Issue: Bus appears far but says "approaching"
**Fix:** Tightened threshold from 0.05 (5%) to 0.02 (2%)

---

## 📊 Performance Notes

- **Bus Animation:** 60 FPS with requestAnimationFrame
- **Map Tiles:** CartoDB Voyager (lightweight)
- **Route Rendering:** Optimized polylines
- **State Updates:** React hooks minimize re-renders
- **API Calls:** Debounced with 50-500ms delays

---

## 🔒 Future Enhancements

- [ ] Real GPS tracking integration
- [ ] User location detection
- [ ] Push notifications for upcoming buses
- [ ] Ticket booking system
- [ ] Multi-city support
- [ ] Dark/Light theme toggle
- [ ] Offline route caching
- [ ] Historical data analytics

---

## 📞 Support

**Frontend Issues:** Check `src/App.jsx` main component
**Backend Issues:** Check `backend/server.py` FastAPI routes
**Route Data:** Check `src/RouteCoordinates.js` station/coordinate data

---

**Last Updated:** February 3, 2026
**Version:** 1.0.0
**Status:** Production Ready ✅
