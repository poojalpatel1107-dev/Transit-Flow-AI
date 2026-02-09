import React, { useEffect, useRef, useState } from 'react'
import { ArrowRight, Bus, DoorOpen, MapPin, Sparkles, Timer, Users } from 'lucide-react'
import useJourneyStore from '../store/useJourneyStore'
import './LiveProgressTracker.css'

export default function LiveProgressTracker({ onComplete }) {
  const journey = useJourneyStore(state => state.journey)
  const isTracking = useJourneyStore(state => state.isTracking)
  const transferStations = useJourneyStore(state => state.transferStations)
  
  const updateBusLocation = useJourneyStore(state => state.updateBusLocation)
  const updateCurrentPosition = useJourneyStore(state => state.updateCurrentPosition)

  const approachDurationSec = 3

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

  const animationRef = useRef(null)
  const lastFrameRef = useRef(null)
  const startTimeRef = useRef(null)
  const speedMultiplierRef = useRef(1)
  const lastSpeedUpdateRef = useRef(0)
  const distanceTravelledRef = useRef(0)
  const distanceTableRef = useRef({ cumulative: [], total: 0 })
  const lastUiUpdateRef = useRef(0)

  const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  useEffect(() => {
    if (!journey) return
    setTimeRemainingSec(totalSeconds)
    setApproachRemainingSec(approachDurationSec)
  }, [journey, totalSeconds])

  const buildDistanceTable = (path) => {
    const cumulative = [0]
    let total = 0
    for (let i = 1; i < path.length; i += 1) {
      const prev = path[i - 1]
      const curr = path[i]
      const seg = Math.max(1, getDistanceFromLatLonInKm(prev[0], prev[1], curr[0], curr[1]) * 1000)
      total += seg
      cumulative.push(total)
    }
    return { cumulative, total }
  }

  const getCoordAtDistance = (path, cumulative, distanceMeters) => {
    if (!path || path.length === 0) return { coord: null, index: 0 }
    if (distanceMeters <= 0) return { coord: path[0], index: 0 }
    const total = cumulative[cumulative.length - 1] || 0
    if (distanceMeters >= total) return { coord: path[path.length - 1], index: path.length - 1 }

    let idx = 0
    while (idx < cumulative.length - 1 && cumulative[idx + 1] < distanceMeters) {
      idx += 1
    }

    const start = path[idx]
    const end = path[idx + 1]
    const segStart = cumulative[idx]
    const segEnd = cumulative[idx + 1]
    const span = Math.max(1, segEnd - segStart)
    const t = Math.min(1, Math.max(0, (distanceMeters - segStart) / span))

    return {
      coord: [
        start[0] + (end[0] - start[0]) * t,
        start[1] + (end[1] - start[1]) * t
      ],
      index: idx
    }
  }

  // Simulate real-time bus movement (dynamic, Uber-like)
  useEffect(() => {
    if (!isTracking || !journey || !journey.path || journey.path.length === 0) return

    distanceTableRef.current = buildDistanceTable(journey.path)
    const totalDistance = distanceTableRef.current.total
    if (!totalDistance) return

    const baseSpeedMps = Math.max(28, totalDistance / Math.max(1, totalSeconds))
    const approachDurationMs = approachDurationSec * 1000

    distanceTravelledRef.current = 0
    speedMultiplierRef.current = 1
    lastSpeedUpdateRef.current = 0
    startTimeRef.current = null
    lastFrameRef.current = null
    lastUiUpdateRef.current = 0

    const animate = (now) => {
      if (!startTimeRef.current) {
        startTimeRef.current = now
        lastFrameRef.current = now
      }

      const deltaSec = Math.max(0.001, (now - lastFrameRef.current) / 1000)
      lastFrameRef.current = now

      const elapsedMs = now - startTimeRef.current
      const approachRemaining = Math.max(0, approachDurationMs - elapsedMs)

      if (approachRemaining > 0) {
        const startCoord = journey.path[0]
        updateBusLocation(startCoord[0], startCoord[1])
        updateCurrentPosition(0)
        if (now - lastUiUpdateRef.current > 250) {
          setApproachRemainingSec(Math.ceil(approachRemaining / 1000))
          setTimeRemainingSec(totalSeconds)
          lastUiUpdateRef.current = now
        }
        animationRef.current = requestAnimationFrame(animate)
        return
      }

      if (!lastSpeedUpdateRef.current || now - lastSpeedUpdateRef.current > 2200) {
        speedMultiplierRef.current = 1.25 + Math.random() * 0.9
        lastSpeedUpdateRef.current = now
      }

      const speedMps = baseSpeedMps * speedMultiplierRef.current
      distanceTravelledRef.current = Math.min(
        totalDistance,
        distanceTravelledRef.current + speedMps * deltaSec
      )

      const { coord, index } = getCoordAtDistance(
        journey.path,
        distanceTableRef.current.cumulative,
        distanceTravelledRef.current
      )

      if (coord) {
        updateBusLocation(coord[0], coord[1])
        updateCurrentPosition(index)
      }

      if (now - lastUiUpdateRef.current > 250) {
        const remainingDistance = Math.max(0, totalDistance - distanceTravelledRef.current)
        const remainingSec = Math.ceil(remainingDistance / Math.max(1, speedMps))
        setApproachRemainingSec(0)
        setTimeRemainingSec(remainingSec)
        lastUiUpdateRef.current = now
      }

      if (distanceTravelledRef.current >= totalDistance) {
        setTimeRemainingSec(0)
        onComplete?.()
        return
      }

      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isTracking, journey, totalSeconds, approachDurationSec, onComplete, updateBusLocation, updateCurrentPosition])

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
