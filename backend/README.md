# Transit Flow AI - Backend Server

Python FastAPI backend for real-time transit predictions and AI analytics.

## Setup

1. **Install Python dependencies:**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Run the server:**
   ```bash
   python server.py
   ```

   Or with uvicorn directly:
   ```bash
   uvicorn server:app --reload --host 0.0.0.0 --port 8000
   ```

3. **Server will start at:** `http://localhost:8000`

## API Endpoints

### GET `/`
Health check - Returns server status

### GET `/api/predict/{route_id}`
Get AI predictions for a specific route
- **Parameters:** `route_id` - Route identifier ('1', '15', or '7')
- **Returns:** 
  ```json
  {
    "route_id": "1",
    "arrival_time": "12 min",
    "crowd_level": "Moderate",
    "status": "Normal Flow",
    "confidence": "87%",
    "timestamp": "2026-02-02T17:30:00",
    "current_hour": 17
  }
  ```

### GET `/api/health`
Backend health check endpoint

## AI Logic

- **Crowd Prediction:** Based on time of day analysis
  - Peak hours (8-11 AM, 5-8 PM): High (CRITICAL)
  - Midday (12-4 PM): Moderate
  - Off-peak: Low

- **Arrival Time:** Base time + traffic noise simulation
  - Route 1: 10 min base
  - Route 15: 25 min base
  - Route 7: 18 min base

## CORS Configuration

CORS is enabled for all origins to allow the React frontend to communicate with the backend.
