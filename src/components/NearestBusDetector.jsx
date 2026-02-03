import React, { useEffect, useState } from 'react'
import './NearestBusDetector.css'

export default function NearestBusDetector({ userLocation }) {
  const [nearestBus, setNearestBus] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleGoToStop = () => {
    if (!nearestBus?.location) return
    const [destLat, destLng] = nearestBus.location
    const origin = userLocation ? `&origin=${userLocation[0]},${userLocation[1]}` : ''
    const url = `https://www.google.com/maps/dir/?api=1${origin}&destination=${destLat},${destLng}&travelmode=walking`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  useEffect(() => {
    if (!userLocation) return

    const fetchNearestBus = async () => {
      setLoading(true)
      try {
        const response = await fetch(
          `http://localhost:8000/api/nearest-bus?user_lat=${userLocation[0]}&user_lng=${userLocation[1]}`
        )
        const data = await response.json()
        setNearestBus(data)
      } catch (error) {
        console.error('Error fetching nearest bus:', error)
      } finally {
        setLoading(false)
      }
    }

    // Fetch immediately and every 30 seconds
    fetchNearestBus()
    const interval = setInterval(fetchNearestBus, 30000)
    return () => clearInterval(interval)
  }, [userLocation])

  if (!nearestBus) {
    return null
  }

  return (
    <div className="nearest-bus-detector">
      <div className="bus-header">
        <span className="bus-icon">🚌</span>
        <span className="bus-title">Nearest Bus</span>
        <span className="refresh-badge">Live</span>
      </div>

      <div className="bus-details">
        <div className="bus-info">
          <div className="info-row">
            <span className="label">Route</span>
            <span className="value route-badge">
              {nearestBus.route_id}
            </span>
          </div>

          {nearestBus.station_name && (
            <div className="info-row">
              <span className="label">Nearest Stop</span>
              <span className="value">{nearestBus.station_name}</span>
            </div>
          )}

          <div className="info-row">
            <span className="label">Distance</span>
            <span className="value">{nearestBus.distance_km} km away</span>
          </div>

          <div className="info-row">
            <span className="label">Arrival</span>
            <span className="value highlight">{nearestBus.eta_minutes} min</span>
          </div>

          <div className="info-row">
            <span className="label">Occupancy</span>
            <div className="occupancy-bar">
              <div
                className="occupancy-fill"
                style={{ width: `${nearestBus.occupancy_percent}%` }}
              />
              <span className="occupancy-text">{nearestBus.occupancy_percent}%</span>
            </div>
          </div>

          <div className="bus-status">
            <span className="status-indicator">●</span>
            <span className="status-text">{nearestBus.heading}</span>
          </div>
        </div>

        <button
          className="goto-stop-btn"
          onClick={handleGoToStop}
          disabled={!nearestBus?.location}
          title={!nearestBus?.location ? 'Location unavailable' : 'Open directions'}
        >
          <span>📍</span> Go to Stop
        </button>
      </div>
    </div>
  )
}
