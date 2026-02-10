import React, { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, Bus, DoorOpen, MapPin, Sparkles, Timer, Users } from 'lucide-react'
import useJourneyStore from '../store/useJourneyStore'
import {
  STATIONS,
  ROUTE_15_STATIONS,
  ROUTE_7_STATIONS,
  ROUTE_4_STATIONS,
  REAL_ROUTE_1,
  ROUTE_15_COORDINATES,
  ROUTE_7_COORDINATES,
  ROUTE_4_COORDINATES
} from '../RouteCoordinates'
import './LiveProgressTracker.css'

const normalizeStationName = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')

const STATION_COORDS_MAP = new Map(
  [...STATIONS, ...ROUTE_15_STATIONS, ...ROUTE_7_STATIONS, ...ROUTE_4_STATIONS].map(station => [
    station.name,
    station.coords
  ])
)

const STATION_COORDS_NORMALIZED_MAP = new Map(
  [...STATIONS, ...ROUTE_15_STATIONS, ...ROUTE_7_STATIONS, ...ROUTE_4_STATIONS].map(station => [
    normalizeStationName(station.name),
    station.coords
  ])
)

const getStationCoords = (name) =>
  STATION_COORDS_MAP.get(name) || STATION_COORDS_NORMALIZED_MAP.get(normalizeStationName(name))

const ROUTE_PATHS = {
  '1': REAL_ROUTE_1,
  '15': ROUTE_15_COORDINATES,
  '7': ROUTE_7_COORDINATES,
  '4': ROUTE_4_COORDINATES
}

export default function LiveProgressTracker({ onComplete }) {
  const journey = useJourneyStore(state => state.journey)
  const isTracking = useJourneyStore(state => state.isTracking)
  const transferStations = useJourneyStore(state => state.transferStations)
  
  const updateBusLocation = useJourneyStore(state => state.updateBusLocation)
  const updateCurrentPosition = useJourneyStore(state => state.updateCurrentPosition)
  const setCurrentSegmentIndex = useJourneyStore(state => state.setCurrentSegmentIndex)

  const approachDurationSec = 3
  const approachOffsetMeters = 40

  const segments = useMemo(() => {
    if (journey?.segments?.length) return journey.segments
    if (!journey) return []
    return [
      {
        route_id: journey.route_id,
        from_station: journey.origin,
        to_station: journey.destination,
        duration_minutes: journey.eta_minutes,
        distance_km: journey.total_distance_km
      }
    ]
  }, [journey])

  const segmentDurations = useMemo(() => (
    segments.map(seg =>
      Number(seg.duration_minutes ?? (journey?.eta_minutes / Math.max(1, segments.length))) || 0
    )
  ), [segments, journey])

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

  const normalizePath = (rawPath) => {
    if (!Array.isArray(rawPath)) return []
    return rawPath
      .map((point) => {
        if (Array.isArray(point) && point.length >= 2) {
          const lat = Number(point[0])
          const lng = Number(point[1])
          if (Number.isFinite(lat) && Number.isFinite(lng)) {
            return [lat, lng]
          }
        }
        if (point && typeof point === 'object') {
          const lat = Number(point.lat ?? point.latitude)
          const lng = Number(point.lng ?? point.lon ?? point.longitude)
          if (Number.isFinite(lat) && Number.isFinite(lng)) {
            return [lat, lng]
          }
        }
        return null
      })
      .filter(Boolean)
  }

  const normalizeRouteId = (value) => {
    const raw = String(value ?? '').trim()
    const match = raw.match(/\d+/)
    return match ? match[0] : raw
  }

  const getRouteFallbackPath = (routeId, originName) => {
    const normalizedRouteId = normalizeRouteId(routeId)
    const base = ROUTE_PATHS[normalizedRouteId]
    if (!Array.isArray(base) || base.length < 2) return []

    let path = normalizePath(base)
    if (path.length < 2) return []

    const originCoord = getStationCoords(originName)
    if (originCoord) {
      const start = path[0]
      const end = path[path.length - 1]
      const distStart = getDistanceFromLatLonInKm(originCoord[0], originCoord[1], start[0], start[1])
      const distEnd = getDistanceFromLatLonInKm(originCoord[0], originCoord[1], end[0], end[1])
      if (distEnd < distStart) {
        path = path.slice().reverse()
      }
    }

    return path
  }

  const buildInterpolatedPath = (startCoord, endCoord, steps = 24) => {
    if (!startCoord || !endCoord) return []
    const safeSteps = Math.max(2, steps)
    const path = []
    for (let i = 0; i <= safeSteps; i += 1) {
      const t = i / safeSteps
      path.push([
        startCoord[0] + (endCoord[0] - startCoord[0]) * t,
        startCoord[1] + (endCoord[1] - startCoord[1]) * t
      ])
    }
    return path
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

  const getApproachCoord = (path, offsetMeters) => {
    if (!path || path.length < 2) return null
    const start = path[0]
    const next = path[1]
    const segmentMeters = Math.max(1, getDistanceFromLatLonInKm(start[0], start[1], next[0], next[1]) * 1000)
    const t = Math.min(0.5, offsetMeters / segmentMeters)
    return [
      start[0] + (start[0] - next[0]) * t,
      start[1] + (start[1] - next[1]) * t
    ]
  }

  const findClosestIndex = (path, coord) => {
    let bestIdx = 0
    let bestDist = Number.MAX_VALUE
    for (let i = 0; i < path.length; i += 1) {
      const point = path[i]
      const dist = getDistanceFromLatLonInKm(coord[0], coord[1], point[0], point[1])
      if (dist < bestDist) {
        bestDist = dist
        bestIdx = i
      }
    }
    return bestIdx
  }

  const buildSegmentPathsFromJourneyPath = (path, segmentsList) => {
    if (!path || path.length < 2 || !segmentsList || segmentsList.length === 0) return []
    if (segmentsList.length === 1) return [path]

    const cutIndices = []
    for (let i = 0; i < segmentsList.length - 1; i += 1) {
      const endCoord = getStationCoords(segmentsList[i].to_station)
      if (!endCoord) return []
      cutIndices.push(findClosestIndex(path, endCoord))
    }

    const slices = []
    let startIdx = 0
    for (let i = 0; i < cutIndices.length; i += 1) {
      let endIdx = cutIndices[i]
      if (endIdx <= startIdx && startIdx < path.length - 1) {
        endIdx = startIdx + 1
      }
      slices.push(path.slice(startIdx, endIdx + 1))
      startIdx = endIdx
    }
    if (startIdx < path.length - 1) {
      slices.push(path.slice(startIdx))
    }

    return slices.length === segmentsList.length ? slices : []
  }

  const isSparsePath = (candidate) => {
    if (!candidate || candidate.length < 2) return true
    const summary = buildDistanceTable(candidate)
    return !Number.isFinite(summary.total) || summary.total < 120 || candidate.length < 6
  }

  const buildSegmentPath = (segment) => {
    let path = normalizePath(segment?.path || [])
    if (isSparsePath(path)) {
      const fallback = getRouteFallbackPath(segment?.route_id, segment?.from_station)
      if (fallback.length >= 2) {
        path = fallback
      }
    }

    if (isSparsePath(path)) {
      const originCoord = getStationCoords(segment?.from_station)
      const destinationCoord = getStationCoords(segment?.to_station)
      if (originCoord && destinationCoord) {
        path = buildInterpolatedPath(originCoord, destinationCoord, 26)
      }
    }

    return path
  }

  // Simulate real-time bus movement (dynamic, Uber-like)
  useEffect(() => {
    if (!isTracking || !journey) return

    const journeyPath = normalizePath(journey.path || [])
    let segmentPaths = buildSegmentPathsFromJourneyPath(journeyPath, segments)
    if (segmentPaths.length === 0 || segmentPaths.some(p => p.length < 2)) {
      segmentPaths = segments.map(buildSegmentPath)
    }
    if ((segmentPaths.length === 0 || segmentPaths.every(p => p.length < 2)) && journeyPath.length >= 2) {
      segmentPaths = [journeyPath]
    }
    if (segmentPaths.length === 0 || segmentPaths.every(p => p.length < 2)) return

    const segmentTables = segmentPaths.map(path => buildDistanceTable(path))
    const segmentDurationsSec = segmentDurations.map(d => Math.max(1, Math.round(d * 60)))
    const totalDurationSec = Math.max(1, segmentDurationsSec.reduce((sum, d) => sum + d, 0))
    const baseSpeedMps = 22
    const approachDurationMs = approachDurationSec * 1000

    startTimeRef.current = null
    lastFrameRef.current = null
    lastUiUpdateRef.current = 0
    let lastSegmentIndex = -1

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
        const firstPath = segmentPaths[0] || []
        const approachCoord = getApproachCoord(firstPath, approachOffsetMeters) || firstPath[0]
        updateBusLocation(approachCoord[0], approachCoord[1])
        updateCurrentPosition(0)
        if (lastSegmentIndex !== 0) {
          lastSegmentIndex = 0
          setCurrentSegmentIndex(0)
        }
        if (now - lastUiUpdateRef.current > 250) {
          setApproachRemainingSec(Math.ceil(approachRemaining / 1000))
          setTimeRemainingSec(totalDurationSec)
          lastUiUpdateRef.current = now
        }
        animationRef.current = requestAnimationFrame(animate)
        return
      }

      const elapsedJourneySec = Math.max(0, (now - startTimeRef.current - approachDurationMs) / 1000)
      let remaining = elapsedJourneySec
      let segmentIndex = 0
      let segmentElapsedSec = 0
      for (let i = 0; i < segmentDurationsSec.length; i += 1) {
        const segSec = segmentDurationsSec[i]
        if (remaining < segSec) {
          segmentIndex = i
          segmentElapsedSec = remaining
          break
        }
        remaining -= segSec
        segmentIndex = i + 1
        segmentElapsedSec = segSec
      }

      if (segmentIndex >= segmentPaths.length) {
        setTimeRemainingSec(0)
        onComplete?.()
        return
      }

      const currentPath = segmentPaths[segmentIndex]
      const currentTable = segmentTables[segmentIndex]
      const segSec = segmentDurationsSec[segmentIndex]
      const segProgress = Math.min(1, segmentElapsedSec / Math.max(1, segSec))
      const segDistance = currentTable.total
      const hasValidDistance = Number.isFinite(segDistance) && segDistance > 0

      let coord = null
      let index = 0

      if (hasValidDistance) {
        const distance = Math.min(segDistance, segDistance * segProgress)
        const result = getCoordAtDistance(currentPath, currentTable.cumulative, distance)
        if (result) {
          coord = result.coord
          index = result.index
        }
      } else if (currentPath.length >= 2) {
        const idxFloat = segProgress * (currentPath.length - 1)
        index = Math.min(currentPath.length - 1, Math.floor(idxFloat))
        const nextIndex = Math.min(currentPath.length - 1, index + 1)
        const t = idxFloat - index
        const start = currentPath[index]
        const end = currentPath[nextIndex]
        coord = [
          start[0] + (end[0] - start[0]) * t,
          start[1] + (end[1] - start[1]) * t
        ]
      }

      if (coord) {
        updateBusLocation(coord[0], coord[1])
        updateCurrentPosition(index)
      }

      if (lastSegmentIndex !== segmentIndex) {
        lastSegmentIndex = segmentIndex
        setCurrentSegmentIndex(segmentIndex)
      }

      if (now - lastUiUpdateRef.current > 250) {
        const remainingSec = Math.max(0, Math.ceil(totalDurationSec - elapsedJourneySec))
        setApproachRemainingSec(0)
        setTimeRemainingSec(remainingSec)
        lastUiUpdateRef.current = now
      }

      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isTracking, journey, segments, segmentDurations, totalSeconds, approachDurationSec, onComplete, updateBusLocation, updateCurrentPosition, setCurrentSegmentIndex])

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
  const currentSegSeconds = Math.max(1, Math.round((segmentDurations[currentSegmentIndex] || 0) * 60))
  const progressPercent = isApproaching
    ? 0
    : Math.min(100, ((currentSegSeconds - timeToNextTransferSec) / currentSegSeconds) * 100)
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
            {isApproaching ? 'Waiting for arrival' : `Leg ${currentSegmentIndex + 1} • ${Math.min(Math.round(progressPercent), 100)}% complete`}
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
