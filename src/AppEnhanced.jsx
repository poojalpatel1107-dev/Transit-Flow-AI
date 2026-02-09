import React, { useState, useEffect } from 'react'
import './AppEnhanced.css'
import SearchBar from './components/SearchBar'
import MapWithRouteHighlight from './components/MapWithRouteHighlight'
import QuickInsightsPanel from './components/QuickInsightsPanel'
import LiveProgressTracker from './components/LiveProgressTracker'
import NearestBusDetector from './components/NearestBusDetector'
import AIRecommendations from './components/AIRecommendations'
import AIChatWindow from './components/AIChatWindow'
import useJourneyStore from './store/useJourneyStore'
import { STATIONS, ROUTE_15_STATIONS, ROUTE_7_STATIONS, ROUTE_4_STATIONS } from './RouteCoordinates'

const STATION_COORDS_MAP = new Map(
  [...STATIONS, ...ROUTE_15_STATIONS, ...ROUTE_7_STATIONS, ...ROUTE_4_STATIONS].map(station => [
    station.name,
    station.coords
  ])
)

const getStationCoords = (name) => STATION_COORDS_MAP.get(name)

export default function AppEnhanced() {
  const [userLocation, setUserLocation] = useState([23.027159, 72.508525]) // Default: ISKCON area
  const [isLoadingRoute, setIsLoadingRoute] = useState(false)
  const [rightTab, setRightTab] = useState('nearest')
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true)
  const [currentTime, setCurrentTime] = useState('')
  const [isBusServiceActive, setIsBusServiceActive] = useState(true)

  // Get store state
  const journey = useJourneyStore(state => state.journey)
  const originStation = useJourneyStore(state => state.originStation)
  const destinationStation = useJourneyStore(state => state.destinationStation)
  const isTracking = useJourneyStore(state => state.isTracking)

  // Store actions
  const setJourney = useJourneyStore(state => state.setJourney)
  const setOrigin = useJourneyStore(state => state.setOrigin)
  const setDestination = useJourneyStore(state => state.setDestination)
  const setTransferStations = useJourneyStore(state => state.setTransferStations)
  const startTracking = useJourneyStore(state => state.startTracking)
  const stopTracking = useJourneyStore(state => state.stopTracking)
  const reset = useJourneyStore(state => state.reset)

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([
            position.coords.latitude,
            position.coords.longitude
          ])
        },
        (error) => console.log('Geolocation error:', error)
      )
    }
  }, [])

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      )
      const hour = now.getHours()
      setIsBusServiceActive(hour >= 6 && hour < 23)
    }
    updateTime()
    const intervalId = setInterval(updateTime, 1000)
    return () => clearInterval(intervalId)
  }, [])

  // Handle route search
  const handleRouteSelect = async (origin, destination) => {
    stopTracking()
    setTransferStations([])
    setJourney(null)
    setIsLoadingRoute(true)
    setOrigin(origin)
    setDestination(destination)

    try {
      const response = await fetch('http://localhost:8000/api/calculate-journey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin, destination })
      })

      if (response.ok) {
        const data = await response.json()
        
        // Add segments info for timetable (prefer backend-provided segments)
        const segments = Array.isArray(data.segments) && data.segments.length > 0
          ? data.segments
          : (() => {
              const fallback = []
              if (data.transfer) {
                const transfer1 = data.transfer_station_1 || data.transfer_station || 'Transfer Point'
                const transfer2 = data.transfer_station_2 || 'Transfer Point 2'

                fallback.push({
                  route_id: data.route_1,
                  from_station: data.origin,
                  to_station: transfer1,
                  distance_km: Number((data.total_distance_km / (data.route_3 ? 3 : 2)).toFixed(1)),
                  duration_minutes: Math.round(data.eta_minutes / (data.route_3 ? 3 : 2))
                })

                if (data.route_2) {
                  fallback.push({
                    route_id: data.route_2,
                    from_station: transfer1,
                    to_station: data.route_3 ? transfer2 : data.destination,
                    distance_km: Number((data.total_distance_km / (data.route_3 ? 3 : 2)).toFixed(1)),
                    duration_minutes: Math.round(data.eta_minutes / (data.route_3 ? 3 : 2))
                  })
                }

                if (data.route_3) {
                  fallback.push({
                    route_id: data.route_3,
                    from_station: transfer2,
                    to_station: data.destination,
                    distance_km: Number((data.total_distance_km / 3).toFixed(1)),
                    duration_minutes: Math.round(data.eta_minutes / 3)
                  })
                }
              } else {
                fallback.push({
                  route_id: data.route_id,
                  from_station: data.origin,
                  to_station: data.destination,
                  distance_km: data.total_distance_km,
                  duration_minutes: data.eta_minutes
                })
              }
              return fallback
            })()

        data.segments = segments

        setJourney(data)

        // Set transfer stations
        const transfers = []
        if (data.transfer) {
          const fromSegments = segments
            .map((seg, idx) => {
              const next = segments[idx + 1]
              if (!next) return null
              return {
                station: seg.to_station,
                location: getStationCoords(seg.to_station) || null,
                from_route: seg.route_id,
                to_route: next.route_id,
                wait_minutes: 5
              }
            })
            .filter(Boolean)

          const normalizeName = (value) => (value || '').trim().toLowerCase()
          const originName = normalizeName(data.origin)
          const destinationName = normalizeName(data.destination)
          const filtered = fromSegments.filter(t => {
            const stationName = normalizeName(t.station)
            return stationName && stationName !== originName && stationName !== destinationName
          })

          // Fallback to backend fields if segments not available
          if (filtered.length > 0) {
            transfers.push(...filtered)
          } else {
            const transfer1 = data.transfer_station_1 || data.transfer_station
            if (
              transfer1 &&
              data.route_1 &&
              data.route_2 &&
              normalizeName(transfer1) !== originName &&
              normalizeName(transfer1) !== destinationName
            ) {
              transfers.push({
                station: transfer1,
                location: getStationCoords(transfer1) || null,
                from_route: data.route_1,
                to_route: data.route_2,
                wait_minutes: 5
              })
            }
            if (
              data.transfer_station_2 &&
              data.route_2 &&
              data.route_3 &&
              normalizeName(data.transfer_station_2) !== originName &&
              normalizeName(data.transfer_station_2) !== destinationName
            ) {
              transfers.push({
                station: data.transfer_station_2,
                location: getStationCoords(data.transfer_station_2) || null,
                from_route: data.route_2,
                to_route: data.route_3,
                wait_minutes: 5
              })
            }
          }
        }
        setTransferStations(transfers)
      }
    } catch (error) {
      console.error('Error calculating route:', error)
      alert('Error finding route. Try again!')
    } finally {
      setIsLoadingRoute(false)
    }
  }

  const handleStartTracking = () => {
    startTracking()
  }

  const handleCompleteJourney = () => {
    stopTracking()
    alert('🎉 Journey complete! Thanks for using Transit Flow AI')
    reset()
  }



  return (
    <div className="app-enhanced">
      {!isTracking && (
        <div className="app-map-layer" aria-hidden="true">
          <MapWithRouteHighlight />
        </div>
      )}
      {/* Header */}
      <div className="app-header">
        <div className="logo-section">
          <h1 className="app-title">🚌 Transit Flow AI</h1>
          <p className="app-subtitle">Smart Transit with Real-time Tracking</p>
        </div>
        <div className="header-clock" aria-live="polite">
          <span className="clock-dot" aria-hidden="true"></span>
          <span className="clock-time">{currentTime}</span>
        </div>
      </div>

      <div className="app-container">
        {/* Search Bar */}
        <div className="search-section">
          <div className="search-stack">
            <SearchBar onRouteSelect={handleRouteSelect} />
            {!isBusServiceActive && (
              <div className="service-message" role="status" aria-live="polite">
                Buses operate daily from 06:00 to 23:00. Service is currently unavailable.
              </div>
            )}
          </div>
          {isLoadingRoute && <div className="loading-spinner">Finding route...</div>}
        </div>

        {/* Main Content - Split View */}
        <div className={`content-wrapper ${isTracking ? 'tracking-mode' : 'overlay-mode'}`}>
          {/* Left: Map and Tracking */}
          {isTracking && (
            <div className="left-panel">
              <div className="tracking-layout">
                <div className="tracking-map">
                  <MapWithRouteHighlight />
                </div>
                <div className="tracking-panel">
                  <LiveProgressTracker onComplete={handleCompleteJourney} />
                </div>
              </div>
            </div>
          )}

          {/* Right: Quick Insights and Recommendations */}
          {!isTracking && (
            <div className={`right-panel ${isRightPanelOpen ? '' : 'collapsed'}`}>
            <button
              className="panel-toggle"
              type="button"
              aria-label={isRightPanelOpen ? 'Collapse panel' : 'Expand panel'}
              data-open={isRightPanelOpen}
              onClick={() => setIsRightPanelOpen((prev) => !prev)}
            />
            <div className="right-tabs">
              <button
                className={`right-tab ${rightTab === 'insights' ? 'active' : ''}`}
                onClick={() => setRightTab('insights')}
                disabled={!journey || isTracking}
              >
                📋 Insights
              </button>
              <button
                className={`right-tab ${rightTab === 'ai' ? 'active' : ''}`}
                onClick={() => setRightTab('ai')}
              >
                🤖 AI
              </button>
              <button
                className={`right-tab ${rightTab === 'chat' ? 'active' : ''}`}
                onClick={() => setRightTab('chat')}
              >
                💬 Ask AI
              </button>
              <button
                className={`right-tab ${rightTab === 'nearest' ? 'active' : ''}`}
                onClick={() => setRightTab('nearest')}
              >
                🚌 Nearest
              </button>
            </div>

            {isRightPanelOpen && (
              <div className="right-panel-content">
              {rightTab === 'insights' && journey && !isTracking && (
                <QuickInsightsPanel onStartTracking={handleStartTracking} />
              )}

              {rightTab === 'ai' && journey && !isTracking && (
                <AIRecommendations
                  origin={originStation}
                  destination={destinationStation}
                  journey={journey}
                />
              )}

              {rightTab === 'ai' && !journey && !isTracking && (
                <div className="right-panel-placeholder">
                  Select a route to see AI recommendations.
                </div>
              )}

              {rightTab === 'chat' && !isTracking && (
                <AIChatWindow embedded={true} />
              )}

              {rightTab === 'nearest' && (
                <NearestBusDetector userLocation={userLocation} />
              )}
              </div>
            )}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="app-footer">
        <p>🎯 Select a route to get started | 📍 Location: {userLocation ? `${userLocation[0].toFixed(3)}, ${userLocation[1].toFixed(3)}` : 'Detecting...'}</p>
      </div>
    </div>
  )
}
