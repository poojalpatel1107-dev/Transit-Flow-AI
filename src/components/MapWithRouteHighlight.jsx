import React, { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Polyline, Marker, Popup, Circle, useMap } from 'react-leaflet'
import L from 'leaflet'
import useJourneyStore from '../store/useJourneyStore'
import { STATIONS, ROUTE_15_STATIONS, ROUTE_7_STATIONS, ROUTE_4_STATIONS } from '../RouteCoordinates'
import './MapWithRouteHighlight.css'

// Custom marker icons
const createMarkerIcon = (color, label) => {
  return L.divIcon({
    html: `<div style="background: ${color}; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 12px; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">${label}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  })
}

const startIcon = createMarkerIcon('#4CAF50', '📍')
const endIcon = createMarkerIcon('#FF6B6B', '🎯')
const transferIcon = createMarkerIcon('#FFC107', '🔄')
const busIcon = createMarkerIcon('#2196F3', '🚌')

const STATION_COORDS_MAP = new Map(
  [...STATIONS, ...ROUTE_15_STATIONS, ...ROUTE_7_STATIONS, ...ROUTE_4_STATIONS].map(station => [
    station.name,
    station.coords
  ])
)

const getStationCoords = (name) => STATION_COORDS_MAP.get(name)

// Snap a point to the closest vertex on the active route path.
// Helps keep markers on the correct side when the geometry has u‑turns.
const snapToPath = (point, path, { preferStart = false, preferEnd = false } = {}) => {
  if (!point || !Array.isArray(path) || path.length === 0) return point

  let closest = path[0]
  let bestScore = Number.MAX_VALUE

  const sq = (a, b) => {
    const dLat = a[0] - b[0]
    const dLng = a[1] - b[1]
    return dLat * dLat + dLng * dLng
  }

  path.forEach((coord, idx) => {
    const dist = sq(point, coord)
    // Small directional bias: favor earlier points for start-side stops, later for end-side
    const bias =
      preferStart ? idx * 1e-8 :
      preferEnd ? (path.length - idx) * 1e-8 :
      0
    const score = dist + bias
    if (score < bestScore) {
      bestScore = score
      closest = coord
    }
  })

  return closest
}

const metersBetween = (a, b) => {
  const r = 6371000
  const toRad = (v) => (v * Math.PI) / 180
  const dLat = toRad(b[0] - a[0])
  const dLng = toRad(b[1] - a[1])
  const lat1 = toRad(a[0])
  const lat2 = toRad(b[0])
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  return 2 * r * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

// Remove short backtracking loops so center-platform stations do not appear as U-turns.
const stripSmallLoops = (path) => {
  if (!Array.isArray(path) || path.length < 3) return path || []

  const loopThresholdMeters = 140
  const detourFactor = 2.2
  let working = path.slice()

  const pass = (input) => {
    const cleaned = [input[0]]
    for (let i = 1; i < input.length - 1; i += 1) {
      const prev = cleaned[cleaned.length - 1]
      const curr = input[i]
      const next = input[i + 1]

      const prevNext = metersBetween(prev, next)
      const prevCurr = metersBetween(prev, curr)
      const currNext = metersBetween(curr, next)

      const detour = prevCurr + currNext
      const isTightLoop = prevNext < loopThresholdMeters && detour > prevNext * detourFactor
      if (isTightLoop) {
        continue
      }

      cleaned.push(curr)
    }
    cleaned.push(input[input.length - 1])
    return cleaned
  }

  for (let i = 0; i < 3; i += 1) {
    const next = pass(working)
    if (next.length === working.length) {
      break
    }
    working = next
  }

  return working
}

const trimPathToStations = (path, originName, destinationName) => {
  if (!Array.isArray(path) || path.length < 2) return path || []

  let trimmed = path.slice()
  const radiusMeters = 90
  const originCoord = originName ? getStationCoords(originName) : null
  const destinationCoord = destinationName ? getStationCoords(destinationName) : null

  if (originCoord) {
    let lastNearOrigin = -1
    trimmed.forEach((coord, idx) => {
      if (metersBetween(coord, originCoord) <= radiusMeters) {
        lastNearOrigin = idx
      }
    })
    if (lastNearOrigin > 0 && lastNearOrigin < trimmed.length - 1) {
      trimmed = trimmed.slice(lastNearOrigin)
    }
  }

  if (destinationCoord && trimmed.length > 2) {
    let firstNearDest = -1
    for (let i = 0; i < trimmed.length; i += 1) {
      if (metersBetween(trimmed[i], destinationCoord) <= radiusMeters) {
        firstNearDest = i
        break
      }
    }
    if (firstNearDest > 0 && firstNearDest < trimmed.length - 1) {
      trimmed = trimmed.slice(0, firstNearDest + 1)
    }
  }

  return trimmed
}

export default function MapWithRouteHighlight() {
  const { journey, currentBusLocation, transferStations } = useJourneyStore()
  const [mapCenter, setMapCenter] = useState([23.03, 72.53])
  const [mapZoom, setMapZoom] = useState(13)
  const [routePath, setRoutePath] = useState([])
  const [autoFollow, setAutoFollow] = useState(true)
  const [autoFit, setAutoFit] = useState(true)

  // Calculate map center and route path from journey
  useEffect(() => {
    if (journey && journey.path && journey.path.length > 0) {
      const cleanedPath = stripSmallLoops(journey.path)
      const trimmedPath = trimPathToStations(
        cleanedPath,
        journey.origin,
        journey.destination
      )
      const latSum = journey.path.reduce((sum, coord) => sum + coord[0], 0)
      const lngSum = journey.path.reduce((sum, coord) => sum + coord[1], 0)
      const newCenter = [
        latSum / journey.path.length,
        lngSum / journey.path.length
      ]
      setMapCenter(newCenter)
      setMapZoom(14)
      setRoutePath(trimmedPath)
      setAutoFit(true)
      setAutoFollow(true)
    }
  }, [journey])

  const hasRoute = Boolean(journey && journey.path && journey.path.length > 0)
  const pathForSnapping = routePath && routePath.length > 0 ? routePath : journey?.path || []
  const startPoint = pathForSnapping[0] || (journey?.path ? journey.path[0] : null)
  const endPoint = pathForSnapping[pathForSnapping.length - 1] || (journey?.path ? journey.path[journey.path.length - 1] : null)

  const MapViewUpdater = () => {
    const map = useMap()

    useEffect(() => {
      if (autoFit && routePath && routePath.length > 1) {
        const bounds = L.latLngBounds(routePath)
        map.fitBounds(bounds, { padding: [30, 30] })
      }
    }, [routePath, map, autoFit])

    useEffect(() => {
      if (currentBusLocation && autoFollow) {
        map.panTo(currentBusLocation, { animate: true, duration: 0.5 })
      }
    }, [currentBusLocation, map, autoFollow])

    useEffect(() => {
      const handleUserMove = () => {
        setAutoFollow(false)
        setAutoFit(false)
      }
      map.on('dragstart', handleUserMove)
      map.on('zoomstart', handleUserMove)
      map.on('movestart', handleUserMove)
      return () => {
        map.off('dragstart', handleUserMove)
        map.off('zoomstart', handleUserMove)
        map.off('movestart', handleUserMove)
      }
    }, [map])

    return null
  }

  return (
    <div className="map-container-highlight">
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        style={{ width: '100%', height: '100%' }}
      >
        <MapViewUpdater />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />

        {/* Main route path - follows actual road geometry */}
        {hasRoute && (routePath?.length || journey?.path?.length) ? (
          <Polyline
            positions={routePath && routePath.length > 0 ? routePath : journey.path}
            color="#2196F3"
            weight={5}
            opacity={0.85}
          />
        ) : null}

        {/* Start point */}
        {hasRoute && startPoint ? (
          <Marker position={startPoint} icon={startIcon}>
            <Popup>
              <div className="popup-content">
                <strong>📍 Start</strong><br />
                {journey.origin}
              </div>
            </Popup>
          </Marker>
        ) : null}

        {/* End point */}
        {hasRoute && endPoint ? (
          <Marker position={endPoint} icon={endIcon}>
            <Popup>
              <div className="popup-content">
                <strong>🎯 Destination</strong><br />
                {journey.destination}
              </div>
            </Popup>
          </Marker>
        ) : null}

        {/* Transfer stations */}
        {hasRoute && transferStations && transferStations.map((transfer, idx) => {
          const baseCoord = transfer.location || getStationCoords(transfer.station)
          const position = snapToPath(
            baseCoord,
            pathForSnapping,
            { preferStart: true } // keep transfers on entry side before U-turns
          ) || [
            23.027159 + idx * 0.005,
            72.508525 + idx * 0.01
          ]

          return (
            <Marker
              key={idx}
              position={position}
              icon={transferIcon}
            >
              <Popup>
                <div className="popup-content">
                  <strong>🔄 Transfer #{idx + 1}</strong><br />
                  <strong>Station:</strong> {transfer.station}<br />
                  <strong>From Route:</strong> {transfer.from_route}<br />
                  <strong>To Route:</strong> {transfer.to_route}<br />
                  <strong>Wait Time:</strong> ~{transfer.wait_minutes || 5} min
                </div>
              </Popup>
            </Marker>
          )
        })}

        {/* Current bus location (when tracking) */}
        {currentBusLocation && (
          <>
            <Circle
              center={currentBusLocation}
              radius={100}
              color="#2196F3"
              fill={true}
              opacity={0.3}
            />
            <Marker position={currentBusLocation} icon={busIcon}>
              <Popup>
                <div className="popup-content">
                  <strong>🚌 Your Bus</strong><br />
                  Current Location
                </div>
              </Popup>
            </Marker>
          </>
        )}
      </MapContainer>

      {/* Route info overlay */}
      {hasRoute ? (
        <div className="route-info-overlay">
          <div className="route-badge">
            <span className="route-label">
              {journey.transfer ? `Route ${journey.route_1} → ${journey.route_2}${journey.route_3 ? ` → ${journey.route_3}` : ''}` : `Route ${journey.route_id}`}
            </span>
            <span className="route-distance">
              {journey.total_distance_km} km
            </span>
          </div>
        </div>
      ) : null}

      {!hasRoute ? (
        <div className="map-placeholder-overlay">
          <p>🗺️ Select a route to view on map</p>
        </div>
      ) : null}
    </div>
  )
}
