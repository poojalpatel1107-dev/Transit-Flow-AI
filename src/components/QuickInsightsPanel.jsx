import React, { useState, useEffect } from 'react'
import useJourneyStore from '../store/useJourneyStore'
import './QuickInsightsPanel.css'

export default function QuickInsightsPanel({ onStartTracking }) {
  const journey = useJourneyStore(state => state.journey)
  const transferStations = useJourneyStore(state => state.transferStations)
  const [activeTab, setActiveTab] = useState('timetable') // 'timetable' or 'transfers'

  if (!journey) {
    return null
  }

  const segments = journey.segments || [
    {
      route_id: journey.route_id,
      from_station: journey.origin,
      to_station: journey.destination,
      distance_km: journey.total_distance_km,
      duration_minutes: journey.eta_minutes
    }
  ]

  const renderTimetable = () => {
    return (
      <div className="timetable">
        <div className="journey-header">
          <h3>📋 Journey Timetable</h3>
          <span className="total-time">{journey.eta_minutes} min</span>
        </div>

        {segments.map((segment, idx) => (
          <div key={idx} className="segment-card">
            <div className="segment-header">
              <span className="route-tag">Route {segment.route_id}</span>
              <span className="segment-number">Leg {idx + 1}</span>
            </div>

            <div className="segment-details">
              <div className="station-pair">
                <div className="station start">
                  <div className="station-icon">🚪</div>
                  <div className="station-info">
                    <p className="label">From</p>
                    <p className="station-name">{segment.from_station}</p>
                  </div>
                </div>

                <div className="route-duration">
                  <div className="duration-bar">
                    <div className="duration-value">
                      {Math.round(segment.duration_minutes || journey.eta_minutes / segments.length)} min
                    </div>
                    <div className="distance-value">
                      {segment.distance_km || (journey.total_distance_km / segments.length).toFixed(1)} km
                    </div>
                  </div>
                </div>

                <div className="station end">
                  <div className="station-icon">📍</div>
                  <div className="station-info">
                    <p className="label">To</p>
                    <p className="station-name">{segment.to_station}</p>
                  </div>
                </div>
              </div>

              {idx < segments.length - 1 && (
                <div className="transfer-indicator">
                  <span className="transfer-icon">🔄</span>
                  <span className="transfer-text">Transfer to Route {segments[idx + 1].route_id}</span>
                </div>
              )}
            </div>
          </div>
        ))}

        <button className="start-journey-btn" onClick={onStartTracking}>
          <span className="btn-icon">▶️</span> Start Journey Tracking
        </button>
      </div>
    )
  }

  const renderTransfers = () => {
    const transferCount = transferStations ? transferStations.length : 0
    return (
      <div className="transfers-panel">
        <div className="panel-header">
          <h3>🔄 Transfer Stations</h3>
          <span className="transfer-count">{transferCount} transfers</span>
        </div>

        {transferCount > 0 ? (
          <div className="transfers-list">
            {transferStations.map((transfer, idx) => (
              <div key={idx} className="transfer-card">
                <div className="transfer-number">#{idx + 1}</div>
                <div className="transfer-content">
                  <h4>{transfer.station}</h4>
                  <div className="transfer-routes">
                    <span className="route-badge">{transfer.from_route}</span>
                    <span className="arrow">→</span>
                    <span className="route-badge">{transfer.to_route}</span>
                  </div>
                  <div className="transfer-stats">
                    <div className="stat">
                      <span className="stat-icon">⏱️</span>
                      <span className="stat-value">{transfer.wait_minutes || 5} min wait</span>
                    </div>
                    <div className="stat">
                      <span className="stat-icon">🏢</span>
                      <span className="stat-value">Covered platform</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-transfers">
            <p>✅ Direct route - No transfers needed!</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="quick-insights-panel">
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'timetable' ? 'active' : ''}`}
          onClick={() => setActiveTab('timetable')}
        >
          📋 Timetable
        </button>
        <button
          className={`tab ${activeTab === 'transfers' ? 'active' : ''}`}
          onClick={() => setActiveTab('transfers')}
        >
          🔄 Transfers
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'timetable' && renderTimetable()}
        {activeTab === 'transfers' && renderTransfers()}
      </div>
    </div>
  )
}
