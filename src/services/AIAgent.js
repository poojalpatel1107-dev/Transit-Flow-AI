/**
 * AI Agent Service
 * Handles communication with the Python FastAPI backend
 * Version 2.0 - Knowledge-Driven Physics Engine
 */

const API_BASE_URL = 'http://localhost:8000';

// Route distances (km) - matches backend knowledge base
const ROUTE_DISTANCES = {
  '1': 12.0,   // Shivranjani to ISKCON
  '15': 25.0,  // ISKCON to Airport
  '7': 18.0,   // Ranip to Engineering College
  '4': 14.5    // L.D. Engineering College to Memnagar
};

/**
 * Fetch real-time route analytics from AI Agent backend
 * Uses physics-based calculations with official operational parameters
 * 
 * @param {string} routeId - The route identifier ('1', '15', '7', or '4')
 * @returns {Promise<Object>} AI prediction data with physics calculations
 */
export async function fetchRouteAnalytics(routeId) {
  try {
    // Backend now uses route distance from its knowledge base
    // Frontend no longer needs to pass distance as backend has it stored
    const response = await fetch(`${API_BASE_URL}/api/predict/${routeId}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
    
  } catch (error) {
    console.error('❌ AI Agent Backend is offline:', error.message);
    
    // Fallback object when backend is unreachable
    // This prevents the app from crashing and provides graceful degradation
    const distance = ROUTE_DISTANCES[routeId] || 15;
    const estimatedTime = Math.round(distance / 26 * 60); // Rough estimate using 26 km/h
    
    return {
      route_id: routeId,
      arrival_time: `${estimatedTime} min`,
      crowd_level: 'Offline Mode',
      status: 'Backend Unavailable',
      confidence: 'N/A',
      timestamp: new Date().toISOString(),
      physics: {
        distance_km: distance,
        commercial_speed: '26 km/h',
        note: 'Estimated values - backend offline'
      },
      error: true,
      message: 'AI Agent is temporarily unavailable. Showing estimated data.'
    };
  }
}

/**
 * Check if the AI Agent backend is healthy
 * @returns {Promise<boolean>} True if backend is reachable
 */
export async function checkBackendHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`);
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Get multiple route predictions in parallel
 * @param {Array<string>} routeIds - Array of route IDs
 * @returns {Promise<Array>} Array of predictions
 */
export async function fetchMultipleRoutes(routeIds) {
  const promises = routeIds.map(id => fetchRouteAnalytics(id));
  return Promise.all(promises);
}

/**
 * Fetch Janmarg BRTS system information and specifications
 * @returns {Promise<Object>} System info including routes, capacity, speed, etc.
 */
export async function fetchSystemInfo() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/station-info`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
    
  } catch (error) {
    console.error('❌ Failed to fetch system info:', error.message);
    
    return {
      system: {
        name: 'Janmarg BRTS (Offline)',
        commercial_speed: '26 km/h',
        error: true
      },
      error: true,
      message: 'System information unavailable'
    };
  }
}

/**
 * Fetch dynamic 'Quick Insight' data for a route based on its distance
 * Replaces hardcoded insight data with real-time calculations
 * 
 * @param {number} distanceKm - The total distance of the route in kilometers
 * @returns {Promise<Object>} Dynamic insight data including travel time, next bus, crowd level
 */
export async function fetchRouteInsight(distanceKm) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/insight?route_length_km=${distanceKm}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
    
  } catch (error) {
    console.error('❌ Failed to fetch route insight:', error.message);
    
    // Fallback calculation when backend is offline
    // Uses simple formula: time = distance / 26 km/h * 60 minutes
    const estimatedTime = Math.round((distanceKm / 26) * 60);
    const hour = new Date().getHours();
    const isPeak = (hour >= 8 && hour <= 11) || (hour >= 17 && hour <= 20);
    
    return {
      status: isPeak ? 'Peak Hour - Heavy Demand' : 'Normal Traffic',
      frequency: isPeak ? 2.5 : 8.0,
      travel_time: estimatedTime,
      next_bus_in: isPeak ? Math.round(Math.random() * 2.5) : Math.round(Math.random() * 8),
      crowd: isPeak ? 'High (Standing)' : 'Seating Available',
      error: true,
      message: 'Using offline mode - backend unavailable'
    };
  }
}
