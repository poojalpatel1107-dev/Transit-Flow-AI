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
}) {
  const [showAlternative, setShowAlternative] = useState(false)

  const getComfortLevel = (meter) => {
    if (meter >= 80) return { level: 'Excellent', color: '#10b981' }
    if (meter >= 70) return { level: 'Good', color: '#06b6d4' }
    if (meter >= 60) return { level: 'Moderate', color: '#f59e0b' }
    return { level: 'Crowded', color: '#ef4444' }
  }

  const comfort = comfortMeter ? getComfortLevel(comfortMeter) : null

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

            {/* Metrics Grid */}
            <div className="metrics-grid">
              {/* Comfort Meter */}
              <motion.div
                className="metric-card"
                whileHover={{ scale: 1.05 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <div className="metric-icon" style={{ color: comfort.color }}>
                  <Gauge size={24} />
                </div>
                <div className="metric-content">
                  <div className="metric-label">Comfort Meter</div>
                  <div className="comfort-bar-container">
                    <div 
                      className="comfort-bar"
                      style={{
                        width: `${comfortMeter}%`,
                        backgroundColor: comfort.color,
                      }}
                    />
                  </div>
                  <div className="metric-sublabel">{comfortMeter}% - {comfort.level}</div>
                </div>
              </motion.div>

              {/* Next Bus */}
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
                    {nextBusTime} min
                  </div>
                  <div className="metric-sublabel">Arriving soon</div>
                </div>
              </motion.div>

              {/* Estimated Time */}
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
                    {Math.floor(Math.random() * 15) + 15} min
                  </div>
                  <div className="metric-sublabel">Journey time</div>
                </div>
              </motion.div>
            </div>

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
                  <span>Save 11 mins - Alternative Route</span>
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
                        <h3 className="alternative-title">Faster Route Available</h3>
                        <p className="alternative-subtitle">Route 12: Direct Express via L.D. College</p>
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
                        <div className="comparison-label">Regular Route</div>
                        <div className="comparison-value">
                          <Clock size={16} /> 28 mins
                        </div>
                      </div>
                      <div className="comparison-arrow">→</div>
                      <div className="comparison-item highlight">
                        <div className="comparison-label">AI Route</div>
                        <div className="comparison-value">
                          <Zap size={16} /> 17 mins
                        </div>
                      </div>
                    </div>
                    <motion.button
                      className="apply-button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Apply AI Route
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
