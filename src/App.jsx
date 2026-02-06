import React, { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup, Marker, useMap } from 'react-leaflet'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Bus, HelpCircle, Cloud, Activity, MessageCircle } from 'lucide-react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './App.css'
import { REAL_ROUTE_1, ROUTE_1U_COORDINATES, STATIONS, ROUTE_15_COORDINATES, ROUTE_15_STATIONS, ROUTE_7_COORDINATES, ROUTE_7_STATIONS, ROUTE_4_COORDINATES, ROUTE_4_STATIONS, getStationAnalytics } from './RouteCoordinates'
import { fetchRouteAnalytics, fetchRouteInsight } from './services/AIAgent'

// 🎯 HAVERSINE FORMULA: Calculate distance between two GPS coordinates
// Returns distance in kilometers
const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371 // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// 🚏 CHECK IF BUS IS NEAR STATION (within 0.02 km threshold)
const isNearStation = (busCoord, stationCoord) => {
  const distance = getDistanceFromLatLonInKm(busCoord[0], busCoord[1], stationCoord[0], stationCoord[1])
  return distance < 0.02 // 20 meters
}

// 🏃 SPEED REGULATOR: Calculate travel time based on distance at constant 40 km/h
const calculateTravelTime = (distance) => {
  const speed = 40 // km/h (virtual constant speed)
  const timeInHours = distance / speed
  return timeInHours * 3600000 // Convert to milliseconds
}

// 🚌 SPEED FACTOR: meters per millisecond (≈ 40 km/h)
const SPEED_FACTOR = 0.011

// 🚏 STATION COORDINATES (Exact GPS coordinates with index references)
const STOPS = ['ISKCON', 'Ramdev Nagar', 'Shivranjani', 'Jhansi Ki Rani', 'Nehrunagar', 'Manekbag', 'Dharnidhar Derasar', 'Anjali Cross Road']
const STOPS_COORDS = {
  'ISKCON': [23.02310, 72.50680],                  // Start
  'Ramdev Nagar': [23.02530, 72.52420],            // Station
  'Shivranjani': [23.02685, 72.53738],             // Station
  'Jhansi Ki Rani': [23.023027, 72.536331],        // NEW Station
  'Nehrunagar': [23.022530, 72.541695],            // NEW Station
  'Manekbag': [23.018310, 72.544047],              // NEW Station
  'Dharnidhar Derasar': [23.008213, 72.549283],    // NEW Station
  'Anjali Cross Road': [23.003722, 72.553875]      // NEW Terminal (End)
}

// 🧭 JOURNEY PLANNER: ROUTE LOOKUP + UNIQUE STATION LIST
const ROUTE_MAP = {
  '1': STATIONS,
  '15': ROUTE_15_STATIONS,
  '7': ROUTE_7_STATIONS,
  '4': ROUTE_4_STATIONS
}

const UNIQUE_STATIONS = [
  ...new Set([
    ...STATIONS,
    ...ROUTE_15_STATIONS,
    ...ROUTE_7_STATIONS,
    ...ROUTE_4_STATIONS
  ].map(s => s.name))
].sort()

// � HIGH-FIDELITY BRTS CORRIDOR MAPPING
// 📍 TRUE GEOMETRY: 132 FEET RING ROAD (Shivranjani -> ISKCON)
// � ROUTE 1D (The Red Line): EXACT 132 FT RING ROAD CURVE
// This array traces the road pixel-by-pixel. DO NOT SHORTEN IT.
const route1_geometry = REAL_ROUTE_1
const route1_precise = REAL_ROUTE_1
const route1_brts = REAL_ROUTE_1
const ROUTE_1_COORDINATES = route1_precise

// 🟢 ROUTE 12D (The Green Line): SATELLITE ROAD
const route12_geometry = [
  [23.02685, 72.53738], // Start
  [23.02750, 72.53600], // Turn Right into Satellite Rd
  [23.02850, 72.53450],
  [23.03050, 72.53150], // Jodhpur Gam
  [23.03120, 72.52950], // Star Bazaar Rear
  [23.02900, 72.52400], // Cutting back
  [23.02600, 72.51800], // Merge lane
  [23.02310, 72.50680]  // End
]

// Backward compatibility
const route12_precise = route12_geometry
const route12_brts = route12_geometry

// 🎯 STOP POINTS (Exact indices where bus pauses)
const STOP_INDICES = {
  8: 'Ramdev Nagar',   // Station stop
  13: 'Wide Angle Cinema' // Station stop
}

// 🤖 AI TRIGGER POINTS (Exact indices for location-based alerts)
const AI_TRIGGER_POINTS = {
  4: {
    text: '🤖 Transit AI: High traffic detected at Star Bazaar Junction. Delay +2 min.',
    severity: 'warning'
  }
}

// 🤖 AI AGENT TRANSIT ALERTS (Live Toast Notifications)
const AI_ALERTS = [
  { icon: '⚠️', text: 'Heavy traffic detected near ISRO Colony. Route 12D is 4 mins faster.', severity: 'warning' },
  { icon: '✅', text: 'Route 1 running on schedule. Expect to arrive on time.', severity: 'success' },
  { icon: '📊', text: 'Crowd surge at Ramdev Nagar Hub. Standing room only expected.', severity: 'info' },
  { icon: '🚀', text: 'Optimal time to travel: Next bus arriving in 2 minutes.', severity: 'success' },
  { icon: '⏱️', text: 'Slight delay detected. Expected ETL +3 mins due to peak traffic.', severity: 'warning' },
  { icon: '🌧️', text: 'Light rain reported. No route changes needed.', severity: 'info' },
  { icon: '📍', text: 'Bus at Ramdev Nagar Hub. Next stop: Anjali in 7 mins.', severity: 'info' },
  { icon: '💚', text: 'Route 12D showing 65% seating available. Consider switching.', severity: 'success' }
]

const generateAIAlert = () => AI_ALERTS[Math.floor(Math.random() * AI_ALERTS.length)]
const getBusLoad = (hour) => {
  // Morning Peak (08:00 - 11:00): 85-95% Crowded
  if (hour >= 8 && hour <= 11) return 85 + Math.floor(Math.random() * 11)
  // Afternoon (12:00 - 16:00): 40-60% Moderate
  if (hour >= 12 && hour <= 16) return 40 + Math.floor(Math.random() * 21)
  // Evening Peak (17:00 - 20:00): 90% Crowded
  if (hour >= 17 && hour <= 20) return 90 + Math.floor(Math.random() * 6)
  // Off-Peak: 30-50%
  return 30 + Math.floor(Math.random() * 21)
}

// FARE CALCULATOR (₹5 base + ₹2 per stop)
const calculateFare = (fromIndex, toIndex) => {
  const stops = Math.abs(toIndex - fromIndex)
  return 5 + (stops * 2)
}

// TRAFFIC SIMULATION - Time-based delays
const getTrafficDelay = (hour) => {
  // Morning Peak: 5-8 mins delay
  if (hour >= 8 && hour <= 11) return 5 + Math.floor(Math.random() * 4)
  // Evening Peak: 6-10 mins delay
  if (hour >= 17 && hour <= 20) return 6 + Math.floor(Math.random() * 5)
  // Off-Peak: 2-4 mins delay
  return 2 + Math.floor(Math.random() * 3)
}

// Get current hour for realistic demo
const currentHour = new Date().getHours()
const initialLoad1D = getBusLoad(currentHour)
const initialLoad12D = Math.max(30, initialLoad1D - 40) // 12D is always less crowded

// REALISTIC BUS DATA
const busData = {
  '1': { 
    name: 'Route 1 - 132 Ft Ring Road', 
    crowded: initialLoad1D > 70, 
    color: '#ff0055', 
    fare: calculateFare(0, 2),
    route: route1_brts,
    load: initialLoad1D,
    baseTime: 12
  },
  '12D': { 
    name: 'Local 12D - Service Road', 
    crowded: initialLoad12D > 70, 
    color: '#00ff99', 
    fare: calculateFare(0, 2),
    route: route12_brts,
    load: initialLoad12D,
    baseTime: 15
  },
  '15': {
    name: 'Route 15 - Airport Express',
    crowded: false,
    color: '#00aaff',
    fare: calculateFare(0, 3),
    route: ROUTE_15_COORDINATES,
    load: 45,
    baseTime: 20
  },
  '7': {
    name: 'Route 7 - Airport to Motera',
    crowded: false,
    color: '#cc00ff',
    fare: calculateFare(0, 3),
    route: ROUTE_7_COORDINATES,
    load: 50,
    baseTime: 18
  },
  '4': {
    name: 'Route 4 - L.D. College to Memnagar',
    crowded: false,
    color: '#ff9900',
    fare: calculateFare(0, 3),
    route: ROUTE_4_COORDINATES,
    load: 55,
    baseTime: 22
  }
}

// FARE CHART (Dynamic - ₹5 base + ₹2 per stop)
const fareChart = {
  'ISKCON': calculateFare(0, 2),      // 2 stops from Shivranjani
  'Ramdev Nagar': calculateFare(0, 1), // 1 stop from Shivranjani
  'Shivranjani': 5,                     // Base fare
}

// Crowd density sparkline data (dynamic based on time)
const getCrowdData = () => {
  const hour = new Date().getHours()
  if (hour >= 8 && hour <= 11) return [65, 72, 78, 85, 90, 88, 82, 75]
  if (hour >= 17 && hour <= 20) return [70, 78, 85, 92, 95, 90, 85, 80]
  return [35, 42, 48, 55, 60, 58, 52, 45]
}
const crowdData = getCrowdData()

// FAQ Data - Transit-Focused Knowledge Base
const faqs = [
  { 
    q: 'What is the fare for my route?', 
    a: `Standard Janmarg Fare: ₹5 base fare (up to 5 km) + ₹2 per additional km. Example: ISKCON to Anjali (8.5 km) = ₹12. Use Janmarg card for discounts.` 
  },
  { 
    q: 'What is the best route with transfer?', 
    a: `The system automatically finds the optimal transfer route based on your origin and destination. Just select both stations and click "Find Bus" to see the best combination!` 
  },
  { 
    q: 'How far is my destination?', 
    a: `Distance varies by route. Example distances: ISKCON to Anjali = 8.5 km via Route 1 | Airport to ISKCON = 25 km via Route 15. Use map zoom to see exact distances.` 
  },
  { 
    q: 'What are the operating hours?', 
    a: `Janmarg Buses: 6:00 AM - 11:00 PM daily. Peak hours: 8-11 AM (Morning), 5-8 PM (Evening). Off-peak is less crowded!` 
  }
]

// LINEAR INTERPOLATION for smooth movement
const lerp = (start, end, progress) => start + (end - start) * progress

// 📏 HELPER: Calculate distance between two coordinates (Haversine formula)
const calculateDistance = (coord1, coord2) => {
  return getDistanceFromLatLonInKm(coord1[0], coord1[1], coord2[0], coord2[1])
}

// 📐 HELPER: Calculate total route distance by summing all segments
const calculateTotalRouteDistance = (routeCoordinates) => {
  if (!routeCoordinates || routeCoordinates.length < 2) return 0
  let totalDistance = 0
  for (let i = 0; i < routeCoordinates.length - 1; i++) {
    totalDistance += calculateDistance(routeCoordinates[i], routeCoordinates[i + 1])
  }
  return totalDistance
}

// 🎯 HELPER: Calculate bearing angle between two coordinates
const calculateBearing = (from, to) => {
  const lat1 = from[0] * Math.PI / 180
  const lat2 = to[0] * Math.PI / 180
  const dLng = (to[1] - from[1]) * Math.PI / 180
  
  const y = Math.sin(dLng) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)
  const bearing = Math.atan2(y, x) * 180 / Math.PI
  
  return (bearing + 360) % 360
}

// Get interpolated position along route
const getPositionAlongRoute = (route, progress) => {
  const totalSegments = route.length - 1
  const currentSegment = Math.floor(progress * totalSegments)
  const segmentProgress = (progress * totalSegments) - currentSegment
  
  if (currentSegment >= totalSegments) {
    return { position: route[route.length - 1], bearing: 0 }
  }
  
  const start = route[currentSegment]
  const end = route[currentSegment + 1]
  
  const position = [
    lerp(start[0], end[0], segmentProgress),
    lerp(start[1], end[1], segmentProgress)
  ]
  
  const bearing = calculateBearing(start, end)
  
  return { position, bearing }
}

// Create custom bus icon with rotation support
const createBusIcon = (color, rotation = 0) => {
  return L.divIcon({
    html: `
      <div style="
        background: ${color};
        border-radius: 50%;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 0 20px ${color}, 0 4px 12px rgba(0,0,0,0.4);
        border: 3px solid rgba(255,255,255,0.9);
        transform: rotate(${rotation}deg);
        transition: transform 0.1s linear;
      ">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5">
          <path d="M8 6v6M16 6v6M2 12h19.6M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3m5 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm10 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/>
        </svg>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    className: ''
  })
}

// Map pan component
function MapController({ center }) {
  const map = useMap()
  useEffect(() => {
    if (center) {
      map.flyTo(center, 14, { duration: 1.5 })
    }
  }, [center, map])
  return null
}

export default function App() {
  const [liveMode, setLiveMode] = useState(true)
  const [selection, setSelection] = useState({ from: '', to: '' })
  const [showInsights, setShowInsights] = useState(false)
  const [showStartupScreen, setShowStartupScreen] = useState(true)
  const [selectedRoute, setSelectedRoute] = useState(null)
  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [countdownTime, setCountdownTime] = useState(240) // 4 minutes countdown
  const [showHelp, setShowHelp] = useState(false)
  const [showChatbot, setShowChatbot] = useState(false)
  const [selectedFAQ, setSelectedFAQ] = useState(null)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [mapCenter, setMapCenter] = useState([23.0268, 72.5374]) // Default center of Ahmedabad
  // Real-time clock state
  const [currentTime, setCurrentTime] = useState(new Date())
  // Weather state
  const [weather, setWeather] = useState({ temp: 32, isDay: true, loading: true })
  // Smooth animation progress (0 to 1)
  const [bus1Progress, setBus1Progress] = useState(0)
  const [bus1aProgress, setBus1aProgress] = useState(0.4) // Parallel bus on Route 1
  const [bus1bProgress, setBus1bProgress] = useState(0.7) // Third parallel bus on Route 1
  const [bus12Progress, setBus12Progress] = useState(0.3)
  const [bus15Progress, setBus15Progress] = useState(0)
  const [bus15aProgress, setBus15aProgress] = useState(0.5) // Parallel bus on Route 15
  const [bus7Progress, setBus7Progress] = useState(0) // Route 7 bus
  const [bus7aProgress, setBus7aProgress] = useState(0.45) // Parallel bus on Route 7
  const [bus4Progress, setBus4Progress] = useState(0) // Route 4 bus
  const [bus4aProgress, setBus4aProgress] = useState(0.5) // Parallel bus on Route 4
  const [bus1Bearing, setBus1Bearing] = useState(0)
  const [bus1aBearing, setBus1aBearing] = useState(0)
  const [bus1bBearing, setBus1bBearing] = useState(0)
  const [bus12Bearing, setBus12Bearing] = useState(0)
  const [bus15Bearing, setBus15Bearing] = useState(0)
  const [bus15aBearing, setBus15aBearing] = useState(0)
  const [bus7Bearing, setBus7Bearing] = useState(0)
  const [bus7aBearing, setBus7aBearing] = useState(0)
  const [bus4Bearing, setBus4Bearing] = useState(0)
  const [bus4aBearing, setBus4aBearing] = useState(0)
  // Station selection + AI analytics state
  const [selectedStation, setSelectedStation] = useState(null)
  const [stationAnalytics, setStationAnalytics] = useState(null)
  const [isStationLoading, setIsStationLoading] = useState(false)
  // AI Agent state
  const [agentMessages, setAgentMessages] = useState([])
  const [isAgentOpen, setIsAgentOpen] = useState(false)
  const [showAgentToast, setShowAgentToast] = useState(false)
  const [agentToastText, setAgentToastText] = useState('')
  // Bus stop-and-go state
  const [busIndex, setBusIndex] = useState(0)
  const [busStatus, setBusStatus] = useState('En Route')
  const [isBoarding, setIsBoarding] = useState(false)
  // AI Backend Integration
  const [aiData, setAiData] = useState(null)
  const [isLoadingAI, setIsLoadingAI] = useState(false)
  const [insightData, setInsightData] = useState(null)
  const [isLoadingInsight, setIsLoadingInsight] = useState(false)
  // Origin-based positioning
  const [originIndex, setOriginIndex] = useState(0)
  // Route segment highlighting (origin to destination)
  const [originStationIndex, setOriginStationIndex] = useState(null)
  const [destinationStationIndex, setDestinationStationIndex] = useState(null)
  const [segmentCoordinates, setSegmentCoordinates] = useState(null)
  // Multi-route transfer state
  const [transferStation, setTransferStation] = useState(null)
  const [secondTransferStation, setSecondTransferStation] = useState(null) // For 2-transfer routes
  const [firstRouteSegment, setFirstRouteSegment] = useState(null)
  const [secondRouteSegment, setSecondRouteSegment] = useState(null)
  const [thirdRouteSegment, setThirdRouteSegment] = useState(null) // For 2-transfer routes
  const [firstRoute, setFirstRoute] = useState(null)
  const [secondRoute, setSecondRoute] = useState(null)
  const [thirdRoute, setThirdRoute] = useState(null) // For 2-transfer routes
  const [routeDirection, setRouteDirection] = useState('D') // D = Down, U = Up

  // Helper function to determine route direction based on station order
  const getRouteDirection = (routeStations, originName, destName) => {
    const originIdx = routeStations.findIndex(s => s.name === originName)
    const destIdx = routeStations.findIndex(s => s.name === destName)
    // If destination index is higher, it's Down (forward), otherwise Up (reverse)
    return destIdx > originIdx ? 'D' : 'U'
  }

  // Get route display name with direction
  const getRouteDisplayName = (routeId, direction) => {
    return `${routeId}${direction}`
  }
  
  // Get route direction label with arrow
  const getRouteDirectionLabel = (direction) => {
    return direction === 'D' ? '↓ Onward' : '↑ Return'
  }

  const handleStationClick = async (station) => {
    setSelectedStation(station)
    setIsStationLoading(true)
    setStationAnalytics(null)

    // Get analytics for the station
    const analytics = await Promise.resolve(getStationAnalytics(station.id))
    setStationAnalytics(analytics)
    setIsStationLoading(false)
    
    // Center map on clicked station
    setMapCenter(station.coords)
  }

  // 🚌 DISTANCE-BASED CONSTANT SPEED BUS ANIMATION (ALL ROUTES)
  const isPausedRef = useRef(false)
  const aiTriggeredRef = useRef(new Set())
  const hasStoppedAtRef = useRef(new Set()) // Track visited stations

  useEffect(() => {
    // Determine the actual path the bus should take based on the journey
    let activePath = []
    let activeStations = []
    let isMultiRouteJourney = false

    // PRIORITY 1: Journey segment on single route (e.g., Anjali → ISKCON on Route 1)
    if (segmentCoordinates && segmentCoordinates.length > 0 && !transferStation && !secondTransferStation) {
      activePath = segmentCoordinates
      
      if (selectedRoute === '1') {
        activeStations = STATIONS
      } else if (selectedRoute === '15') {
        activeStations = ROUTE_15_STATIONS
      } else if (selectedRoute === '7') {
        activeStations = ROUTE_7_STATIONS
      }
    }
    // PRIORITY 2: Multi-route transfer journey (e.g., Route 1 → Route 15 at transfer station)
    else if ((transferStation || secondTransferStation) && firstRouteSegment && secondRouteSegment) {
      // Concatenate route segments for seamless animation
      if (thirdRouteSegment) {
        activePath = [...firstRouteSegment, ...secondRouteSegment, ...thirdRouteSegment]
      } else {
        activePath = [...firstRouteSegment, ...secondRouteSegment]
      }
      
      // Get stations from all routes involved
      const firstRouteStations = firstRoute && firstRoute.includes('15') ? ROUTE_15_STATIONS : 
                                 firstRoute && firstRoute.includes('7') ? ROUTE_7_STATIONS : STATIONS
      const secondRouteStations = secondRoute && secondRoute.includes('15') ? ROUTE_15_STATIONS : 
                                  secondRoute && secondRoute.includes('7') ? ROUTE_7_STATIONS : STATIONS
      
      activeStations = [...firstRouteStations, ...secondRouteStations]
      isMultiRouteJourney = true
    }
    // PRIORITY 3: Full route display (browsing mode, no specific journey)
    else {
      if (selectedRoute === '1') {
        activePath = ROUTE_1_COORDINATES
        activeStations = STATIONS
        setBus1aProgress(0.4)
        setBus1bProgress(0.7)
      } else if (selectedRoute === '15') {
        activePath = ROUTE_15_COORDINATES
        activeStations = ROUTE_15_STATIONS
        setBus15aProgress(0.5)
      } else if (selectedRoute === '7') {
        activePath = ROUTE_7_COORDINATES
        activeStations = ROUTE_7_STATIONS
        setBus7aProgress(0.45)
      }
    }

    if (activePath.length === 0) {
      console.warn('No active path defined for bus animation')
      return
    }

    let segmentStartTime = null
    let currentIndex = 0
    let pauseStartTime = null

    // RESET BUS STATE when selectedRoute changes
    isPausedRef.current = false
    hasStoppedAtRef.current = new Set()
    aiTriggeredRef.current = new Set()

    setBusStatus('En Route 🟢')
    
    // Don't reset bus progress here - it's set in handleRouteSwitch based on origin

    const totalSegments = Math.max(activePath.length - 1, 1)

    const animate = (timestamp) => {
      if (!segmentStartTime) segmentStartTime = timestamp

      if (isPausedRef.current) {
        if (pauseStartTime && timestamp - pauseStartTime >= 3000) {
          isPausedRef.current = false
          setBusStatus('En Route 🟢')
          pauseStartTime = null
          segmentStartTime = timestamp
        } else {
          requestAnimationFrame(animate)
          return
        }
      }

      // Bus always moves forward along the journey path (activePath)
      // The path is already oriented correctly based on origin→destination
      const start = activePath[currentIndex]
      const nextIndex = Math.min(currentIndex + 1, activePath.length - 1)
      const end = activePath[nextIndex]

      if (!end || !start || currentIndex >= activePath.length - 1) {
        // Journey complete - loop back to start
        currentIndex = 0
        segmentStartTime = timestamp
        hasStoppedAtRef.current.clear()
        requestAnimationFrame(animate)
        return
      }

      const distance = getDistanceFromLatLonInKm(start[0], start[1], end[0], end[1])
      const duration = Math.max((distance * 1000) / SPEED_FACTOR, 1)
      const segmentProgress = Math.min((timestamp - segmentStartTime) / duration, 1)

      const position = [
        lerp(start[0], end[0], segmentProgress),
        lerp(start[1], end[1], segmentProgress)
      ]
      const bearing = calculateBearing(start, end)

      const nearbyStation = activeStations.find(station =>
        getDistanceFromLatLonInKm(position[0], position[1], station.coords[0], station.coords[1]) < 0.02
      )

      if (nearbyStation && !hasStoppedAtRef.current.has(nearbyStation.id)) {
        hasStoppedAtRef.current.add(nearbyStation.id)
        isPausedRef.current = true
        pauseStartTime = timestamp
        const routeLabel = isMultiRouteJourney ? 
          `${firstRoute} → ${secondRoute}` : 
          `Route ${selectedRoute} ${getRouteDirectionLabel(routeDirection)}`
        setBusStatus(`🛑 ${routeLabel} • Stopped at ${nearbyStation.name}`)
        requestAnimationFrame(animate)
        return
      }

      const overallProgress = (currentIndex + segmentProgress) / Math.max(totalSegments, 1)

      setBusPosition({ coords: position, bearing, progress: overallProgress })

      // Update bus progress based on active route or transfer
      if ((transferStation || secondTransferStation) && firstRoute && secondRoute) {
        // Transfer route - update all route buses involved
        if (firstRoute && firstRoute[0] === '1') {
          setBus1Progress(overallProgress)
          setBus1Bearing(bearing)
          setBus1aProgress((overallProgress + 0.4) % 1)
          setBus1aBearing(bearing)
          setBus1bProgress((overallProgress + 0.7) % 1)
          setBus1bBearing(bearing)
        }
        if (secondRoute && secondRoute[0] === '15') {
          setBus15Progress(overallProgress)
          setBus15Bearing(bearing)
          setBus15aProgress((overallProgress + 0.5) % 1)
          setBus15aBearing(bearing)
        }
        if (secondRoute && secondRoute[0] === '7') {
          setBus7Progress(overallProgress)
          setBus7Bearing(bearing)
          setBus7aProgress((overallProgress + 0.45) % 1)
          setBus7aBearing(bearing)
        }
        if (thirdRoute && thirdRoute[0] === '7') {
          setBus7Progress(overallProgress)
          setBus7Bearing(bearing)
          setBus7aProgress((overallProgress + 0.45) % 1)
          setBus7aBearing(bearing)
        }
        if (thirdRoute && thirdRoute[0] === '15') {
          setBus15Progress(overallProgress)
          setBus15Bearing(bearing)
          setBus15aProgress((overallProgress + 0.5) % 1)
          setBus15aBearing(bearing)
        }
      } else {
        // Single route selected
        if (selectedRoute === '1') {
          setBus1Progress(overallProgress)
          setBus1Bearing(bearing)
          setBus1aProgress((overallProgress + 0.4) % 1)
          setBus1aBearing(bearing)
          setBus1bProgress((overallProgress + 0.7) % 1)
          setBus1bBearing(bearing)
        } else if (selectedRoute === '15') {
          setBus15Progress(overallProgress)
          setBus15Bearing(bearing)
          setBus15aProgress((overallProgress + 0.5) % 1)
          setBus15aBearing(bearing)
        } else if (selectedRoute === '7') {
          setBus7Progress(overallProgress)
          setBus7Bearing(bearing)
          setBus7aProgress((overallProgress + 0.45) % 1)
          setBus7aBearing(bearing)
        } else if (selectedRoute === '4') {
          setBus4Progress(overallProgress)
          setBus4Bearing(bearing)
          setBus4aProgress((overallProgress + 0.5) % 1)
          setBus4aBearing(bearing)
        }
      }

      if (segmentProgress >= 1) {
        currentIndex = Math.min(currentIndex + 1, activePath.length - 1)
        segmentStartTime = timestamp
      }

      requestAnimationFrame(animate)
    }

    const raf = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(raf)
  }, [selectedRoute, segmentCoordinates, firstRouteSegment, secondRouteSegment, thirdRouteSegment, transferStation, secondTransferStation, firstRoute, secondRoute])

  // 🎯 ORIGIN-BASED POSITIONING: Position bus at origin station when incoming
  useEffect(() => {
    if (insightData?.origin_index !== undefined) {
      setOriginIndex(insightData.origin_index)
      
      // Calculate progress to origin station
      // Formula: originIndex / totalStops (approximately)
      const totalStops = selectedRoute === '1' ? 6 : selectedRoute === '15' ? 14 : 5
      const progressToOrigin = insightData.origin_index / totalStops
      
      // Position bus at origin with "Incoming" status
      if (selectedRoute === '1') {
        setBus1Progress(progressToOrigin)
      } else if (selectedRoute === '15') {
        setBus15Progress(progressToOrigin)
      }
      
      // Update bus status
      setBusStatus(`🚌 Incoming from Depot → ${insightData.origin_station}`)
    }
  }, [insightData?.origin_index, selectedRoute])

  // Route 12D continuous smooth animation (unchanged)
  useEffect(() => {
    let startTimestamp12 = null
    const duration = 30000 // 30 seconds for full journey

    const animateBus12 = (timestamp) => {
      if (!startTimestamp12) startTimestamp12 = timestamp
      const elapsed = timestamp - startTimestamp12
      const progress = (elapsed % duration) / duration
      
      const { position, bearing } = getPositionAlongRoute(route12_brts, progress)
      setBus12Progress(progress)
      setBus12Bearing(bearing)
      
      requestAnimationFrame(animateBus12)
    }

    const raf12 = requestAnimationFrame(animateBus12)
    
    return () => {
      cancelAnimationFrame(raf12)
    }
  }, [])

  // Real-time clock that updates every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Fetch live weather from Open-Meteo API
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const response = await fetch(
          'https://api.open-meteo.com/v1/forecast?latitude=23.0225&longitude=72.5714&current_weather=true'
        )
        const data = await response.json()
        const currentWeather = data.current_weather
        setWeather({
          temp: Math.round(currentWeather.temperature),
          isDay: currentWeather.is_day === 1,
          loading: false
        })
      } catch (error) {
        console.error('Weather fetch failed:', error)
        setWeather({ temp: 32, isDay: true, loading: false })
      }
    }
    fetchWeather()
    // Refresh weather every 10 minutes
    const interval = setInterval(fetchWeather, 600000)
    return () => clearInterval(interval)
  }, [])

  // 🤖 SMART QUERY HANDLER - Answer custom questions
  const handleCustomQuery = (query) => {
    const q = query.toLowerCase()
    
    // Distance queries
    if (q.includes('distance') || q.includes('how far') || q.includes('km')) {
      const distances = {
        'iskcon to anjali': '8.5 km via Route 1',
        'anjali to iskcon': '8.5 km via Route 1',
        'iskcon to airport': '25 km via Route 15',
        'rto to vishwakarma': '8 km via Route 7',
        'airport to iskcon': '25 km via Route 15 (Return)',
        'ranip to rto': '2 km via Route 7'
      }
      
      for (const [route, dist] of Object.entries(distances)) {
        if (q.includes(route.split(' to ')[0]) && q.includes(route.split(' to ')[1])) {
          return `📍 Distance: ${dist}`
        }
      }
      return '📍 Common routes: Shivranjani↔ISKCON (12km), ISKCON↔Airport (25km), Ranip↔Vishwakarma (8km). Select origin & destination to calculate exact distance.'
    }
    
    // Fare queries
    if (q.includes('fare') || q.includes('cost') || q.includes('price') || q.includes('₹')) {
      return `💰 Janmarg Fare Structure:\n• Base fare: ₹5 (up to 5 km)\n• Additional: ₹2 per km beyond 5 km\n• Example: 12 km journey = ₹19\nDiscount: 20% off with Janmarg card`
    }
    
    // Operating hours
    if (q.includes('operating') || q.includes('hours') || q.includes('timing') || q.includes('schedule')) {
      return `⏰ Operating Hours:\n• Morning: 6:00 AM - 11:00 PM\n• Peak hours: 8-11 AM, 5-8 PM (More crowded)\n• Off-peak: 11 AM - 5 PM (Comfortable)\n• Frequency: Every 2-8 mins based on route & time`
    }
    
    // Transfer queries
    if (q.includes('transfer') || q.includes('change') || q.includes('connect')) {
      return `🔄 Smart Transfer System:\n• Automatically finds best route combination\n• Picks optimal transfer stations (RTO Circle, Ranip Cross-Road)\n• Shows both route segments on map\n• Avoid backtracking with directional routing (↓ Onward / ↑ Return)`
    }
    
    // Route info
    if (q.includes('route') || q.includes('which bus')) {
      return `🚌 Available Routes:\n• Route 1D: Shivranjani ↔ ISKCON (6 stops)\n• Route 15D: ISKCON ↔ Airport (14 stops)\n• Route 7D: Ranip ↔ Vishwakarma (7 stops)\n• Route 4D: L.D. College ↔ Memnagar (7 stops)\nSelect origin & destination to find your route!`
    }
    
    // Default response
    return `💡 I can help with:\n✓ Fares & pricing\n✓ Route distances\n✓ Operating hours\n✓ Transfer routes\n✓ Route information\n\nTry asking: "What is the fare?" or "How far is my destination?"`
  }
  useEffect(() => {
    const agentInterval = setInterval(() => {
      const alertData = generateAgentAlert()
      const timestamp = new Date().toLocaleTimeString()
      
      // Add to chat history
      setAgentMessages(prev => [...prev, { 
        sender: 'bot', 
        text: alertData.text, 
        icon: alertData.icon,
        time: timestamp 
      }])
      
      // Show toast notification
      setAgentToastText(`${alertData.icon} ${alertData.text}`)
      setShowAgentToast(true)
      setTimeout(() => setShowAgentToast(false), 4000)
    }, 15000) // Alert every 15 seconds
    
    return () => clearInterval(agentInterval)
  }, [])

  // Countdown timer
  useEffect(() => {
    if (!showInsights) return
    const interval = setInterval(() => {
      setCountdownTime(prev => (prev > 0 ? prev - 1 : (selectedRoute === '1' ? 240 : 600)))
    }, 1000)
    return () => clearInterval(interval)
  }, [showInsights, selectedRoute])

  // 🤖 AI BACKEND INTEGRATION: Fetch real-time predictions when insights are shown or route changes
  useEffect(() => {
    if (!showInsights) return

    const fetchAIData = async () => {
      setIsLoadingAI(true)
      setIsLoadingInsight(true)
      try {
        // Get the current route coordinates
        let routeCoordinates = ROUTE_1_COORDINATES
        switch (selectedRoute) {
          case '15':
            routeCoordinates = ROUTE_15_COORDINATES
            break
          case '7':
            routeCoordinates = ROUTE_7_COORDINATES
            break
          default:
            routeCoordinates = ROUTE_1_COORDINATES
        }

        // Calculate total route distance
        const totalDistance = calculateTotalRouteDistance(routeCoordinates)

        // Fetch detailed analytics (for route prediction)
        const analyticsData = await fetchRouteAnalytics(selectedRoute)
        setAiData(analyticsData)

        // Fetch dynamic insight data based on calculated distance
        const insightDataFromAPI = await fetchRouteInsight(totalDistance)
        setInsightData(insightDataFromAPI)
      } catch (error) {
        console.error('Failed to fetch AI data:', error)
      } finally {
        setIsLoadingAI(false)
        setIsLoadingInsight(false)
      }
    }

    fetchAIData()
  }, [showInsights, selectedRoute])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatDigitalClock = () => {
    const hours = currentTime.getHours().toString().padStart(2, '0')
    const minutes = currentTime.getMinutes().toString().padStart(2, '0')
    const seconds = currentTime.getSeconds().toString().padStart(2, '0')
    return `${hours}:${minutes}:${seconds}`
  }

  const handleSelection = (field, value) => {
    const newSelection = { ...selection, [field]: value }
    setSelection(newSelection)
    // Don't hide startup screen here - only hide on selection confirmation
    
    // Only show insights when BOTH origin and destination are selected
    if (newSelection.from && newSelection.to) {
      setShowInsights(true)
    } else {
      setShowInsights(false)
    }
  }

  const handleStartupSelection = (field, value) => {
    // This handler closes startup screen only when user selects
    handleSelection(field, value)
    // Note: don't close startup screen yet - wait for button click
  }

  const handleContinue = () => {
    if (selection.from && selection.to) {
      // Call with params first, then update state
      findRouteWithParams(selection.from, selection.to)
      setOrigin(selection.from)
      setDestination(selection.to)
      setShowStartupScreen(false)
    }
  }

  const findRouteWithParams = (fromLocation, toLocation) => {
    let foundRoute = null
    let originIdx = -1
    let destIdx = -1

    for (const [routeId, stations] of Object.entries(ROUTE_MAP)) {
      originIdx = stations.findIndex(s => s.name === fromLocation)
      destIdx = stations.findIndex(s => s.name === toLocation)

      if (originIdx !== -1 && destIdx !== -1) {
        foundRoute = routeId
        const direction = getRouteDirection(stations, fromLocation, toLocation)
        
        let routeCoords = routeId === '1' ? ROUTE_1_COORDINATES : routeId === '15' ? ROUTE_15_COORDINATES : routeId === '7' ? ROUTE_7_COORDINATES : ROUTE_4_COORDINATES
        const originStation = stations[originIdx]
        const destStation = stations[destIdx]
        const originCoordIdx = findClosestCoordinateIndex(routeCoords, originStation.coords)
        const destCoordIdx = findClosestCoordinateIndex(routeCoords, destStation.coords)
        
        const startIdx = Math.min(originCoordIdx, destCoordIdx)
        const endIdx = Math.max(originCoordIdx, destCoordIdx)
        const segment = routeCoords.slice(startIdx, endIdx + 1)
        
        setOriginStationIndex(originIdx)
        setDestinationStationIndex(destIdx)
        setSegmentCoordinates(segment)
        setRouteDirection(direction)
        setTransferStation(null)
        setFirstRouteSegment(null)
        setSecondRouteSegment(null)
        setFirstRoute(null)
        setSecondRoute(null)
        
        if (segment && segment.length > 0) {
          const midIdx = Math.floor(segment.length / 2)
          setMapCenter(segment[midIdx])
        }
        
        setSelectedRoute(routeId)
        handleRouteSwitch(routeId, fromLocation)
        return
      }
    }
  }

  // 🚀 SIMPLIFIED ROUTE FINDER: Backend handles all path calculation
  const findRoute = async (fromLocation = null, toLocation = null) => {
    const originValue = fromLocation || origin
    const destinationValue = toLocation || destination
    
    if (!originValue || !destinationValue) {
      alert('Please select both a Start Location and a Destination.')
      return
    }

    // Set state to show insights panel
    setOrigin(originValue)
    setDestination(destinationValue)
    
    try {
      // Call backend API to calculate exact journey path
      const response = await fetch('http://localhost:8000/api/calculate-journey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: originValue,
          destination: destinationValue
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || `Route not found: ${originValue} → ${destinationValue}`)
      }
      
      const journeyData = await response.json()
      
      console.log('✅ Journey Path Received:', {
        route: journeyData.route_id || `${journeyData.route_1}→${journeyData.route_2}`,
        transfer: journeyData.transfer,
        nodes: journeyData.total_nodes,
        distance: journeyData.total_distance_km,
        eta: journeyData.eta_minutes
      })
      
      // Frontend: Simply use the path provided by backend
      setSegmentCoordinates(journeyData.path)
      setRouteDirection(journeyData.direction?.includes('↓') ? 'D' : 'U')
      
      if (journeyData.transfer) {
        // Multi-route transfer
        setSelectedRoute(journeyData.route_1)
        setFirstRoute(journeyData.route_1)
        setSecondRoute(journeyData.route_2)
        setTransferStation(journeyData.transfer_station)
        setFirstRouteSegment(journeyData.path)
        setSecondRouteSegment([])
      } else {
        // Single route
        setSelectedRoute(journeyData.route_id)
        setTransferStation(null)
        setFirstRouteSegment(null)
        setSecondRouteSegment(null)
        setFirstRoute(null)
        setSecondRoute(null)
      }
      
      // Center map on journey
      if (journeyData.path && journeyData.path.length > 0) {
        const midIdx = Math.floor(journeyData.path.length / 2)
        setMapCenter(journeyData.path[midIdx])
      }
      
    } catch (error) {
      console.error('❌ Route Calculation Error:', error)
      alert(`Error finding route: ${error.message}`)
    }
  }

  // Helper function to find closest coordinate index to a station
  const findClosestCoordinateIndex = (coordinates, stationCoords) => {
    let minDistance = Infinity
    let closestIndex = 0
    
    coordinates.forEach((coord, idx) => {
      const distance = getDistanceFromLatLonInKm(coord[0], coord[1], stationCoords[0], stationCoords[1])
      if (distance < minDistance) {
        minDistance = distance
        closestIndex = idx
      }
    })
    
    return closestIndex
  }

  const handleRouteSwitch = (routeId, originStation = null) => {
    setSelectedRoute(routeId)
    // Store origin for origin-based ETA
    if (originStation) {
      setOrigin(originStation)
      
      // Calculate bus starting position based on origin station
      let routeCoords = routeId === '1' ? ROUTE_1_COORDINATES : 
                       routeId === '15' ? ROUTE_15_COORDINATES : 
                       routeId === '7' ? ROUTE_7_COORDINATES : ROUTE_4_COORDINATES
      let stations = routeId === '1' ? STATIONS : 
                     routeId === '15' ? ROUTE_15_STATIONS : 
                     routeId === '7' ? ROUTE_7_STATIONS : ROUTE_4_STATIONS
      
      const originStationObj = stations.find(s => s.name === originStation)
      if (originStationObj && routeCoords.length > 0) {
        const originCoordIdx = findClosestCoordinateIndex(routeCoords, originStationObj.coords)
        const initialProgress = originCoordIdx / routeCoords.length
        
        // Set bus to start at origin position
        if (routeId === '1') {
          setBus1Progress(initialProgress)
        } else if (routeId === '15') {
          setBus15Progress(initialProgress)
        } else if (routeId === '4') {
          setBus4Progress(initialProgress)
        }
      } else {
        // No origin specified, start from beginning
        setBus1Progress(0)
        setBus1aProgress(0.4)
        setBus1bProgress(0.7)
        setBus15Progress(0)
        setBus15aProgress(0.5)
        setBus7Progress(0)
        setBus7aProgress(0.45)
      }
    } else {
      setBus1Progress(0)
      setBus1aProgress(0.4)
      setBus1bProgress(0.7)
      setBus15Progress(0)
      setBus15aProgress(0.5)
      setBus7Progress(0)
      setBus7aProgress(0.45)
    }
    
    setBus1Bearing(0)
    setBus1aBearing(0)
    setBus1bBearing(0)
    setBus15Bearing(0)
    setBus15aBearing(0)
    setBus7Bearing(0)
    setBus7aBearing(0)
    setBusIndex(0)
    setSelectedStation(null)
    
    // Fetch origin-based ETA from backend if origin is provided
    if (originStation && routeId) {
      fetchOriginBasedETA(routeId, originStation)
    }
    
    // Center map on segment midpoint if segment exists, otherwise use default
    if (segmentCoordinates && segmentCoordinates.length > 0) {
      const midIdx = Math.floor(segmentCoordinates.length / 2)
      setMapCenter(segmentCoordinates[midIdx])
    } else {
      setMapCenter(
        routeId === '1'
          ? ROUTE_1_COORDINATES[3]
          : routeId === '15'
            ? ROUTE_15_COORDINATES[3]
            : [23.085, 72.590]
      )
    }
  }

  // Fetch origin-based ETA from backend
  const fetchOriginBasedETA = async (routeId, originStationName) => {
    try {
      const response = await fetch(
        `http://localhost:8000/api/insight?route_id=${routeId}&origin_station_name=${encodeURIComponent(originStationName)}`
      )
      if (response.ok) {
        const data = await response.json()
        setInsightData(data)
      }
    } catch (error) {
      console.error('Error fetching origin-based ETA:', error)
    }
  }

  useEffect(() => {
    setMapCenter(
      selectedRoute === '1'
        ? ROUTE_1_COORDINATES[3]
        : selectedRoute === '15'
          ? ROUTE_15_COORDINATES[3]
          : selectedRoute === '7'
            ? ROUTE_7_COORDINATES[3]
            : selectedRoute === '4'
              ? ROUTE_4_COORDINATES[3]
              : [23.085, 72.590]
    )
  }, [selectedRoute])

  const switchRoute = () => {
    setIsRedirecting(true)
    setTimeout(() => {
      const nextRoute = selectedRoute === '1' ? '15' : '1'
      handleRouteSwitch(nextRoute)
      setCountdownTime(nextRoute === '1' ? 240 : 600) // 4/10 mins
      setIsRedirecting(false)
    }, 1000)
  }

  const currentBusData = busData[selectedRoute] || busData['1']
  const comfort = currentBusData.load
  const currentStations = ROUTE_MAP[selectedRoute] || STATIONS
  const startNode = currentStations[0]?.name || 'Start'
  const endNode = currentStations[currentStations.length - 1]?.name || 'End'
  const activeProgress = selectedRoute === '1' ? bus1Progress : selectedRoute === '15' ? bus15Progress : selectedRoute === '7' ? bus7Progress : bus4Progress
  
  // Dynamic ETA calculation based on bus position and proximity to origin
  const originStation = currentStations.find(s => s.name === origin)
  const stationIndex = originStation ? currentStations.findIndex(s => s.name === origin) : -1
  const totalStations = currentStations.length
  const frequencyMinutes = selectedRoute === '1' ? 2.5 : selectedRoute === '15' ? 3 : 2.5
  const baseTime = currentBusData.baseTime || 12
  
  // Get active route coordinates for better distance calculation
  let activePath = []
  if (selectedRoute === '1') {
    activePath = routeDirection === 'D' ? ROUTE_1_COORDINATES : ROUTE_1U_COORDINATES
  } else if (selectedRoute === '15') {
    activePath = ROUTE_15_COORDINATES
  } else if (selectedRoute === '7') {
    activePath = ROUTE_7_COORDINATES
  } else if (selectedRoute === '4') {
    activePath = ROUTE_4_COORDINATES
  }
  if (segmentCoordinates && segmentCoordinates.length > 0) {
    activePath = segmentCoordinates
  }
  
  // Calculate current bus position and distance to origin station
  let dynamicETA = Math.max(2, Math.round((1 - activeProgress) * baseTime))
  let busStatusMessage = 'En Route'
  let isApproaching = false
  let hasLeft = false
  
  if (stationIndex !== -1 && activePath.length > 0 && originStation) {
    // Get bus current position on route
    const busPositionIndex = Math.floor(activeProgress * (activePath.length - 1))
    const busPosition = activePath[busPositionIndex]
    
    // Calculate actual geographic distance to origin station
    if (busPosition) {
      const distToOriginKm = getDistanceFromLatLonInKm(
        busPosition[0], busPosition[1],
        originStation.coords[0], originStation.coords[1]
      )
      
      // Convert km to minutes (accounting for stops, traffic, etc.)
      // ~0.2 km/min = ~12 km/h (realistic city bus with frequent stops)
      const etaFromDistance = Math.ceil(distToOriginKm / 0.2)
      
      // If within 0.5 km (about 2.5 minutes at realistic speed)
      if (distToOriginKm < 0.5 && activeProgress < (stationIndex / totalStations)) {
        busStatusMessage = '🚌 BUS APPROACHING'
        isApproaching = true
        dynamicETA = Math.max(1, etaFromDistance)
      }
      // If bus has passed the station (by geographic distance)
      else if (activeProgress > (stationIndex / totalStations)) {
        hasLeft = true
        busStatusMessage = '✓ Bus Left - Next Bus'
        dynamicETA = Math.round(frequencyMinutes)
      } else {
        // Normal en route, use distance-based ETA
        dynamicETA = Math.max(2, etaFromDistance)
      }
    }
  }
  
  const etaMinutes = dynamicETA

  const getGradientColor = (value) => {
    if (value < 33) return '#00ff99'
    if (value < 66) return '#ffcc00'
    return '#ff0055'
  }

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: '#0a0a0a' }}>
      {/* STARTUP WELCOME SCREEN - Centered Card Overlay */}
      <AnimatePresence>
        {showStartupScreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              zIndex: 9999,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '24px',
            }}
            onClick={() => setShowStartupScreen(false)}
          >
            {/* CENTERED CARD */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.4, type: 'spring', stiffness: 300 }}
              onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
              style={{
                background: 'linear-gradient(135deg, rgba(10, 15, 30, 0.95) 0%, rgba(20, 35, 70, 0.95) 100%)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderRadius: '24px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '48px 40px',
                maxWidth: '500px',
                width: '100%',
                boxShadow: '0 25px 50px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
              }}
            >
              {/* APP LOGO */}
              <div style={{ fontSize: '48px', marginBottom: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                <Bus size={48} color="#2979ff" />
                <span style={{ background: 'linear-gradient(135deg, #2979ff 0%, #00d4ff 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  Transit-Flow AI
                </span>
              </div>

              {/* TAGLINE */}
              <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px', color: '#fff', letterSpacing: '-0.5px', textAlign: 'center' }}>
                Smart Bus Navigation
              </h1>
              
              <p style={{ fontSize: '14px', color: '#aaa', marginBottom: '32px', lineHeight: '1.6', textAlign: 'center' }}>
                Real-time tracking • AI predictions • Live updates for Ahmedabad BRTS
              </p>

              {/* SEARCH PROMPTS */}
              <p style={{ fontSize: '12px', color: '#666', marginBottom: '16px', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px', textAlign: 'center' }}>
                📍 WHERE DO YOU WANT TO GO?
              </p>

              {/* START LOCATION INPUT WITH DROPDOWN */}
              <div style={{ position: 'relative', marginBottom: '12px' }}>
                <input
                  type="text"
                  list="startLocationList"
                  value={selection.from}
                  onChange={(e) => setSelection({ ...selection, from: e.target.value })}
                  placeholder="📍 Start Location (type or select)..."
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    background: 'rgba(41, 121, 255, 0.15)',
                    border: '1px solid rgba(41, 121, 255, 0.4)',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '14px',
                    fontWeight: 500,
                    outline: 'none',
                    transition: 'all 0.3s',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => {
                    e.target.style.background = 'rgba(41, 121, 255, 0.25)'
                    e.target.style.borderColor = 'rgba(41, 121, 255, 0.7)'
                    e.target.style.boxShadow = '0 0 16px rgba(41, 121, 255, 0.3)'
                  }}
                  onBlur={(e) => {
                    e.target.style.background = 'rgba(41, 121, 255, 0.15)'
                    e.target.style.borderColor = 'rgba(41, 121, 255, 0.4)'
                    e.target.style.boxShadow = 'none'
                    handleStartupSelection('from', e.target.value)
                  }}
                />
                <datalist id="startLocationList">
                  {UNIQUE_STATIONS && UNIQUE_STATIONS.map((station) => (
                    <option key={station} value={station} />
                  ))}
                </datalist>
              </div>

              {/* DESTINATION INPUT WITH DROPDOWN */}
              <div style={{ position: 'relative', marginBottom: '24px' }}>
                <input
                  type="text"
                  list="destinationList"
                  value={selection.to}
                  onChange={(e) => setSelection({ ...selection, to: e.target.value })}
                  placeholder="🎯 Destination (type or select)..."
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    background: 'rgba(0, 255, 153, 0.15)',
                    border: '1px solid rgba(0, 255, 153, 0.4)',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '14px',
                    fontWeight: 500,
                    outline: 'none',
                    transition: 'all 0.3s',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => {
                    e.target.style.background = 'rgba(0, 255, 153, 0.25)'
                    e.target.style.borderColor = 'rgba(0, 255, 153, 0.7)'
                    e.target.style.boxShadow = '0 0 16px rgba(0, 255, 153, 0.3)'
                  }}
                  onBlur={(e) => {
                    e.target.style.background = 'rgba(0, 255, 153, 0.15)'
                    e.target.style.borderColor = 'rgba(0, 255, 153, 0.4)'
                    e.target.style.boxShadow = 'none'
                    handleStartupSelection('to', e.target.value)
                  }}
                />
                <datalist id="destinationList">
                  {UNIQUE_STATIONS && UNIQUE_STATIONS.map((station) => (
                    <option key={station} value={station} />
                  ))}
                </datalist>
              </div>

              {/* FEATURES GRID */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '24px' }}>
                <div style={{ padding: '12px', background: 'rgba(255, 0, 85, 0.1)', borderRadius: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', marginBottom: '4px' }}>⚡</div>
                  <div style={{ fontSize: '10px', color: '#aaa', fontWeight: 600 }}>Real-Time</div>
                </div>
                <div style={{ padding: '12px', background: 'rgba(0, 255, 153, 0.1)', borderRadius: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', marginBottom: '4px' }}>🤖</div>
                  <div style={{ fontSize: '10px', color: '#aaa', fontWeight: 600 }}>AI Powered</div>
                </div>
                <div style={{ padding: '12px', background: 'rgba(0, 170, 255, 0.1)', borderRadius: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', marginBottom: '4px' }}>👥</div>
                  <div style={{ fontSize: '10px', color: '#aaa', fontWeight: 600 }}>Live Updates</div>
                </div>
              </div>

              {/* CONTINUE BUTTON */}
              <button
                onClick={() => {
                  if (selection.from && selection.to) {
                    findRoute(selection.from, selection.to)
                    setShowStartupScreen(false)
                  }
                }}
                disabled={!selection.from || !selection.to}
                style={{
                  width: '100%',
                  padding: '14px 24px',
                  background: selection.from && selection.to ? 'linear-gradient(135deg, #2979ff 0%, #00d4ff 100%)' : 'rgba(100, 100, 100, 0.3)',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '16px',
                  fontWeight: 700,
                  cursor: selection.from && selection.to ? 'pointer' : 'not-allowed',
                  transition: 'all 0.3s',
                  boxShadow: selection.from && selection.to ? '0 0 20px rgba(41, 121, 255, 0.5)' : 'none',
                }}
                onMouseEnter={(e) => {
                  if (selection.from && selection.to) {
                    e.target.style.boxShadow = '0 0 30px rgba(41, 121, 255, 0.8)'
                    e.target.style.transform = 'scale(1.02)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (selection.from && selection.to) {
                    e.target.style.boxShadow = '0 0 20px rgba(41, 121, 255, 0.5)'
                    e.target.style.transform = 'scale(1)'
                  }
                }}
              >
                Find Bus 🔍
              </button>

              {/* CLOSE HINT */}
              <p style={{ fontSize: '11px', color: '#666', textAlign: 'center', marginTop: '16px' }}>
                Select both locations and click Find Bus
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAP */}
      <MapContainer
        center={[23.0268, 72.5374]}
        zoom={14}
        zoomControl={false}
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution="&copy; OpenStreetMap &copy; CARTO"
        />
        <MapController center={mapCenter} />

        {/* NEON GLOWING ROUTES - SUPER-DENSE BRTS CORRIDOR */}
        {/* Multi-Route Transfer Visualization */}
        {(transferStation || secondTransferStation) && firstRouteSegment && secondRouteSegment ? (
          <>
            {/* First Route Segment - SOLID */}
            {firstRoute && firstRoute[0] === '1' && (
              <>
                <Polyline 
                  positions={firstRouteSegment} 
                  pathOptions={{ 
                    color: '#ff0055', 
                    weight: 8, 
                    opacity: 0.4,
                    lineCap: 'round',
                    lineJoin: 'round'
                  }} 
                />
                <Polyline 
                  positions={firstRouteSegment} 
                  pathOptions={{ 
                    color: '#ffffff', 
                    weight: 2, 
                    opacity: 1,
                    lineCap: 'round',
                    lineJoin: 'round'
                  }} 
                />
              </>
            )}
            {firstRoute && firstRoute[0] === '1' && firstRoute[1] === '5' && (
              <Polyline 
                positions={firstRouteSegment} 
                pathOptions={{ 
                  color: '#00aaff', 
                  weight: 8, 
                  opacity: 0.8,
                  lineCap: 'round',
                  lineJoin: 'round'
                }} 
              />
            )}
            {firstRoute && firstRoute[0] === '7' && (
              <Polyline 
                positions={firstRouteSegment} 
                pathOptions={{ 
                  color: '#cc00ff', 
                  weight: 8, 
                  opacity: 0.85,
                  lineCap: 'round',
                  lineJoin: 'round'
                }} 
              />
            )}
            
            {/* Second Route Segment - DASHED */}
            {secondRoute && secondRoute[0] === '1' && (
              <>
                <Polyline 
                  positions={secondRouteSegment} 
                  pathOptions={{ 
                    color: '#ff0055', 
                    weight: 8, 
                    opacity: 0.4,
                    lineCap: 'round',
                    lineJoin: 'round',
                    dashArray: '10, 10' // Dashed to distinguish second segment
                  }} 
                />
                <Polyline 
                  positions={secondRouteSegment} 
                  pathOptions={{ 
                    color: '#ffffff', 
                    weight: 2, 
                    opacity: 1,
                    lineCap: 'round',
                    lineJoin: 'round'
                  }} 
                />
              </>
            )}
            {secondRoute && secondRoute[0] === '1' && secondRoute[1] === '5' && (
              <Polyline 
                positions={secondRouteSegment} 
                pathOptions={{ 
                  color: '#00aaff', 
                  weight: 8, 
                  opacity: 0.8,
                  lineCap: 'round',
                  lineJoin: 'round',
                  dashArray: '10, 10'
                }} 
              />
            )}
            {secondRoute && secondRoute[0] === '7' && (
              <Polyline 
                positions={secondRouteSegment} 
                pathOptions={{ 
                  color: '#cc00ff', 
                  weight: 8, 
                  opacity: 0.85,
                  lineCap: 'round',
                  lineJoin: 'round',
                  dashArray: '10, 10'
                }} 
              />
            )}

            {/* Third Route Segment - DOTTED (for 2-transfer routes) */}
            {thirdRouteSegment && thirdRoute && thirdRoute[0] === '1' && (
              <>
                <Polyline 
                  positions={thirdRouteSegment} 
                  pathOptions={{ 
                    color: '#ff0055', 
                    weight: 8, 
                    opacity: 0.4,
                    lineCap: 'round',
                    lineJoin: 'round',
                    dashArray: '5, 15' // Dotted to distinguish third segment
                  }} 
                />
                <Polyline 
                  positions={thirdRouteSegment} 
                  pathOptions={{ 
                    color: '#ffffff', 
                    weight: 2, 
                    opacity: 1,
                    lineCap: 'round',
                    lineJoin: 'round'
                  }} 
                />
              </>
            )}
            {thirdRouteSegment && thirdRoute && thirdRoute[0] === '1' && thirdRoute[1] === '5' && (
              <Polyline 
                positions={thirdRouteSegment} 
                pathOptions={{ 
                  color: '#00aaff', 
                  weight: 8, 
                  opacity: 0.8,
                  lineCap: 'round',
                  lineJoin: 'round',
                  dashArray: '5, 15'
                }} 
              />
            )}
            {thirdRouteSegment && thirdRoute && thirdRoute[0] === '7' && (
              <Polyline 
                positions={thirdRouteSegment} 
                pathOptions={{ 
                  color: '#cc00ff', 
                  weight: 8, 
                  opacity: 0.85,
                  lineCap: 'round',
                  lineJoin: 'round',
                  dashArray: '5, 15'
                }} 
              />
            )}
          </>
        ) : (
          <>
            {/* Single Route Display (no transfer) */}
            {selectedRoute === '1' && (
              <>
                <Polyline 
                  positions={segmentCoordinates || (routeDirection === 'D' ? ROUTE_1_COORDINATES : ROUTE_1U_COORDINATES)} 
                  pathOptions={{ 
                    color: '#ff0055', 
                    weight: 8, 
                    opacity: 0.4,
                    lineCap: 'round',
                    lineJoin: 'round'
                  }} 
                />
                <Polyline 
                  positions={segmentCoordinates || (routeDirection === 'D' ? ROUTE_1_COORDINATES : ROUTE_1U_COORDINATES)} 
                  pathOptions={{ 
                    color: '#ffffff', 
                    weight: 2, 
                    opacity: 1,
                    lineCap: 'round',
                    lineJoin: 'round'
                  }} 
                />
              </>
            )}

            {/* ✈️ ROUTE 15: AIRPORT EXPRESS (Blue Neon Line) */}
            {selectedRoute === '15' && (
              <>
                <Polyline 
                  positions={segmentCoordinates || ROUTE_15_COORDINATES} 
                  pathOptions={{ 
                    color: '#00aaff', 
                    weight: 6, 
                    opacity: 0.8,
                    lineCap: 'round',
                    lineJoin: 'round'
                  }} 
                />
              </>
            )}

            {/* 🏟️ ROUTE 7: AIRPORT -> MOTERA STADIUM (Neon Purple Line) */}
            {selectedRoute === '7' && (
              <>
                <Polyline
                  positions={segmentCoordinates || ROUTE_7_COORDINATES}
                  pathOptions={{
                    color: '#cc00ff',
                    weight: 6,
                    opacity: 0.85,
                    lineCap: 'round',
                    lineJoin: 'round'
                  }}
                />
              </>
            )}

            {/* 🎓 ROUTE 4: L.D. COLLEGE -> MEMNAGAR (Orange Line) */}
            {selectedRoute === '4' && (
              <>
                <Polyline
                  positions={segmentCoordinates || ROUTE_4_COORDINATES}
                  pathOptions={{
                    color: '#ff9900',
                    weight: 6,
                    opacity: 0.85,
                    lineCap: 'round',
                    lineJoin: 'round'
                  }}
                />
              </>
            )}
          </>
        )}

        {/* 🚏 OFFICIAL STATION MARKERS (Click to view live info) */}
        {/* Show stations from all routes when transfer is active */}
        {(transferStation || secondTransferStation) && firstRoute && secondRoute ? (
          <>
            {/* Stations from first route segment */}
            {(firstRoute && firstRoute[1] === '5' ? ROUTE_15_STATIONS : firstRoute && firstRoute[0] === '7' ? ROUTE_7_STATIONS : STATIONS).map((station) => {
              const isFirstTransfer = station.name === transferStation
              const isSecondTransfer = station.name === secondTransferStation
              const isTransfer = isFirstTransfer || isSecondTransfer
              
              return (
                <CircleMarker
                  key={`station-first-${station.id}`}
                  center={station.coords}
                  radius={isTransfer ? 12 : 9}
                  pathOptions={{
                    color: isTransfer
                      ? '#ffa500' 
                      : (firstRoute && firstRoute[1] === '5' ? '#00aaff' : firstRoute && firstRoute[0] === '7' ? '#cc00ff' : '#ff0055'),
                    fillColor: isTransfer
                      ? '#ffa500' 
                      : (firstRoute && firstRoute[1] === '5' ? '#00aaff' : firstRoute && firstRoute[0] === '7' ? '#cc00ff' : '#ff0055'),
                    fillOpacity: 1
                  }}
                  weight={isTransfer ? 4 : 3}
                  opacity={1}
                  eventHandlers={{
                    click: () => handleStationClick(station)
                  }}
                >
                  <Popup>
                    {isTransfer ? (
                      <div style={{ textAlign: 'center' }}>
                        <strong>🔄 TRANSFER STATION</strong><br/>
                        {station.name}
                      </div>
                    ) : (
                      station.name
                    )}
                  </Popup>
                </CircleMarker>
              )
            })}
            
            {/* Stations from second route segment */}
            {(secondRoute && secondRoute[1] === '5' ? ROUTE_15_STATIONS : secondRoute && secondRoute[0] === '7' ? ROUTE_7_STATIONS : STATIONS)
              .filter(station => station.name !== transferStation) // Don't duplicate first transfer
              .map((station) => {
                const isSecondTransfer = station.name === secondTransferStation
                
                return (
                  <CircleMarker
                    key={`station-second-${station.id}`}
                    center={station.coords}
                    radius={isSecondTransfer ? 12 : 9}
                    pathOptions={{
                      color: isSecondTransfer 
                        ? '#ffa500' 
                        : (secondRoute && secondRoute[1] === '5' ? '#00aaff' : secondRoute && secondRoute[0] === '7' ? '#cc00ff' : '#ff0055'),
                      fillColor: isSecondTransfer 
                        ? '#ffa500' 
                        : (secondRoute && secondRoute[1] === '5' ? '#00aaff' : secondRoute && secondRoute[0] === '7' ? '#cc00ff' : '#ff0055'),
                      fillOpacity: 1
                    }}
                    weight={isSecondTransfer ? 4 : 3}
                    opacity={1}
                    eventHandlers={{
                      click: () => handleStationClick(station)
                    }}
                  >
                    <Popup>
                      {isSecondTransfer ? (
                        <div style={{ textAlign: 'center' }}>
                          <strong>🔄 TRANSFER STATION</strong><br/>
                          {station.name}
                        </div>
                      ) : (
                        station.name
                      )}
                    </Popup>
                  </CircleMarker>
                )
              })}
            
            {/* Stations from third route segment (if exists) */}
            {thirdRoute && thirdRouteSegment && (
              (thirdRoute && thirdRoute[1] === '5' ? ROUTE_15_STATIONS : thirdRoute && thirdRoute[0] === '7' ? ROUTE_7_STATIONS : STATIONS)
                .filter(station => station.name !== transferStation && station.name !== secondTransferStation)
                .map((station) => (
                  <CircleMarker
                    key={`station-third-${station.id}`}
                    center={station.coords}
                    radius={9}
                    pathOptions={{
                      color: thirdRoute && thirdRoute[1] === '5' ? '#00aaff' : thirdRoute && thirdRoute[0] === '7' ? '#cc00ff' : '#ff0055',
                      fillColor: thirdRoute && thirdRoute[1] === '5' ? '#00aaff' : thirdRoute && thirdRoute[0] === '7' ? '#cc00ff' : '#ff0055',
                      fillOpacity: 1
                    }}
                    weight={3}
                    opacity={1}
                    eventHandlers={{
                      click: () => handleStationClick(station)
                    }}
                  >
                    <Popup>{station.name}</Popup>
                  </CircleMarker>
                ))
            )}
          </>
        ) : (
          /* Single route - show only selected route stations */
          (selectedRoute === '15'
            ? ROUTE_15_STATIONS
            : selectedRoute === '7'
              ? ROUTE_7_STATIONS
              : STATIONS
          )
          .filter((station, index) => {
            // If segment is active, only show stations within the segment
            if (originStationIndex !== null && destinationStationIndex !== null) {
              const minIdx = Math.min(originStationIndex, destinationStationIndex)
              const maxIdx = Math.max(originStationIndex, destinationStationIndex)
              return index >= minIdx && index <= maxIdx
            }
            // Otherwise show all stations
            return true
          })
          .map((station) => (
            <CircleMarker
              key={`station-${station.id}`}
              center={station.coords}
              radius={selectedRoute === '15' || selectedRoute === '7' ? 10 : 9}
              pathOptions={{
                color: selectedStation?.id === station.id
                  ? '#00ffff'
                  : (selectedRoute === '15'
                    ? '#ffffff'
                    : selectedRoute === '7'
                      ? '#ffffff'
                      : '#ffffff'),
                fillColor: selectedRoute === '15'
                  ? '#00aaff'
                  : selectedRoute === '7'
                    ? '#cc00ff'
                    : '#ff0055',
                fillOpacity: 1
              }}
              weight={3}
              opacity={1}
              eventHandlers={{
                click: () => handleStationClick(station)
              }}
            >
              <Popup>{station.name}</Popup>
            </CircleMarker>
          ))
        )}

        {/* 🔄 TRANSFER STATION MARKERS - Show optimal transfer points */}
        {(transferStation || secondTransferStation) && (
          <>
            {/* First Transfer Station Marker */}
            {transferStation && (() => {
              const stationsList = firstRoute && firstRoute[1] === '5' ? ROUTE_15_STATIONS : firstRoute && firstRoute[0] === '7' ? ROUTE_7_STATIONS : STATIONS
              const stationObj = stationsList.find(s => s.name === transferStation)
              
              if (!stationObj) return null
              
              return (
                <Marker
                  key={`transfer-1-${transferStation}`}
                  position={stationObj.coords}
                  icon={L.divIcon({
                    html: `<div style="
                      width: 40px;
                      height: 40px;
                      background: radial-gradient(circle, #ffa500 0%, #ff8c00 70%);
                      border: 3px solid #ffffff;
                      border-radius: 50%;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      font-size: 20px;
                      box-shadow: 0 0 20px rgba(255, 165, 0, 0.8), 0 0 40px rgba(255, 165, 0, 0.4);
                      cursor: pointer;
                    ">🔄</div>`,
                    iconSize: [40, 40],
                    className: 'transfer-icon'
                  })}
                  eventHandlers={{
                    click: () => {
                      console.log('Transfer Station 1 clicked:', stationObj)
                      handleStationClick(stationObj)
                    }
                  }}
                >
                  <Popup>
                    <div style={{ textAlign: 'center' }}>
                      <strong>🔄 Transfer Point 1</strong><br/>
                      {transferStation}
                    </div>
                  </Popup>
                </Marker>
              )
            })()}
            
            {/* Second Transfer Station Marker */}
            {secondTransferStation && (() => {
              const stationsList = secondRoute && secondRoute[1] === '5' ? ROUTE_15_STATIONS : secondRoute && secondRoute[0] === '7' ? ROUTE_7_STATIONS : STATIONS
              const stationObj = stationsList.find(s => s.name === secondTransferStation)
              
              if (!stationObj) return null
              
              return (
                <Marker
                  key={`transfer-2-${secondTransferStation}`}
                  position={stationObj.coords}
                  icon={L.divIcon({
                    html: `<div style="
                      width: 40px;
                      height: 40px;
                      background: radial-gradient(circle, #ffa500 0%, #ff8c00 70%);
                      border: 3px solid #ffffff;
                      border-radius: 50%;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      font-size: 20px;
                      box-shadow: 0 0 20px rgba(255, 165, 0, 0.8), 0 0 40px rgba(255, 165, 0, 0.4);
                      cursor: pointer;
                    ">🔄</div>`,
                    iconSize: [40, 40],
                    className: 'transfer-icon'
                  })}
                  eventHandlers={{
                    click: () => {
                      console.log('Transfer Station 2 clicked:', stationObj)
                      handleStationClick(stationObj)
                    }
                  }}
                >
                  <Popup>
                    <div style={{ textAlign: 'center' }}>
                      <strong>🔄 Transfer Point 2</strong><br/>
                      {secondTransferStation}
                    </div>
                  </Popup>
                </Marker>
              )
            })()}
          </>
        )}

        {/* MOVING BUS ICONS WITH ROTATION - HIGH-FIDELITY */}
        {/* Route 1 - Multiple Parallel Buses */}
        {selectedRoute === '1' && (
          <>
            {/* Primary Bus */}
            <Marker
              position={getPositionAlongRoute(routeDirection === 'D' ? ROUTE_1_COORDINATES : ROUTE_1U_COORDINATES, bus1Progress).position}
              icon={createBusIcon('#ff0055', bus1Bearing)}
            />
            {/* Parallel Bus A */}
            <Marker
              position={getPositionAlongRoute(routeDirection === 'D' ? ROUTE_1_COORDINATES : ROUTE_1U_COORDINATES, bus1aProgress).position}
              icon={createBusIcon('#ff0055', bus1aBearing)}
            />
            {/* Parallel Bus B */}
            <Marker
              position={getPositionAlongRoute(routeDirection === 'D' ? ROUTE_1_COORDINATES : ROUTE_1U_COORDINATES, bus1bProgress).position}
              icon={createBusIcon('#ff0055', bus1bBearing)}
            />
          </>
        )}

        {/* Route 15 - Multiple Parallel Buses */}
        {selectedRoute === '15' && (
          <>
            {/* Primary Bus */}
            <Marker
              position={getPositionAlongRoute(ROUTE_15_COORDINATES, bus15Progress).position}
              icon={createBusIcon('#00aaff', bus15Bearing)}
            />
            {/* Parallel Bus A */}
            <Marker
              position={getPositionAlongRoute(ROUTE_15_COORDINATES, bus15aProgress).position}
              icon={createBusIcon('#00aaff', bus15aBearing)}
            />
          </>
        )}

        {/* Route 7 - Multiple Parallel Buses */}
        {selectedRoute === '7' && (
          <>
            {/* Primary Bus */}
            <Marker
              position={getPositionAlongRoute(ROUTE_7_COORDINATES, bus7Progress).position}
              icon={createBusIcon('#cc00ff', bus7Bearing)}
            />
            {/* Parallel Bus A */}
            <Marker
              position={getPositionAlongRoute(ROUTE_7_COORDINATES, bus7aProgress).position}
              icon={createBusIcon('#cc00ff', bus7aBearing)}
            />
          </>
        )}

        {/* Route 4 - Multiple Parallel Buses */}
        {selectedRoute === '4' && (
          <>
            {/* Primary Bus */}
            <Marker
              position={getPositionAlongRoute(ROUTE_4_COORDINATES, bus4Progress).position}
              icon={createBusIcon('#ff9900', bus4Bearing)}
            />
            {/* Parallel Bus A */}
            <Marker
              position={getPositionAlongRoute(ROUTE_4_COORDINATES, bus4aProgress).position}
              icon={createBusIcon('#ff9900', bus4aBearing)}
            />
          </>
        )}
      </MapContainer>

      {/* UNIFIED TOP STATUS BAR (Glassmorphism) */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '70px',
          zIndex: 1000,
          background: 'rgba(10, 10, 10, 0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.3)',
        }}
      >
        {/* LEFT: APP LOGO */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 700, fontSize: '16px', letterSpacing: '0.5px', minWidth: '200px' }}>
          <Bus size={22} color="#2979ff" />
          <span>Transit-Flow AI</span>
        </div>

        {/* CENTER: SEARCH BAR & CONTROLS */}
        <div style={{
          display: 'flex',
          gap: '16px',
          alignItems: 'center',
          flex: 1,
          justifyContent: 'center',
          maxWidth: '600px'
        }}>
          {/* LIVE/PREDICTED TOGGLE */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <button
              onClick={() => setLiveMode(true)}
              style={{
                padding: '6px 12px',
                background: liveMode ? 'rgba(255, 0, 85, 0.25)' : 'rgba(100, 100, 100, 0.15)',
                border: `1px solid ${liveMode ? 'rgba(255, 0, 85, 0.5)' : 'rgba(100, 100, 100, 0.3)'}`,
                borderRadius: '8px',
                color: liveMode ? '#ff0055' : '#888',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {liveMode && (
                <span style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: '#00ff99',
                  animation: 'pulse-green 2s infinite',
                  boxShadow: '0 0 8px #00ff99',
                }} />
              )}
              Live
            </button>
            
          </div>

          <div style={{ width: '1px', height: '24px', background: 'rgba(255, 255, 255, 0.1)' }} />

          {/* JOURNEY PLANNER: FROM → TO */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* Start Location Input */}
            <input
              type="text"
              list="mainStartList"
              onChange={(e) => setOrigin(e.target.value)}
              value={origin}
              placeholder="📍 Start..."
              style={{
                padding: '8px 12px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 500,
                outline: 'none',
                width: '140px',
                transition: 'all 0.2s',
              }}
              onFocus={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.1)'
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)'
              }}
              onBlur={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.05)'
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)'
              }}
            />
            <datalist id="mainStartList">
              {UNIQUE_STATIONS && UNIQUE_STATIONS.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>

            <span style={{ color: '#666', fontSize: '16px' }}>➔</span>

            {/* Destination Input */}
            <input
              type="text"
              list="mainDestList"
              onChange={(e) => setDestination(e.target.value)}
              value={destination}
              placeholder="🏁 Dest..."
              style={{
                padding: '8px 12px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 500,
                outline: 'none',
                width: '140px',
                transition: 'all 0.2s',
              }}
              onFocus={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.1)'
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)'
              }}
              onBlur={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.05)'
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)'
              }}
            />
            <datalist id="mainDestList">
              {UNIQUE_STATIONS && UNIQUE_STATIONS.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>

            <button
              onClick={() => {
                if (origin && destination) {
                  setTimeout(() => findRoute(), 50)
                }
              }}
              style={{
                padding: '8px 14px',
                background: 'rgba(41, 121, 255, 0.2)',
                border: '1px solid rgba(41, 121, 255, 0.5)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              Find Bus 🔍
            </button>
            
            {/* Clear Segment Filter Button - Only show when segment or transfer is active */}
            {(segmentCoordinates || transferStation) && (
              <button
                onClick={() => {
                  setSegmentCoordinates(null)
                  setOriginStationIndex(null)
                  setDestinationStationIndex(null)
                  setOrigin('')
                  setDestination('')
                  setTransferStation(null)
                  setFirstRouteSegment(null)
                  setSecondRouteSegment(null)
                  setFirstRoute(null)
                  setSecondRoute(null)
                }}
                style={{
                  padding: '8px 14px',
                  background: 'rgba(255, 0, 85, 0.2)',
                  border: '1px solid rgba(255, 0, 85, 0.5)',
                  borderRadius: '8px',
                  color: '#ff0055',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {transferStation ? 'Clear Transfer 🔄' : 'Show Full Route 🔄'}
              </button>
            )}
          </div>
        </div>

        {/* RIGHT: CLOCK & WEATHER */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', minWidth: '200px', justifyContent: 'flex-end' }}>
          {/* Digital Clock */}
          <div style={{
            fontSize: '16px',
            fontWeight: 700,
            fontFamily: 'monospace',
            letterSpacing: '1px',
            color: '#00ff99',
            textShadow: '0 0 10px rgba(0, 255, 153, 0.5)',
          }}>
            {formatDigitalClock()}
          </div>
          
          <div style={{ width: '1px', height: '24px', background: 'rgba(255, 255, 255, 0.1)' }} />
          
          {/* Live Weather */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600 }}>
            <Cloud size={16} color="#2979ff" />
            <span>
              {weather.loading ? 'Loading...' : `${weather.temp}°C • ${weather.isDay ? 'Day' : 'Night'}`}
            </span>
          </div>
        </div>
      </motion.div>

      {/* BOTTOM INTELLIGENCE HUB */}
      <AnimatePresence>
        {showInsights && !origin && (
          /* WELCOME SCREEN - Show when no journey is selected */
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 22 }}
            style={{
              position: 'absolute',
              bottom: '30px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 1000,
              background: 'rgba(10, 10, 10, 0.9)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              borderRadius: '24px',
              padding: '32px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              width: '90%',
              maxWidth: '500px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6)',
              color: '#fff',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚌</div>
              <h1 style={{ margin: '0 0 12px 0', fontSize: '24px', fontWeight: 700 }}>
                Welcome to Transit-Flow AI
              </h1>
              <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: '#aaa' }}>
                Real-time bus tracking with AI-powered insights
              </p>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                marginBottom: '24px',
              }}>
                <div style={{
                  padding: '16px',
                  background: 'rgba(255, 0, 85, 0.1)',
                  border: '1px solid rgba(255, 0, 85, 0.3)',
                  borderRadius: '12px',
                }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>📍</div>
                  <div style={{ fontSize: '12px', fontWeight: 600 }}>Smart Routes</div>
                  <div style={{ fontSize: '10px', color: '#888', marginTop: '4px' }}>3 Active Routes</div>
                </div>
                <div style={{
                  padding: '16px',
                  background: 'rgba(0, 170, 255, 0.1)',
                  border: '1px solid rgba(0, 170, 255, 0.3)',
                  borderRadius: '12px',
                }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏱️</div>
                  <div style={{ fontSize: '12px', fontWeight: 600 }}>Live ETA</div>
                  <div style={{ fontSize: '10px', color: '#888', marginTop: '4px' }}>Real-time Updates</div>
                </div>
                <div style={{
                  padding: '16px',
                  background: 'rgba(0, 255, 153, 0.1)',
                  border: '1px solid rgba(0, 255, 153, 0.3)',
                  borderRadius: '12px',
                }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔄</div>
                  <div style={{ fontSize: '12px', fontWeight: 600 }}>Transfers</div>
                  <div style={{ fontSize: '10px', color: '#888', marginTop: '4px' }}>Multi-Route Support</div>
                </div>
                <div style={{
                  padding: '16px',
                  background: 'rgba(204, 0, 255, 0.1)',
                  border: '1px solid rgba(204, 0, 255, 0.3)',
                  borderRadius: '12px',
                }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>🤖</div>
                  <div style={{ fontSize: '12px', fontWeight: 600 }}>AI Insights</div>
                  <div style={{ fontSize: '10px', color: '#888', marginTop: '4px' }}>Crowd & Comfort</div>
                </div>
              </div>

              <div style={{
                background: 'rgba(100, 100, 100, 0.2)',
                border: '1px solid rgba(100, 100, 100, 0.3)',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '20px',
                textAlign: 'left',
              }}>
                <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px', color: '#00ff99' }}>
                  🎯 How to Use:
                </div>
                <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '11px', color: '#aaa' }}>
                  <li>Select your <strong>Start Location</strong></li>
                  <li>Choose your <strong>Destination</strong></li>
                  <li>Click <strong>Find Bus 🔍</strong></li>
                  <li>View live ETA & crowd info</li>
                </ol>
              </div>

              <div style={{ fontSize: '11px', color: '#888' }}>
                ✨ <strong>Smart Transfer Logic</strong>: Automatically finds the best route combination with optimal transfer points
              </div>
            </div>
          </motion.div>
        )}

        {showInsights && origin && (
          /* LIVE TRANSIT DATA - Show when journey is selected */
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 22 }}
            style={{
              position: 'absolute',
              bottom: '30px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 1000,
              background: 'rgba(10, 10, 10, 0.8)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              borderRadius: '24px',
              padding: '28px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              width: '90%',
              maxWidth: '440px',
              maxHeight: '70vh',
              overflowY: 'auto',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6)',
              color: '#fff',
            }}
          >
            {/* TRANSFER INDICATOR - Show when multi-route journey is active */}
            {transferStation && (
              <div style={{
                marginBottom: '18px',
                padding: '14px',
                background: 'linear-gradient(135deg, rgba(255, 153, 0, 0.15), rgba(255, 0, 85, 0.15))',
                border: '1px solid rgba(255, 153, 0, 0.4)',
                borderRadius: '12px',
                textAlign: 'center',
              }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '11px', color: '#ffa500', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
                  🔄 TRANSFER REQUIRED
                </p>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff', marginBottom: '6px' }}>
                  {firstRoute} → {secondRoute}
                </div>
                <div style={{ fontSize: '12px', color: '#00ff99', fontWeight: 600 }}>
                  Change at: {transferStation}
                </div>
                <div style={{ fontSize: '10px', color: '#888', marginTop: '6px' }}>
                  {origin} → {transferStation} → {destination}
                </div>
              </div>
            )}
            
            {/* HEADER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, letterSpacing: '0.5px' }}>
                  Route {selectedRoute}: {startNode} ➔ {endNode}
                </h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#888' }}>
                  {getRouteDirectionLabel(routeDirection)} • Live Transit Data
                </p>
              </div>
              <button
                onClick={() => setShowInsights(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#666',
                  cursor: 'pointer',
                  padding: '4px',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => (e.target.style.color = '#fff')}
                onMouseLeave={(e) => (e.target.style.color = '#666')}
              >
                <X size={20} />
              </button>
            </div>

            {/* BUS STATUS INDICATOR */}
            <div style={{
              marginBottom: '16px',
              padding: '12px',
              background: isBoarding ? 'rgba(255, 153, 0, 0.15)' : 'rgba(0, 255, 153, 0.15)',
              border: `1px solid ${isBoarding ? 'rgba(255, 153, 0, 0.3)' : 'rgba(0, 255, 153, 0.3)'}`,
              borderRadius: '10px',
              textAlign: 'center',
            }}>
              <p style={{ margin: 0, fontSize: '12px', color: isBoarding ? '#ffa500' : '#00ff99', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {busStatus}
              </p>
            </div>

            {/* ARRIVAL ETA - DYNAMIC BASED ON BUS POSITION */}
            <div style={{
              textAlign: 'center',
              marginBottom: '24px',
              padding: '16px',
              background: isApproaching ? 'rgba(0, 255, 153, 0.15)' : hasLeft ? 'rgba(255, 153, 0, 0.15)' : 'rgba(255, 0, 85, 0.15)',
              border: `1px solid ${isApproaching ? 'rgba(0, 255, 153, 0.3)' : hasLeft ? 'rgba(255, 153, 0, 0.3)' : 'rgba(255, 0, 85, 0.3)'}`,
              borderRadius: '12px',
            }}>
              <p style={{ margin: '0 0 4px 0', fontSize: '11px', color: '#aaa', textTransform: 'uppercase', fontWeight: 600 }}>
                {isLoadingInsight ? '🤖 AI Agent Analyzing...' : isApproaching ? 'Bus Approaching' : hasLeft ? 'Next Bus In' : 'Arriving At'}
              </p>
              <div style={{ fontSize: '32px', fontWeight: 700, color: isApproaching ? '#00ff99' : hasLeft ? '#ffa500' : '#ff0055', letterSpacing: '1px' }}>
                {isLoadingInsight ? '...' : `${etaMinutes} min`}
              </div>
              <div style={{ marginTop: '8px' }}>
                <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: isApproaching ? '#00ff99' : hasLeft ? '#ffa500' : '#888', fontWeight: 600 }}>
                  {busStatusMessage}
                </p>
                {origin && (
                  <p style={{ margin: '6px 0 0 0', fontSize: '10px', color: '#888' }}>
                    Station: {origin}
                  </p>
                )}
                {hasLeft && (
                  <p style={{ margin: '4px 0 0 0', fontSize: '9px', color: '#666' }}>
                    Frequency: Every {frequencyMinutes.toFixed(1)} min
                  </p>
                )}
              </div>
            </div>

            {/* CROWD LEVEL FROM INSIGHT */}
            {insightData && !isLoadingInsight && (
              <div style={{
                marginBottom: '24px',
                padding: '16px',
                background: insightData.crowd.includes('Standing') 
                  ? 'rgba(255, 0, 85, 0.15)' 
                  : insightData.crowd.includes('Mixed') 
                    ? 'rgba(255, 204, 0, 0.15)'
                    : 'rgba(0, 255, 153, 0.15)',
                border: `1px solid ${insightData.crowd.includes('Standing') 
                  ? 'rgba(255, 0, 85, 0.3)' 
                  : insightData.crowd.includes('Mixed') 
                    ? 'rgba(255, 204, 0, 0.3)'
                    : 'rgba(0, 255, 153, 0.3)'}`,
                borderRadius: '12px',
                textAlign: 'center',
              }}>
                <p style={{ margin: '0 0 4px 0', fontSize: '11px', color: '#aaa', textTransform: 'uppercase', fontWeight: 600 }}>
                  Crowd Level
                </p>
                <div style={{ 
                  fontSize: '20px', 
                  fontWeight: 700, 
                  color: insightData.crowd.includes('Standing') ? '#ff0055' : insightData.crowd.includes('Mixed') ? '#ffcc00' : '#00ff99',
                  letterSpacing: '0.5px' 
                }}>
                  {insightData.crowd}
                </div>
                <p style={{ margin: '8px 0 0 0', fontSize: '11px', color: '#888' }}>
                  Frequency: Every {insightData.frequency} min
                </p>
              </div>
            )}

            {/* COMFORT METER WITH SPARKLINE */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '12px', color: '#aaa', fontWeight: 600, textTransform: 'uppercase' }}>Comfort Level</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: getGradientColor(comfort) }}>{comfort}%</span>
              </div>
              <div style={{
                width: '100%',
                height: '12px',
                background: 'rgba(255, 255, 255, 0.08)',
                borderRadius: '8px',
                overflow: 'hidden',
              }}>
                <div
                  style={{
                    width: `${comfort}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #00ff99 0%, #ffcc00 50%, #ff0055 100%)',
                    borderRadius: '8px',
                    transition: 'width 0.5s ease',
                  }}
                />
              </div>

              {/* SPARKLINE GRAPH */}
              <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '10px' }}>
                <p style={{ fontSize: '10px', color: '#666', marginBottom: '8px', textTransform: 'uppercase' }}>Next Hour Density</p>
                <svg width="100%" height="40" style={{ display: 'block' }}>
                  <polyline
                    points={crowdData.map((val, i) => `${(i / (crowdData.length - 1)) * 100}%,${40 - (val / 100) * 35}`).join(' ')}
                    fill="none"
                    stroke={getGradientColor(comfort)}
                    strokeWidth="2.5"
                    opacity="0.8"
                  />
                  {crowdData.map((val, i) => (
                    <circle
                      key={i}
                      cx={`${(i / (crowdData.length - 1)) * 100}%`}
                      cy={40 - (val / 100) * 35}
                      r="2.5"
                      fill={getGradientColor(val)}
                    />
                  ))}
                </svg>
              </div>
            </div>

            {/* ACTION BUTTON WITH REDIRECTING STATE */}
            {/* Smart route switching based on occupancy - only show if alternative route exists for journey */}
            {(() => {
              // Check if an alternative route exists for this origin-destination pair
              const alternateRoute = selectedRoute === '1' ? '15' : '1'
              const currentRouteStations = currentStations
              const alternateRouteStations = alternateRoute === '1' ? STATIONS : ROUTE_15_STATIONS
              
              // Check if both origin and destination exist on alternate route
              const originOnAlternate = alternateRouteStations.some(s => s.name === origin)
              const destOnAlternate = alternateRouteStations.some(s => s.name === destination)
              const hasAlternativeRoute = originOnAlternate && destOnAlternate
              
              // Only show button if alternative route exists
              if (!hasAlternativeRoute) return null
              
              const currentLoad = comfort
              const alternateLoad = busData[alternateRoute]?.load || 0
              const shouldSuggestSwitch = alternateLoad < currentLoad - 10
              
              return (
                <button
                  onClick={switchRoute}
                  disabled={isRedirecting}
                  style={{
                    width: '100%',
                    padding: '16px 20px',
                    background: isRedirecting 
                      ? 'linear-gradient(135deg, #666 0%, #888 100%)'
                      : shouldSuggestSwitch
                        ? 'linear-gradient(135deg, #00ff99 0%, #00d4ff 100%)'
                        : 'linear-gradient(135deg, #2979ff 0%, #00d4ff 100%)',
                    border: `1px solid ${isRedirecting ? 'rgba(100, 100, 100, 0.5)' : shouldSuggestSwitch ? 'rgba(0, 255, 153, 0.5)' : 'rgba(41, 121, 255, 0.5)'}`,
                    borderRadius: '14px',
                    color: '#fff',
                    fontSize: '15px',
                    fontWeight: 700,
                    cursor: isRedirecting ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s',
                    boxShadow: isRedirecting 
                      ? '0 4px 12px rgba(0, 0, 0, 0.3)'
                      : shouldSuggestSwitch
                        ? '0 8px 24px rgba(0, 255, 153, 0.4)'
                        : '0 8px 24px rgba(41, 121, 255, 0.4)',
                  }}
                  onMouseEnter={(e) => {
                    if (!isRedirecting) {
                      e.target.style.transform = 'translateY(-2px)'
                      e.target.style.boxShadow = shouldSuggestSwitch 
                        ? '0 12px 32px rgba(0, 255, 153, 0.6)'
                        : '0 12px 32px rgba(41, 121, 255, 0.6)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isRedirecting) {
                      e.target.style.transform = 'translateY(0)'
                      e.target.style.boxShadow = shouldSuggestSwitch 
                        ? '0 8px 24px rgba(0, 255, 153, 0.4)'
                        : '0 8px 24px rgba(41, 121, 255, 0.4)'
                    }
                  }}
                >
                  {isRedirecting ? '⏳ Redirecting...' : (
                    shouldSuggestSwitch 
                      ? `💚 Switch to Route ${alternateRoute} - Better Comfort (${alternateLoad}% vs ${currentLoad}%)`
                      : `↩️ Heading to ${destination || 'Destination'}`
                  )}
                </button>
              )
            })()}
            

            {/* FOOTER */}
            <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '11px', color: '#666' }}>
              ✓ {selectedRoute === '1' ? 'Airport Express available with live updates' : `Route ${selectedRoute} - ${origin || 'Start'} to ${destination || 'End'}`}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 📍 STATION INFO CARD (Bottom Left) */}
      <AnimatePresence>
        {selectedStation && (
          <motion.div
            initial={{ x: -30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -30, opacity: 0 }}
            transition={{ type: 'spring', damping: 22 }}
            style={{
              position: 'fixed',
              left: '20px',
              bottom: '20px',
              width: '300px',
              background: 'rgba(10, 10, 10, 0.75)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '16px',
              padding: '16px',
              zIndex: 999,
              boxShadow: '0 12px 40px rgba(0, 0, 0, 0.4)',
              color: '#fff'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
                {selectedStation.name}
              </h3>
              <button
                onClick={() => {
                  setSelectedStation(null)
                  setStationAnalytics(null)
                  setIsStationLoading(false)
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#bbb',
                  cursor: 'pointer',
                  fontSize: '18px'
                }}
              >
                ×
              </button>
            </div>

            <div style={{ marginTop: '10px', display: 'grid', gap: '8px' }}>
              <div style={{ fontSize: '12px', color: '#00eaff', fontWeight: 600 }}>
                🟢 Live Feed
              </div>
              <div style={{ fontSize: '13px', color: '#eee' }}>
                Crowd: {isStationLoading ? 'Loading...' : (stationAnalytics?.occupancy ?? 'Loading...')}
              </div>
              <div style={{ fontSize: '13px', color: '#eee' }}>
                Incoming: {isStationLoading ? 'Loading...' : (stationAnalytics?.nextBus ?? 'Loading...')}
              </div>
              <div style={{ fontSize: '13px', color: '#eee' }}>
                Trend: {isStationLoading ? 'Loading...' : (stationAnalytics?.trend ?? 'Loading...')}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🤖 AI AGENT TOAST NOTIFICATION */}
      <AnimatePresence>
        {showAgentToast && (
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            style={{
              position: 'fixed',
              top: '90px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(10, 10, 10, 0.95)',
              border: '1px solid rgba(0, 255, 153, 0.5)',
              borderRadius: '12px',
              padding: '14px 20px',
              fontSize: '13px',
              color: '#00ff99',
              zIndex: 1001,
              backdropFilter: 'blur(16px)',
              fontWeight: 600,
              boxShadow: '0 8px 24px rgba(0, 255, 153, 0.2)',
            }}
          >
            {agentToastText}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🤖 TRANSIT-GUARD AI AGENT BUTTON */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        onClick={() => setIsAgentOpen(!isAgentOpen)}
        style={{
          position: 'fixed',
          bottom: '100px',
          right: '30px',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #00ff99 0%, #00d4ff 100%)',
          border: '2px solid rgba(255, 255, 255, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 999,
          transition: 'all 0.3s',
          boxShadow: '0 8px 24px rgba(0, 255, 153, 0.4)',
          fontSize: '24px'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 12px 32px rgba(0, 255, 153, 0.6)'
          e.currentTarget.style.transform = 'scale(1.05)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 255, 153, 0.4)'
          e.currentTarget.style.transform = 'scale(1)'
        }}
      >
        🤖
      </motion.button>

      {/* 🤖 AI AGENT CONVERSATION WINDOW */}
      <AnimatePresence>
        {isAgentOpen && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            style={{
              position: 'fixed',
              bottom: '170px',
              right: '24px',
              background: 'rgba(10, 10, 10, 0.95)',
              border: '1px solid rgba(0, 255, 153, 0.3)',
              borderRadius: '16px',
              width: '340px',
              maxHeight: '450px',
              zIndex: 1000,
              backdropFilter: 'blur(20px)',
              boxShadow: '0 12px 48px rgba(0,0,0,0.6)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* AGENT HEADER */}
            <div style={{ 
              padding: '16px', 
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'linear-gradient(135deg, rgba(0, 255, 153, 0.1) 0%, rgba(0, 212, 255, 0.1) 100%)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '20px' }}>🤖</span>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>Transit Guard AI</div>
                  <div style={{ fontSize: '11px', color: '#00ff99' }}>● Active Monitoring</div>
                </div>
              </div>
              <button
                onClick={() => setIsAgentOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer', fontSize: '20px' }}
              >
                ×
              </button>
            </div>

            {/* AGENT MESSAGES */}
            <div style={{ 
              padding: '16px', 
              maxHeight: '350px', 
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              {agentMessages.length === 0 ? (
                <div style={{ color: '#666', fontSize: '13px', textAlign: 'center', paddingTop: '20px' }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>🚀</div>
                  <div>AI Agent monitoring your route...</div>
                  <div style={{ marginTop: '8px', fontSize: '12px' }}>Updates every 15 seconds</div>
                </div>
              ) : (
                agentMessages.map((msg, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '10px' }}>
                    <span style={{ fontSize: '16px', flexShrink: 0 }}>{msg.icon}</span>
                    <div>
                      <div style={{ fontSize: '12px', color: '#fff', lineHeight: 1.4 }}>{msg.text}</div>
                      <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>{msg.time}</div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* AGENT QUICK ACTIONS */}
            <div style={{
              padding: '12px',
              borderTop: '1px solid rgba(255,255,255,0.08)',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px'
            }}>
              <button
                style={{
                  padding: '8px',
                  background: 'rgba(0, 255, 153, 0.15)',
                  border: '1px solid rgba(0, 255, 153, 0.3)',
                  borderRadius: '8px',
                  color: '#00ff99',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.background = 'rgba(0, 255, 153, 0.25)'}
                onMouseLeave={(e) => e.target.style.background = 'rgba(0, 255, 153, 0.15)'}
              >
                📍 Where's Bus?
              </button>
              <button
                style={{
                  padding: '8px',
                  background: 'rgba(41, 121, 255, 0.15)',
                  border: '1px solid rgba(41, 121, 255, 0.3)',
                  borderRadius: '8px',
                  color: '#2979ff',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.background = 'rgba(41, 121, 255, 0.25)'}
                onMouseLeave={(e) => e.target.style.background = 'rgba(41, 121, 255, 0.15)'}
              >
                ✨ Best Route
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ACCESSIBILITY - HELP BUTTON */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        onClick={() => setShowHelp(!showHelp)}
        style={{
          position: 'fixed',
          bottom: '30px',
          right: '30px',
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          background: 'rgba(41, 121, 255, 0.25)',
          border: '1px solid rgba(41, 121, 255, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 999,
          transition: 'all 0.3s',
          boxShadow: '0 4px 16px rgba(41, 121, 255, 0.2)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(41, 121, 255, 0.4)'
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(41, 121, 255, 0.4)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(41, 121, 255, 0.25)'
          e.currentTarget.style.boxShadow = '0 4px 16px rgba(41, 121, 255, 0.2)'
        }}
      >
        <MessageCircle size={24} color="#2979ff" />
      </motion.button>

      {/* CHATBOT WINDOW */}
      <AnimatePresence>
        {showHelp && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            style={{
              position: 'fixed',
              bottom: '90px',
              right: '24px',
              background: 'rgba(10, 10, 10, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              width: '320px',
              maxHeight: '400px',
              zIndex: 1000,
              backdropFilter: 'blur(16px)',
              boxShadow: '0 12px 48px rgba(0,0,0,0.6)',
            }}
          >
            {/* CHATBOT HEADER */}
            <div style={{ 
              padding: '16px', 
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MessageCircle size={18} color="#2979ff" />
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>Transit Assist</span>
              </div>
              <button
                onClick={() => { setShowHelp(false); setSelectedFAQ(null) }}
                style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* CHATBOT CONTENT */}
            <div style={{ padding: '16px', maxHeight: '300px', overflowY: 'auto' }}>
              {!selectedFAQ ? (
                <div>
                  <p style={{ fontSize: '12px', color: '#888', marginBottom: '12px' }}>Ask about fares, routes, distances & transfers</p>
                  <p style={{ fontSize: '11px', color: '#666', marginBottom: '16px' }}>Or type your question below:</p>
                  {faqs.map((faq, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedFAQ(faq)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        background: 'rgba(41, 121, 255, 0.1)',
                        border: '1px solid rgba(41, 121, 255, 0.3)',
                        borderRadius: '10px',
                        color: '#fff',
                        fontSize: '13px',
                        textAlign: 'left',
                        cursor: 'pointer',
                        marginBottom: '8px',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => e.target.style.background = 'rgba(41, 121, 255, 0.2)'}
                      onMouseLeave={(e) => e.target.style.background = 'rgba(41, 121, 255, 0.1)'}
                    >
                      {faq.q}
                    </button>
                  ))}
                  
                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <input
                      type="text"
                      placeholder="Type your question..."
                      style={{
                        width: '100%',
                        padding: '10px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '6px',
                        color: '#fff',
                        fontSize: '12px',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                      onFocus={(e) => {
                        e.target.style.background = 'rgba(255, 255, 255, 0.1)'
                        e.target.style.borderColor = 'rgba(41, 121, 255, 0.5)'
                      }}
                      onBlur={(e) => {
                        e.target.style.background = 'rgba(255, 255, 255, 0.05)'
                        e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)'
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.target.value.trim()) {
                          const userQuery = e.target.value.trim()
                          const answer = handleCustomQuery(userQuery)
                          setSelectedFAQ({
                            q: userQuery,
                            a: answer
                          })
                          e.target.value = ''
                        }
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{
                    padding: '12px',
                    background: 'rgba(100, 100, 100, 0.2)',
                    borderRadius: '10px',
                    marginBottom: '12px',
                    fontSize: '13px',
                    color: '#fff'
                  }}>
                    {selectedFAQ.q}
                  </div>
                  <div style={{
                    padding: '12px',
                    background: 'rgba(41, 121, 255, 0.15)',
                    border: '1px solid rgba(41, 121, 255, 0.3)',
                    borderRadius: '10px',
                    fontSize: '13px',
                    color: '#fff',
                    lineHeight: '1.5'
                  }}>
                    {selectedFAQ.a}
                  </div>
                  <button
                    onClick={() => setSelectedFAQ(null)}
                    style={{
                      marginTop: '12px',
                      padding: '8px 16px',
                      background: 'rgba(100, 100, 100, 0.2)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      color: '#aaa',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    ← Back to FAQs
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FLOATING LIVE UPDATES PILL - RE-OPEN INSIGHTS */}
      {!showInsights && (
        <motion.button
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          onClick={() => setShowInsights(true)}
          style={{
            position: 'fixed',
            bottom: '30px',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '12px 24px',
            borderRadius: '24px',
            background: 'rgba(41, 121, 255, 0.2)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(41, 121, 255, 0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer',
            zIndex: 999,
            boxShadow: '0 8px 24px rgba(41, 121, 255, 0.3)',
            color: '#fff',
            fontSize: '14px',
            fontWeight: 600,
          }}
          whileHover={{ scale: 1.05, boxShadow: '0 12px 32px rgba(41, 121, 255, 0.5)' }}
        >
          <Activity size={20} color="#2979ff" />
          <span>Live Updates</span>
        </motion.button>
      )}
    </div>
  )
}
