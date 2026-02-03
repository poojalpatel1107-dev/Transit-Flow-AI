import React, { useEffect, useState } from 'react'
import './AIRecommendations.css'

export default function AIRecommendations({ origin, destination }) {
  const [recommendations, setRecommendations] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!origin || !destination) return

    const fetchRecommendations = async () => {
      setLoading(true)
      try {
        const response = await fetch('http://localhost:8000/api/smart-recommendations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ origin, destination })
        })
        const data = await response.json()
        setRecommendations(data)
      } catch (error) {
        console.error('Error fetching recommendations:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchRecommendations()
  }, [origin, destination])

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'HIGH': return '#FF6B6B'
      case 'MEDIUM': return '#FFC107'
      case 'LOW': return '#2196F3'
      default: return '#999'
    }
  }

  const getPriorityBgColor = (priority) => {
    switch (priority) {
      case 'HIGH': return 'rgba(255, 107, 107, 0.1)'
      case 'MEDIUM': return 'rgba(255, 193, 7, 0.1)'
      case 'LOW': return 'rgba(33, 150, 243, 0.1)'
      default: return 'rgba(0, 0, 0, 0.05)'
    }
  }

  if (loading) {
    return <div className="recommendations-loading">Loading smart recommendations...</div>
  }

  if (recommendations.length === 0) {
    return null
  }

  return (
    <div className="ai-recommendations">
      <div className="recs-header">
        <span className="recs-icon">🤖</span>
        <h3>Smart Recommendations</h3>
      </div>

      <div className="recs-list">
        {recommendations.map((rec, idx) => (
          <div
            key={idx}
            className="rec-card"
            style={{
              borderLeftColor: getPriorityColor(rec.priority),
              background: getPriorityBgColor(rec.priority)
            }}
          >
            <div className="rec-priority">
              <span className="priority-badge" style={{ background: getPriorityColor(rec.priority) }}>
                {rec.priority}
              </span>
            </div>

            <div className="rec-content">
              <div className="rec-title">
                <span className="rec-icon">{rec.icon}</span>
                {rec.title}
              </div>
              <p className="rec-description">{rec.description}</p>

              {rec.action && (
                <div className="rec-action">
                  <span className="action-arrow">→</span>
                  {rec.action}
                </div>
              )}

              {rec.eta && (
                <div className="rec-meta">
                  <span className="meta-item">⏱️ {rec.eta} min</span>
                </div>
              )}

              {rec.total_time && (
                <div className="rec-meta">
                  <span className="meta-item">⏳ {rec.total_time}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
