import React, { useEffect, useState } from 'react'
import { ArrowRight, Bus, DoorOpen, MapPin, Sparkles, Timer, Users } from 'lucide-react'
import useJourneyStore from '../store/useJourneyStore'
import './LiveProgressTracker.css'

export default function LiveProgressTracker({ onComplete }) {
  const journey = useJourneyStore(state => state.journey)
  const isTracking = useJourneyStore(state => state.isTracking)
  const transferStations = useJourneyStore(state => state.transferStations)
  
  const updateBusLocation = useJourneyStore(state => state.updateBusLocation)
  const updateCurrentPosition = useJourneyStore(state => state.updateCurrentPosition)

  const approachDurationSec = 60

  const segments = journey?.segments || (journey ? [
    {
      route_id: journey.route_id,
      from_station: journey.origin,
      to_station: journey.destination,
      duration_minutes: journey.eta_minutes,
      distance_km: journey.total_distance_km
    }
  ] : [])

  const segmentDurations = segments.map(seg =>
    Number(seg.duration_minutes ?? (journey?.eta_minutes / Math.max(1, segments.length))) || 0
  )

  const totalMinutes = Math.max(
    1,
    Math.round(segmentDurations.reduce((sum, d) => sum + d, 0) || journey?.eta_minutes || 1)
  )

  const totalSeconds = totalMinutes * 60
  const [timeRemainingSec, setTimeRemainingSec] = useState(totalSeconds)
  const [approachRemainingSec, setApproachRemainingSec] = useState(approachDurationSec)

  useEffect(() => {
    if (!journey) return
    setTimeRemainingSec(totalSeconds)
    setApproachRemainingSec(approachDurationSec)
  }, [journey, totalSeconds])

  // Simulate real-time bus movement
  useEffect(() => {
    if (!isTracking || !journey) return

    const interval = setInterval(() => {
      setApproachRemainingSec(prev => {
        if (prev > 0) {
          return Math.max(0, prev - 0.5)
        }
        return 0
      })

      setTimeRemainingSec(prev => {
        if (approachRemainingSec > 0) return prev
        const next = Math.max(0, prev - 0.5)
        if (next === 0) {
          onComplete?.()
        }
        return next
      })
    }, 500)

    return () => clearInterval(interval)
  }, [isTracking, journey, onComplete, approachRemainingSec])

  useEffect(() => {
    if (!journey || !journey.path || journey.path.length === 0) return
    const startCoord = journey.path[0]
    if (approachRemainingSec > 0) {
      updateBusLocation(startCoord[0], startCoord[1])
      updateCurrentPosition(0)
      return
    }

    const elapsed = Math.max(0, totalSeconds - timeRemainingSec)
    const progress = Math.min(100, (elapsed / totalSeconds) * 100)
    const pathIndex = Math.floor((progress / 100) * (journey.path.length - 1))
    const coord = journey.path[Math.min(pathIndex, journey.path.length - 1)]
    updateBusLocation(coord[0], coord[1])
    updateCurrentPosition(pathIndex)
  }, [approachRemainingSec, timeRemainingSec, totalSeconds, journey, updateBusLocation, updateCurrentPosition])

  if (!isTracking || !journey) {
    return null
  }

  const elapsedSec = Math.max(0, totalSeconds - timeRemainingSec)
  const isApproaching = approachRemainingSec > 0
  let running = elapsedSec
  let currentSegmentIndex = 0
  let timeToNextTransferSec = 0

  for (let i = 0; i < segmentDurations.length; i++) {
    const segSec = Math.max(1, Math.round(segmentDurations[i] * 60))
    if (running < segSec) {
      currentSegmentIndex = i
      timeToNextTransferSec = segSec - running
      break
    }
    running -= segSec
  }

  const currentSegment = segments[currentSegmentIndex] || segments[0]
  const hasTransfers = journey.transfer && transferStations?.length > 0
  const nextTransferStationName = hasTransfers && currentSegmentIndex < segments.length - 1
    ? currentSegment.to_station
    : ''

  const segmentDistance = Number(
    currentSegment.distance_km ?? (journey.total_distance_km / Math.max(1, segments.length))
  )
  const safeSegmentDistance = Number.isFinite(segmentDistance) ? segmentDistance : 0
  const progressPercent = Math.min(100, (elapsedSec / totalSeconds) * 100)
  const timeRemainingMin = Math.max(0, Math.ceil(timeRemainingSec / 60))
  const approachRemainingMin = Math.max(1, Math.ceil(approachRemainingSec / 60))

  return (
    <div className="live-tracker-container">
      {/* Top Header with Timer */}
      <div className="tracker-header">
        <div className="tracker-status">
          <span className="status-icon">
            {isApproaching ? <Sparkles size={18} /> : <Bus size={18} />}
          </span>
          <div className="status-info">
            <h2>{isApproaching ? 'Bus Approaching' : 'En Route'}</h2>
            <p>{journey.origin} → {journey.destination} • Route {currentSegment.route_id}</p>
          </div>
        </div>

        <div className="eta-badge">
          <span className="timer">
            <Timer size={14} /> {isApproaching ? `${approachRemainingMin} min` : `${timeRemainingMin} min`}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="progress-section">
        <div className="route-line">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${isApproaching ? 0 : Math.min(progressPercent > 0 ? Math.max(progressPercent, 1) : 0, 100)}%` }}
            />
          </div>
          <span className="progress-label">
            {isApproaching ? 'Waiting for arrival' : `${Math.min(Math.round(progressPercent), 100)}% complete`}
          </span>
        </div>
      </div>

      {/* Current Segment */}
      <div className="segment-tracker">
        <div className="segment-stations">
          <div className="current-station-card">
            <div className="station-header">Boarding From</div>
            <div className="station-name">
              <span className="icon"><DoorOpen size={16} /></span>
              {currentSegment.from_station}
            </div>
          </div>

          <div className="direction-arrow">
            <ArrowRight size={20} />
          </div>

          <div className="next-station-card">
            <div className="station-header">
              {hasTransfers && currentSegmentIndex < segments.length - 1
                ? '🔄 Transfer To'
                : '🎯 Destination'}
            </div>
            <div className="station-name">
              <span className="icon"><MapPin size={16} /></span>
              {currentSegment.to_station}
            </div>
          </div>
        </div>
      </div>

      {/* Next Transfer Info (if applicable) */}
        {hasTransfers && nextTransferStationName && currentSegmentIndex < segments.length - 1 && progressPercent < 100 && (
        <div className="next-transfer-info">
          <div className="transfer-header">
            <span className="transfer-icon">🔄</span>
            <span className="transfer-text">Next Transfer</span>
          </div>
          <div className="transfer-details">
            <div className="transfer-station">
                <strong>{nextTransferStationName}</strong>
                <span className="transfer-time">in {Math.max(1, Math.ceil(timeToNextTransferSec / 60))} min</span>
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
          <span className="card-icon"><MapPin size={16} /></span>
          <div className="card-content">
            <p className="card-label">Distance</p>
            <p className="card-value">
              {safeSegmentDistance.toFixed(1)} km
            </p>
          </div>
        </div>

        <div className="info-card">
          <span className="card-icon"><Timer size={16} /></span>
          <div className="card-content">
            <p className="card-label">Speed</p>
            <p className="card-value">~26 km/h</p>
          </div>
        </div>

        <div className="info-card">
          <span className="card-icon"><Users size={16} /></span>
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
          <p className="arrival-time">{timeRemainingMin} minutes</p>
        </div>
      </div>
    </div>
  )
}
