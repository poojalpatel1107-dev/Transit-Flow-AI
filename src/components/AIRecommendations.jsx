import React, { useEffect, useState } from 'react'
import './AIRecommendations.css'

export default function AIRecommendations({ origin, destination, journey }) {
  const [recommendations, setRecommendations] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!origin || !destination) return

    const fetchRecommendations = async () => {
      setLoading(true)
      setError('')
      try {
        const response = await fetch('http://localhost:8000/api/smart-recommendations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ origin, destination, journey })
        })
        const data = await response.json()
        setRecommendations(data)
      } catch (error) {
        console.error('Error fetching recommendations:', error)
        setError('Unable to load recommendations. Try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchRecommendations()
  }, [origin, destination, journey])

  const getPriorityClass = (priority) => {
    switch (priority) {
      case 'HIGH': return 'priority-high'
      case 'MEDIUM': return 'priority-medium'
      case 'LOW': return 'priority-low'
      default: return 'priority-default'
    }
  }

  if (loading) {
    return <div className="recommendations-loading">Loading smart recommendations...</div>
  }

  if (error) {
    return <div className="recommendations-loading">{error}</div>
  }

  if (recommendations.length === 0) {
    return (
      <div className="ai-recommendations">
        <div className="recs-header">
          <span className="recs-icon">🤖</span>
          <div className="recs-title">
            <h3>Smart Recommendations</h3>
            <p className="recs-subtitle">For {origin} → {destination}</p>
          </div>
        </div>
        <div className="recs-empty">No recommendations available yet.</div>
      </div>
    )
  }

  return (
    <div className="ai-recommendations">
      <div className="recs-header">
        <span className="recs-icon">🤖</span>
        <div className="recs-title">
          <h3>Smart Recommendations</h3>
          <p className="recs-subtitle">For {origin} → {destination}</p>
        </div>
      </div>

      <div className="recs-list">
        {recommendations.map((rec, idx) => (
          <div
            key={idx}
            className={`rec-card ${getPriorityClass(rec.priority)}`}
          >
            <div className="rec-priority">
              <span className={`priority-badge ${getPriorityClass(rec.priority)}`}>
                {rec.priority}
              </span>
              {rec.confidence && (
                <span className="confidence-badge">{rec.confidence}% confidence</span>
              )}
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
                  <span className="action-text">{rec.action}</span>
                </div>
              )}

              {(rec.eta || rec.total_time || rec.wait_minutes) && (
                <div className="rec-meta">
                  {rec.eta && <span className="meta-item">⏱️ {rec.eta} min</span>}
                  {rec.total_time && <span className="meta-item">⏳ {rec.total_time}</span>}
                  {rec.wait_minutes && <span className="meta-item">🕒 {rec.wait_minutes} min wait</span>}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
