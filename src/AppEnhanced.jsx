import React, { useState, useEffect } from 'react'
import './AppEnhanced.css'
import SearchBar from './components/SearchBar'
import MapWithRouteHighlight from './components/MapWithRouteHighlight'
import QuickInsightsPanel from './components/QuickInsightsPanel'
import LiveProgressTracker from './components/LiveProgressTracker'
import NearestBusDetector from './components/NearestBusDetector'
import AIRecommendations from './components/AIRecommendations'
import useJourneyStore from './store/useJourneyStore'

export default function AppEnhanced() {
  const [userLocation, setUserLocation] = useState([23.027159, 72.508525]) // Default: ISKCON area
  const [isLoadingRoute, setIsLoadingRoute] = useState(false)

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

  // Handle route search
  const handleRouteSelect = async (origin, destination) => {
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
        
        // Add segments info for timetable
        const segments = []
        if (data.transfer) {
          // Multi-hop journey
          segments.push({
            route_id: data.route_1,
            from_station: data.origin,
            to_station: data.transfer_station_1 || 'Transfer Point',
            distance_km: (data.total_distance_km / 3).toFixed(1),
            duration_minutes: Math.round(data.eta_minutes / 3)
          })
          if (data.route_2) {
            segments.push({
              route_id: data.route_2,
              from_station: data.transfer_station_1 || 'Transfer Point',
              to_station: data.transfer_station_2 || 'Transfer Point 2',
              distance_km: (data.total_distance_km / 3).toFixed(1),
              duration_minutes: Math.round(data.eta_minutes / 3)
            })
          }
          if (data.route_3) {
            segments.push({
              route_id: data.route_3,
              from_station: data.transfer_station_2 || 'Transfer Point 2',
              to_station: data.destination,
              distance_km: (data.total_distance_km / 3).toFixed(1),
              duration_minutes: Math.round(data.eta_minutes / 3)
            })
          }
        } else {
          // Single route
          segments.push({
            route_id: data.route_id,
            from_station: data.origin,
            to_station: data.destination,
            distance_km: data.total_distance_km,
            duration_minutes: data.eta_minutes
          })
        }

        data.segments = segments

        setJourney(data)

        // Set transfer stations
        const transfers = []
        if (data.transfer) {
          if (data.transfer_station_1) {
            transfers.push({
              station: data.transfer_station_1,
              from_route: data.route_1,
              to_route: data.route_2,
              wait_minutes: 5
            })
          }
          if (data.transfer_station_2) {
            transfers.push({
              station: data.transfer_station_2,
              from_route: data.route_2,
              to_route: data.route_3,
              wait_minutes: 5
            })
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
      {/* Header */}
      <div className="app-header">
        <div className="logo-section">
          <h1 className="app-title">🚌 Transit Flow AI</h1>
          <p className="app-subtitle">Smart Transit with Real-time Tracking</p>
        </div>
      </div>

      <div className="app-container">
        {/* Search Bar */}
        <div className="search-section">
          <SearchBar onRouteSelect={handleRouteSelect} />
          {isLoadingRoute && <div className="loading-spinner">Finding route...</div>}
        </div>

        {/* Main Content - Split View */}
        <div className="content-wrapper">
          {/* Left: Map and Tracking */}
          <div className="left-panel">
            {isTracking ? (
              <div className="tracking-container">
                <LiveProgressTracker onComplete={handleCompleteJourney} />
              </div>
            ) : (
              <MapWithRouteHighlight />
            )}
          </div>

          {/* Right: Quick Insights and Recommendations */}
          <div className="right-panel">
            {journey && !isTracking && (
              <>
                <QuickInsightsPanel onStartTracking={handleStartTracking} />
                <AIRecommendations
                  origin={originStation}
                  destination={destinationStation}
                />
              </>
            )}

            {/* Nearest Bus (Always visible when have location) */}
            <NearestBusDetector userLocation={userLocation} />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="app-footer">
        <p>🎯 Select a route to get started | 📍 Location: {userLocation ? `${userLocation[0].toFixed(3)}, ${userLocation[1].toFixed(3)}` : 'Detecting...'}</p>
      </div>
    </div>
  )
}
