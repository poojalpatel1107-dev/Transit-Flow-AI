import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bus, Gauge, Clock, X, Zap } from 'lucide-react'
import './CommutInsights.css'

function CommutInsights({
  show,
  source,
  destination,
  comfortMeter,
  nextBusTime,
  onClose,
  insightData = null,
  isLoadingInsight = false,
}) {
  const [showAlternative, setShowAlternative] = useState(false)

  const getComfortLevel = (meter) => {
    if (meter >= 80) return { level: 'Excellent', color: '#10b981' }
    if (meter >= 70) return { level: 'Good', color: '#06b6d4' }
    if (meter >= 60) return { level: 'Moderate', color: '#f59e0b' }
    return { level: 'Crowded', color: '#ef4444' }
  }

  const comfort = comfortMeter ? getComfortLevel(comfortMeter) : null

  // Get dynamic next bus time from insight data if available
  const displayNextBusTime = insightData?.next_bus_in || nextBusTime
  const displayFrequency = insightData?.frequency || 'N/A'
  const displayTravelTime = insightData?.travel_time ? Math.round(insightData.travel_time) : '15'
  const displayCrowd = insightData?.crowd || 'Moderate'

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="insights-container"
          initial={{ y: 400, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 400, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          <div className="insights-card glass-effect">
            {/* Header */}
            <div className="insights-header">
              <h2 className="insights-title">Quick Commute Insights</h2>
              <button className="close-button" onClick={onClose}>
                <X size={20} />
              </button>
            </div>

            {/* Route Info */}
            <div className="route-info">
              <div className="route-endpoint">
                <div className="stop-label">From</div>
                <div className="stop-name">{source}</div>
              </div>
              <div className="route-arrow">→</div>
              <div className="route-endpoint">
                <div className="stop-label">To</div>
                <div className="stop-name">{destination}</div>
              </div>
            </div>

            {/* Metrics Grid - Dynamic data from physics engine */}
            <div className="metrics-grid">
              {/* Comfort Meter */}
              <motion.div
                className="metric-card"
                whileHover={{ scale: 1.05 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <div className="metric-icon" style={{ color: comfort?.color }}>
                  <Gauge size={24} />
                </div>
                <div className="metric-content">
                  <div className="metric-label">Comfort Meter</div>
                  <div className="comfort-bar-container">
                    <div 
                      className="comfort-bar"
                      style={{
                        width: `${comfortMeter}%`,
                        backgroundColor: comfort?.color,
                      }}
                    />
                  </div>
                  <div className="metric-sublabel">{comfortMeter}% - {comfort?.level}</div>
                </div>
              </motion.div>

              {/* Next Bus - Dynamic from /api/insight */}
              <motion.div
                className="metric-card"
                whileHover={{ scale: 1.05 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <div className="metric-icon" style={{ color: '#3b82f6' }}>
                  <Bus size={24} />
                </div>
                <div className="metric-content">
                  <div className="metric-label">Next Bus</div>
                  <div className="metric-value" style={{ color: '#3b82f6' }}>
                    {isLoadingInsight ? '...' : displayNextBusTime} min
                  </div>
                  <div className="metric-sublabel">Every {displayFrequency} min</div>
                </div>
              </motion.div>

              {/* Estimated Duration - Dynamic from physics calculation */}
              <motion.div
                className="metric-card"
                whileHover={{ scale: 1.05 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <div className="metric-icon" style={{ color: '#8b5cf6' }}>
                  <Clock size={24} />
                </div>
                <div className="metric-content">
                  <div className="metric-label">Est. Duration</div>
                  <div className="metric-value" style={{ color: '#8b5cf6' }}>
                    {displayTravelTime} min
                  </div>
                  <div className="metric-sublabel">Journey time</div>
                </div>
              </motion.div>

              {/* Crowd Level - Dynamic from time-based calculation */}
              <motion.div
                className="metric-card"
                whileHover={{ scale: 1.05 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <div className="metric-icon" style={{ color: displayCrowd.includes('Standing') ? '#ff0055' : displayCrowd.includes('Mixed') ? '#ffcc00' : '#00ff99' }}>
                  <Zap size={24} />
                </div>
                <div className="metric-content">
                  <div className="metric-label">Crowd Level</div>
                  <div className="metric-value" style={{ color: displayCrowd.includes('Standing') ? '#ff0055' : displayCrowd.includes('Mixed') ? '#ffcc00' : '#00ff99' }}>
                    {displayCrowd}
                  </div>
                  <div className="metric-sublabel">Real-time status</div>
                </div>
              </motion.div>
            </div>

            {/* Status from physics engine */}
            {insightData && !isLoadingInsight && (
              <div style={{
                padding: '12px',
                background: 'rgba(0, 255, 153, 0.1)',
                border: '1px solid rgba(0, 255, 153, 0.3)',
                borderRadius: '8px',
                textAlign: 'center',
                marginBottom: '16px',
                fontSize: '12px',
                color: '#00ff99',
              }}>
                <p style={{ margin: 0 }}>⚡ {insightData.status}</p>
              </div>
            )}

            {/* AI Suggestion Section */}
            <AnimatePresence>
              {!showAlternative ? (
                <motion.button
                  key="save-button"
                  className="alternative-route-button"
                  onClick={() => setShowAlternative(true)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  layout
                >
                  <Zap size={18} />
                  <span>Check Alternative Routes</span>
                </motion.button>
              ) : (
                <motion.div
                  key="alternative-info"
                  className="alternative-route-info"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ type: 'spring', damping: 25 }}
                >
                  <div className="alternative-content">
                    <div className="alternative-header">
                      <div>
                        <h3 className="alternative-title">Route Information</h3>
                        <p className="alternative-subtitle">{insightData?.status || 'Real-time predictions'}</p>
                      </div>
                      <button
                        className="close-alternative"
                        onClick={() => setShowAlternative(false)}
                      >
                        ✕
                      </button>
                    </div>
                    <div className="alternative-comparison">
                      <div className="comparison-item">
                        <div className="comparison-label">Travel Time</div>
                        <div className="comparison-value">
                          <Clock size={16} /> {displayTravelTime} mins
                        </div>
                      </div>
                      <div className="comparison-arrow">•</div>
                      <div className="comparison-item highlight">
                        <div className="comparison-label">Crowd Level</div>
                        <div className="comparison-value">
                          <Bus size={16} /> {displayCrowd}
                        </div>
                      </div>
                    </div>
                    <motion.button
                      className="apply-button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      View Full Analytics
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default CommutInsights
