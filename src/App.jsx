import React, { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup, Marker, useMap } from 'react-leaflet'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Bus, HelpCircle, Cloud, Activity, MessageCircle } from 'lucide-react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './App.css'
import { REAL_ROUTE_1, STATIONS, ROUTE_15_COORDINATES, ROUTE_15_STATIONS, ROUTE_7_COORDINATES, ROUTE_7_STATIONS, getStationAnalytics } from './RouteCoordinates'

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
const STOPS = ['Shivranjani', 'Ramdev Nagar', 'ISKCON']
const STOPS_COORDS = {
  'Shivranjani': [23.02685, 72.53738],  // Index 0
  'Ramdev Nagar': [23.02530, 72.52420], // Index 8 (STOP POINT)
  'ISKCON': [23.02310, 72.50680],       // Index 16
}

// 🧭 JOURNEY PLANNER: ROUTE LOOKUP + UNIQUE STATION LIST
const ROUTE_MAP = {
  '1': STATIONS,
  '15': ROUTE_15_STATIONS,
  '7': ROUTE_7_STATIONS
}

const UNIQUE_STATIONS = [
  ...new Set([
    ...STATIONS,
    ...ROUTE_15_STATIONS,
    ...ROUTE_7_STATIONS
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
  { icon: '✅', text: 'Route 1D running on schedule. Expect to arrive on time.', severity: 'success' },
  { icon: '📊', text: 'Crowd surge at Ramdev Nagar Hub. Standing room only expected.', severity: 'info' },
  { icon: '🚀', text: 'Optimal time to travel: Next bus arriving in 2 minutes.', severity: 'success' },
  { icon: '⏱️', text: 'Slight delay detected. Expected ETL +3 mins due to peak traffic.', severity: 'warning' },
  { icon: '🌧️', text: 'Light rain reported. No route changes needed.', severity: 'info' },
  { icon: '📍', text: 'Bus 1D at Ramdev Nagar Hub. Next stop: ISKCON in 5 mins.', severity: 'info' },
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

// FAQ Data - Hardcoded Knowledge Base
const faqs = [
  { q: 'What is the fare to ISKCON?', a: `Fare from Shivranjani to ISKCON is ₹${calculateFare(0, 2)} (₹5 base + ₹2 per stop)` },
  { q: 'When is the next bus?', a: 'Next 1D bus is in 4 mins. Route 12D in 7 mins.' },
  { q: 'Which route is less crowded?', a: `Route 12D via Service Road is ${100 - initialLoad12D}% empty right now! Save time and travel comfortably.` },
  { q: 'How long is the journey?', a: `Shivranjani to ISKCON takes ${busData['1'].baseTime + getTrafficDelay(currentHour)} minutes via Route 1 (with traffic), or ${busData['12D'].baseTime + getTrafficDelay(currentHour)} minutes via Route 12D.` }
]

// LINEAR INTERPOLATION for smooth movement
const lerp = (start, end, progress) => start + (end - start) * progress

// 📏 HELPER: Calculate distance between two coordinates (Haversine formula)
const calculateDistance = (coord1, coord2) => {
  return getDistanceFromLatLonInKm(coord1[0], coord1[1], coord2[0], coord2[1])
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
  const [selection, setSelection] = useState({ from: 'Shivranjani', to: 'ISKCON' })
  const [showInsights, setShowInsights] = useState(true)
  const [selectedRoute, setSelectedRoute] = useState('1')
  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [countdownTime, setCountdownTime] = useState(240) // 4 minutes countdown
  const [showHelp, setShowHelp] = useState(false)
  const [showChatbot, setShowChatbot] = useState(false)
  const [selectedFAQ, setSelectedFAQ] = useState(null)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [mapCenter, setMapCenter] = useState(ROUTE_1_COORDINATES[3])
  // Real-time clock state
  const [currentTime, setCurrentTime] = useState(new Date())
  // Weather state
  const [weather, setWeather] = useState({ temp: 32, isDay: true, loading: true })
  // Smooth animation progress (0 to 1)
  const [bus1Progress, setBus1Progress] = useState(0)
  const [bus12Progress, setBus12Progress] = useState(0.3)
  const [bus15Progress, setBus15Progress] = useState(0)
  const [bus1Bearing, setBus1Bearing] = useState(0)
  const [bus12Bearing, setBus12Bearing] = useState(0)
  const [bus15Bearing, setBus15Bearing] = useState(0)
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

  const handleStationClick = async (station) => {
    setSelectedStation(station)
    setIsStationLoading(true)
    setStationAnalytics(null)

    const analytics = await Promise.resolve(getStationAnalytics(station.id))
    setStationAnalytics(analytics)
    setIsStationLoading(false)
  }

  // 🚌 DISTANCE-BASED CONSTANT SPEED BUS ANIMATION (ALL ROUTES)
  const isPausedRef = useRef(false)
  const aiTriggeredRef = useRef(new Set())
  const hasStoppedAtRef = useRef(new Set()) // Track visited stations

  useEffect(() => {
    let activePath = []
    let activeStations = []

    switch (selectedRoute) {
      case '15':
        activePath = ROUTE_15_COORDINATES
        activeStations = ROUTE_15_STATIONS
        break
      case '7':
        activePath = ROUTE_7_COORDINATES
        activeStations = ROUTE_7_STATIONS
        break
      default:
        activePath = ROUTE_1_COORDINATES
        activeStations = STATIONS
        break
    }

    let segmentStartTime = null
    let currentIndex = 0
    let pauseStartTime = null

    isPausedRef.current = false
    hasStoppedAtRef.current = new Set()
    aiTriggeredRef.current = new Set()

    setBusStatus('En Route 🟢')
    setBus1Progress(0)
    setBus15Progress(0)

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

      const start = activePath[currentIndex]
      const end = activePath[currentIndex + 1] || activePath[0]

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
        setBusStatus(`🛑 Route ${selectedRoute} Bus Stopped at ${nearbyStation.name} - Boarding...`)
        requestAnimationFrame(animate)
        return
      }

      const overallProgress = (currentIndex + segmentProgress) / totalSegments

      if (selectedRoute === '1') {
        setBus1Progress(overallProgress)
        setBus1Bearing(bearing)
      } else {
        setBus15Progress(overallProgress)
        setBus15Bearing(bearing)
      }

      if (segmentProgress >= 1) {
        currentIndex = (currentIndex + 1) % totalSegments
        segmentStartTime = timestamp
      }

      requestAnimationFrame(animate)
    }

    const raf = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(raf)
  }, [selectedRoute])

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

  // 🤖 TRANSIT-GUARD AI AGENT MONITORING (Active Every 15 Seconds)
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
    setSelection(prev => ({ ...prev, [field]: value }))
  }

  const findRoute = () => {
    if (!origin || !destination) {
      alert('Please select both a Start Location and a Destination.')
      return
    }

    let foundRoute = null

    for (const [routeId, stations] of Object.entries(ROUTE_MAP)) {
      const hasOrigin = stations.some(s => s.name === origin || s.id?.toString() === origin)
      const hasDest = stations.some(s => s.name === destination || s.id?.toString() === destination)

      if (hasOrigin && hasDest) {
        foundRoute = routeId
        break
      }
    }

    if (foundRoute) {
      handleRouteSwitch(foundRoute)
    } else {
      alert(`No direct bus found between ${origin} and ${destination}. Try a transfer!`)
    }
  }

  const handleRouteSwitch = (routeId) => {
    setSelectedRoute(routeId)
    setBus1Progress(0)
    setBus15Progress(0)
    setBus1Bearing(0)
    setBus15Bearing(0)
    setBusIndex(0)
    setSelectedStation(null)
    setMapCenter(
      routeId === '1'
        ? ROUTE_1_COORDINATES[3]
        : routeId === '15'
          ? ROUTE_15_COORDINATES[3]
          : [23.085, 72.590]
    )
  }

  useEffect(() => {
    setMapCenter(
      selectedRoute === '1'
        ? ROUTE_1_COORDINATES[3]
        : selectedRoute === '15'
          ? ROUTE_15_COORDINATES[3]
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
  const activeProgress = selectedRoute === '1' ? bus1Progress : bus15Progress
  const etaMinutes = Math.max(2, Math.round((1 - activeProgress) * 12))

  const getGradientColor = (value) => {
    if (value < 33) return '#00ff99'
    if (value < 66) return '#ffcc00'
    return '#ff0055'
  }

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: '#0a0a0a' }}>
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
        {selectedRoute === '1' && (
          <>
            <Polyline 
              positions={ROUTE_1_COORDINATES} 
              pathOptions={{ 
                color: '#ff0055', 
                weight: 8, 
                opacity: 0.4,
                lineCap: 'round',
                lineJoin: 'round'
              }} 
            />
            <Polyline 
              positions={ROUTE_1_COORDINATES} 
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
              positions={ROUTE_15_COORDINATES} 
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
              positions={ROUTE_7_COORDINATES}
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

        {/* 🚏 OFFICIAL STATION MARKERS (Click to view live info) */}
        {(selectedRoute === '15'
          ? ROUTE_15_STATIONS
          : selectedRoute === '7'
            ? ROUTE_7_STATIONS
            : STATIONS
        ).map((station) => (
          <CircleMarker
            key={`station-${station.id}`}
            center={station.coords}
            radius={selectedRoute === '15' || selectedRoute === '7' ? 8 : 6}
            pathOptions={{
              color: selectedStation?.id === station.id
                ? '#00eaff'
                : (selectedRoute === '15'
                  ? '#00aaff'
                  : selectedRoute === '7'
                    ? '#cc00ff'
                    : 'white'),
              fillColor: selectedRoute === '15'
                ? '#00aaff'
                : selectedRoute === '7'
                  ? '#cc00ff'
                  : 'white',
              fillOpacity: selectedRoute === '15' || selectedRoute === '7' ? 1 : 0.95
            }}
            weight={2}
            opacity={1}
            eventHandlers={{
              click: () => handleStationClick(station)
            }}
          >
            <Popup>{station.name}</Popup>
          </CircleMarker>
        ))}

        {/* MOVING BUS ICONS WITH ROTATION - HIGH-FIDELITY */}
        {selectedRoute === '1' && (
          <Marker
            position={getPositionAlongRoute(ROUTE_1_COORDINATES, bus1Progress).position}
            icon={createBusIcon('#ff0055', bus1Bearing)}
          />
        )}

        {/* Route 15 Bus Marker */}
        {selectedRoute === '15' && (
          <Marker
            position={getPositionAlongRoute(ROUTE_15_COORDINATES, bus15Progress).position}
            icon={createBusIcon('#00aaff', bus15Bearing)}
          />
        )}

        {/* Route 7 Bus Marker */}
        {selectedRoute === '7' && (
          <Marker
            position={getPositionAlongRoute(ROUTE_7_COORDINATES, bus15Progress).position}
            icon={createBusIcon('#cc00ff', bus15Bearing)}
          />
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
            <select
              className="glass-input"
              onChange={(e) => setOrigin(e.target.value)}
              value={origin}
              style={{
                padding: '8px 12px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="" style={{ background: '#1a1a1a', color: '#fff' }}>
                📍 Start Location
              </option>
              {UNIQUE_STATIONS.map((name) => (
                <option key={name} value={name} style={{ background: '#1a1a1a', color: '#fff' }}>
                  {name}
                </option>
              ))}
            </select>

            <span style={{ color: '#666', fontSize: '16px' }}>➔</span>

            <select
              className="glass-input"
              onChange={(e) => setDestination(e.target.value)}
              value={destination}
              style={{
                padding: '8px 12px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="" style={{ background: '#1a1a1a', color: '#fff' }}>
                🏁 Destination
              </option>
              {UNIQUE_STATIONS.map((name) => (
                <option key={name} value={name} style={{ background: '#1a1a1a', color: '#fff' }}>
                  {name}
                </option>
              ))}
            </select>

            <button
              onClick={findRoute}
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
        {showInsights && (
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
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6)',
              color: '#fff',
            }}
          >
            {/* HEADER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, letterSpacing: '0.5px' }}>
                  Route {selectedRoute}: {startNode} ➔ {endNode}
                </h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#888' }}>Live Transit Data</p>
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

            {/* ARRIVAL ETA */}
            <div style={{
              textAlign: 'center',
              marginBottom: '24px',
              padding: '16px',
              background: 'rgba(255, 0, 85, 0.15)',
              border: '1px solid rgba(255, 0, 85, 0.3)',
              borderRadius: '12px',
            }}>
              <p style={{ margin: '0 0 4px 0', fontSize: '11px', color: '#aaa', textTransform: 'uppercase', fontWeight: 600 }}>Next Bus Arriving in</p>
              <div style={{ fontSize: '32px', fontWeight: 700, color: '#ff0055', letterSpacing: '1px' }}>
                {etaMinutes} min
              </div>
            </div>

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
            <button
              onClick={switchRoute}
              disabled={isRedirecting}
              style={{
                width: '100%',
                padding: '16px 20px',
                background: isRedirecting 
                  ? 'linear-gradient(135deg, #666 0%, #888 100%)'
                  : 'linear-gradient(135deg, #2979ff 0%, #00d4ff 100%)',
                border: `1px solid ${isRedirecting ? 'rgba(100, 100, 100, 0.5)' : 'rgba(41, 121, 255, 0.5)'}`,
                borderRadius: '14px',
                color: '#fff',
                fontSize: '15px',
                fontWeight: 700,
                cursor: isRedirecting ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s',
                boxShadow: isRedirecting 
                  ? '0 4px 12px rgba(0, 0, 0, 0.3)'
                  : '0 8px 24px rgba(41, 121, 255, 0.4)',
              }}
              onMouseEnter={(e) => {
                if (!isRedirecting) {
                  e.target.style.transform = 'translateY(-2px)'
                  e.target.style.boxShadow = '0 12px 32px rgba(41, 121, 255, 0.6)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isRedirecting) {
                  e.target.style.transform = 'translateY(0)'
                  e.target.style.boxShadow = '0 8px 24px rgba(41, 121, 255, 0.4)'
                }
              }}
            >
              {isRedirecting ? '⏳ Redirecting...' : (
                selectedRoute === '1' ? '✈️ Switch to Route 15 (Airport Express)'
                : '↩️ Return to Route 1D (Express)'
              )}
            </button>

            {/* FOOTER */}
            <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '11px', color: '#666' }}>
              ✓ {selectedRoute === '1' ? 'Airport Express available with live updates' : 'Express Route 1 - Fastest to ISKCON'}
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
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>Transit Assist AI</span>
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
                  <p style={{ fontSize: '12px', color: '#888', marginBottom: '12px' }}>How can I help you today?</p>
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
