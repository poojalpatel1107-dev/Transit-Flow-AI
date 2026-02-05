import React, { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Polyline, Marker, Popup, Circle, useMap } from 'react-leaflet'
import L from 'leaflet'
import useJourneyStore from '../store/useJourneyStore'
import { STATIONS, ROUTE_15_STATIONS, ROUTE_7_STATIONS } from '../RouteCoordinates'
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
  [...STATIONS, ...ROUTE_15_STATIONS, ...ROUTE_7_STATIONS].map(station => [
    station.name,
    station.coords
  ])
)

const getStationCoords = (name) => STATION_COORDS_MAP.get(name)

export default function MapWithRouteHighlight() {
  const { journey, currentBusLocation, transferStations } = useJourneyStore()
  const [mapCenter, setMapCenter] = useState([23.03, 72.53])
  const [mapZoom, setMapZoom] = useState(13)
  const [routePath, setRoutePath] = useState([])

  // Calculate map center and route path from journey
  useEffect(() => {
    if (journey && journey.path && journey.path.length > 0) {
      const latSum = journey.path.reduce((sum, coord) => sum + coord[0], 0)
      const lngSum = journey.path.reduce((sum, coord) => sum + coord[1], 0)
      const newCenter = [
        latSum / journey.path.length,
        lngSum / journey.path.length
      ]
      setMapCenter(newCenter)
      setMapZoom(14)
      setRoutePath(journey.path)
    }
  }, [journey])

  const hasRoute = Boolean(journey && journey.path && journey.path.length > 0)
  const startPoint = routePath[0] || (journey?.path ? journey.path[0] : null)
  const endPoint = routePath[routePath.length - 1] || (journey?.path ? journey.path[journey.path.length - 1] : null)

  const MapViewUpdater = () => {
    const map = useMap()

    useEffect(() => {
      if (routePath && routePath.length > 1) {
        const bounds = L.latLngBounds(routePath)
        map.fitBounds(bounds, { padding: [30, 30] })
      }
    }, [routePath, map])

    useEffect(() => {
      if (currentBusLocation) {
        map.panTo(currentBusLocation, { animate: true, duration: 0.5 })
      }
    }, [currentBusLocation, map])

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
        {hasRoute && transferStations && transferStations.map((transfer, idx) => (
          <Marker
            key={idx}
            position={transfer.location || getStationCoords(transfer.station) || [
              23.027159 + idx * 0.005,
              72.508525 + idx * 0.01
            ]}
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
        ))}

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
