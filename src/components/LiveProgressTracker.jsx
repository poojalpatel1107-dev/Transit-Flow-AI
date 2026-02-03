import React, { useEffect, useState } from 'react'
import useJourneyStore from '../store/useJourneyStore'
import './LiveProgressTracker.css'

export default function LiveProgressTracker({ onComplete }) {
  const journey = useJourneyStore(state => state.journey)
  const isTracking = useJourneyStore(state => state.isTracking)
  const estimatedArrival = useJourneyStore(state => state.estimatedArrival)
  const currentStationIndex = useJourneyStore(state => state.currentStationIndex)
  const currentSegmentIndex = useJourneyStore(state => state.currentSegmentIndex)
  const nextTransferStation = useJourneyStore(state => state.nextTransferStation)
  const nextTransferIn = useJourneyStore(state => state.nextTransferIn)
  const transferStations = useJourneyStore(state => state.transferStations)
  
  const updateBusLocation = useJourneyStore(state => state.updateBusLocation)
  const updateEstimatedArrival = useJourneyStore(state => state.updateEstimatedArrival)
  const updateCurrentPosition = useJourneyStore(state => state.updateCurrentPosition)

  const [timeRemaining, setTimeRemaining] = useState(estimatedArrival || journey?.eta_minutes || 0)
  const [progressPercent, setProgressPercent] = useState(0)

  // Simulate real-time bus movement
  useEffect(() => {
    if (!isTracking || !journey) return

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 0) {
          onComplete?.()
          return 0
        }
        return prev - 1
      })

      // Update position along route
      setProgressPercent(prev => {
        const newProgress = prev + (1 / (journey.eta_minutes || 30))
        if (newProgress >= 100) {
          onComplete?.()
          return 100
        }
        return newProgress
      })

      // Simulate moving bus location
      if (journey.path && journey.path.length > 0) {
        const pathIndex = Math.floor(
          (progressPercent / 100) * (journey.path.length - 1)
        )
        if (pathIndex < journey.path.length) {
          const coord = journey.path[Math.min(pathIndex, journey.path.length - 1)]
          updateBusLocation(coord[0], coord[1])
        }
      }

      updateCurrentPosition(
        Math.floor((progressPercent / 100) * (journey.path?.length || 1))
      )
    }, 1000)

    return () => clearInterval(interval)
  }, [isTracking, journey, progressPercent, onComplete])

  if (!isTracking || !journey) {
    return null
  }

  const segments = journey.segments || [
    {
      route_id: journey.route_id,
      from_station: journey.origin,
      to_station: journey.destination
    }
  ]

  const currentSegment = segments[currentSegmentIndex] || segments[0]
  const hasTransfers = journey.transfer && transferStations?.length > 0

  return (
    <div className="live-tracker-container">
      {/* Top Header with Timer */}
      <div className="tracker-header">
        <div className="tracker-status">
          <span className="status-icon">🚌</span>
          <div className="status-info">
            <h2>En Route</h2>
            <p>Route {currentSegment.route_id}</p>
          </div>
        </div>

        <div className="eta-badge">
          <span className="timer">⏱️ {Math.max(0, timeRemaining)} min</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="progress-section">
        <div className="route-line">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${Math.min(progressPercent, 100)}%` }}
            />
          </div>
          <span className="progress-label">{Math.min(Math.round(progressPercent), 100)}% complete</span>
        </div>
      </div>

      {/* Current Segment */}
      <div className="segment-tracker">
        <div className="segment-stations">
          <div className="current-station-card">
            <div className="station-header">Boarding From</div>
            <div className="station-name">
              <span className="icon">🚪</span>
              {currentSegment.from_station}
            </div>
          </div>

          <div className="direction-arrow">
            <span>━━━━→</span>
          </div>

          <div className="next-station-card">
            <div className="station-header">
              {hasTransfers && currentSegmentIndex < segments.length - 1
                ? '🔄 Transfer To'
                : '🎯 Destination'}
            </div>
            <div className="station-name">
              <span className="icon">
                {hasTransfers && currentSegmentIndex < segments.length - 1 ? '🔄' : '📍'}
              </span>
              {currentSegment.to_station}
            </div>
          </div>
        </div>
      </div>

      {/* Next Transfer Info (if applicable) */}
      {hasTransfers && nextTransferStation && currentSegmentIndex < segments.length - 1 && (
        <div className="next-transfer-info">
          <div className="transfer-header">
            <span className="transfer-icon">🔄</span>
            <span className="transfer-text">Next Transfer</span>
          </div>
          <div className="transfer-details">
            <div className="transfer-station">
              <strong>{nextTransferStation}</strong>
              <span className="transfer-time">in {Math.max(0, nextTransferIn || 8)} min</span>
            </div>
            <div className="transfer-routes">
              <span className="route-from">Route {currentSegment.route_id}</span>
              <span className="arrow">→</span>
              <span className="route-to">Route {segments[currentSegmentIndex + 1]?.route_id || '?'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Segment Info Cards */}
      <div className="segment-cards">
        <div className="info-card">
          <span className="card-icon">📏</span>
          <div className="card-content">
            <p className="card-label">Distance</p>
            <p className="card-value">
              {(currentSegment.distance_km || journey.total_distance_km / segments.length).toFixed(1)} km
            </p>
          </div>
        </div>

        <div className="info-card">
          <span className="card-icon">⚡</span>
          <div className="card-content">
            <p className="card-label">Speed</p>
            <p className="card-value">~26 km/h</p>
          </div>
        </div>

        <div className="info-card">
          <span className="card-icon">👥</span>
          <div className="card-content">
            <p className="card-label">Occupancy</p>
            <p className="card-value">65%</p>
          </div>
        </div>
      </div>

      {/* Bottom Action */}
      <div className="tracker-footer">
        <div className="arrival-info">
          <p className="arrival-text">Estimated arrival</p>
          <p className="arrival-time">{Math.max(0, timeRemaining)} minutes</p>
        </div>
      </div>
    </div>
  )
}
