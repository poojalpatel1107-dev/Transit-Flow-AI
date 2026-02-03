# 🚌 Transit Flow AI - Smart Real-time Transit Platform

**Advanced AI-powered bus transit application with real-time tracking, smart recommendations, and intelligent route planning.**

✨ **v2.0 - Now with 8 game-changing smart features!**

Real-time BRTS tracking system with AI-powered predictions using React + Python FastAPI.

## 🎯 What's New in v2.0

### 🌟 8 Major Smart Features
1. **Smart Route Highlighting** - Only your selected route on map
2. **Quick Insights Panel** - Timetable + transfer details
3. **Live Progress Tracker** - Uber-style real-time tracking
4. **Nearest Bus Detector** - Find closest bus with ETA
5. **AI Recommendations** - Smart suggestions for your journey
6. **Backend AI Agent** - Intelligent predictions & analysis
7. **State Management** - Real-time updates with Zustand
8. **Professional UI/UX** - Animated, responsive interface

### 🔧 What It Does
- Shows **ONLY your selected route** on the map (no clutter)
- Displays **transfer stations with amenities & wait times**
- Tracks **bus movement in real-time** (like Uber!)
- Generates **AI-powered smart recommendations**
- Handles **multi-hop routes** automatically
- Shows **occupancy levels** with comfort scoring
- Works on **mobile, tablet, desktop**
- **Fully responsive & production-ready**

### 📊 Quick Stats
- **6 new React components**
- **7 new smart API endpoints**
- **1 AI Agent module** (intelligent predictions)
- **1 Zustand store** (centralized state)
- **2500+ lines of code** added
- **100% feature complete**

## 🏗️ Architecture

```
Frontend (React + Vite)  ←→  Backend (FastAPI)
     localhost:3000            localhost:8000
```

## 🚀 Quick Start

### Prerequisites
- Node.js (v18+)
- Python (v3.8+)
- pip

### 1. Install Dependencies

**Frontend:**
```bash
npm install
```

**Backend:**
```bash
cd backend
pip install -r requirements.txt
cd ..
```

### 2. Start the Application

**Option A: Start Both Servers Separately**

Terminal 1 (Backend):
```bash
cd backend
python server.py
```

Terminal 2 (Frontend):
```bash
npm run dev
```

**Option B: Use the Startup Script (Windows)**
```bash
./start-app.bat
```

**Option C: Use the Startup Script (Unix/Mac)**
```bash
chmod +x start-app.sh
./start-app.sh
```

### 3. Access the Application

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs

## 📡 API Integration

The React frontend communicates with the Python backend through:

**Service Layer:** `src/services/AIAgent.js`
```javascript
import { fetchRouteAnalytics } from './services/AIAgent'

const data = await fetchRouteAnalytics('1')  // Get Route 1 predictions
```

**API Endpoint:** `GET /api/predict/{route_id}`
```json
{
  "route_id": "1",
  "arrival_time": "12 min",
  "crowd_level": "High (CRITICAL)",
  "status": "Heavy Traffic",
  "confidence": "92%",
  "timestamp": "2026-02-02T17:30:00"
}
```

## 🤖 AI Features

- **Real-time Crowd Prediction:** Based on time-of-day analysis
- **Dynamic ETA Calculation:** Traffic simulation with noise
- **Confidence Scoring:** Prediction reliability metrics
- **Graceful Degradation:** Offline mode when backend is unavailable

## 🗺️ Routes

- **Route 1:** Shivranjani → ISKCON (Red Line)
- **Route 15:** ISKCON → Airport (Blue Line)
- **Route 7:** Ranip → Engineering College (Purple Line)

## 🛠️ Development

### Backend Development
```bash
cd backend
uvicorn server:app --reload
```

### Frontend Development
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```

## 📦 Tech Stack

**Frontend:**
- React 18
- Vite
- Leaflet (Maps)
- Framer Motion (Animations)
- Lucide React (Icons)

**Backend:**
- FastAPI
- Uvicorn
- Python 3.8+

## 🐛 Troubleshooting

**Backend not connecting?**
- Check if Python server is running on port 8000
- Verify CORS is enabled in `backend/server.py`
- Look for errors in the terminal running the backend

**Frontend shows "Offline Mode"?**
- Backend server might be down
- Check `http://localhost:8000/api/health`
- Restart the Python server

**Port already in use?**
- Frontend: Change port in `vite.config.js`
- Backend: Modify port in `backend/server.py`

## 📄 License

MIT License

## 👨‍💻 Author

Poojal Patel
