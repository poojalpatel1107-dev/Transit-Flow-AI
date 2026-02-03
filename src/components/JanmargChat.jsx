import React, { useMemo, useState } from 'react'
import './JanmargChat.css'
import useJourneyStore from '../store/useJourneyStore'

export default function JanmargChat() {
  const origin = useJourneyStore(state => state.originStation)
  const destination = useJourneyStore(state => state.destinationStation)
  const journey = useJourneyStore(state => state.journey)

  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: 'Ask about routes, stations, fares, or bus frequency. I will answer from Janmarg official data.'
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const quickActions = useMemo(() => ([
    { label: 'Fare estimate', value: 'What is the fare for this route?' },
    { label: 'Route stops', value: 'List the stops for my route.' },
    { label: 'Bus frequency', value: 'What is the bus frequency and capacity?' }
  ]), [])

  const sendMessage = async (text) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    setMessages(prev => [...prev, { role: 'user', text: trimmed }])
    setInput('')
    setLoading(true)

    try {
      const response = await fetch('http://localhost:8000/api/janmarg-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          origin,
          destination,
          journey
        })
      })

      if (!response.ok) {
        throw new Error('Chat request failed')
      }

      const data = await response.json()
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          text: data.answer,
          sources: data.sources || []
        }
      ])
    } catch (error) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          text: 'Unable to fetch official data right now. Please try again.'
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    sendMessage(input)
  }

  return (
    <div className="janmarg-chat">
      <div className="chat-header">
        <div>
          <h3>Janmarg Data Chat</h3>
          <p>Official route, bus, and fare details</p>
        </div>
        <span className="chat-pill">Official</span>
      </div>

      <div className="chat-actions">
        {quickActions.map(action => (
          <button
            key={action.label}
            type="button"
            onClick={() => sendMessage(action.value)}
            className="chat-chip"
          >
            {action.label}
          </button>
        ))}
      </div>

      <div className="chat-body">
        {messages.map((message, idx) => (
          <div
            key={`${message.role}-${idx}`}
            className={`chat-message ${message.role}`}
          >
            <div className="chat-bubble">
              <p>{message.text}</p>
              {message.sources && message.sources.length > 0 && (
                <div className="chat-sources">
                  Source: {message.sources.join(', ')}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="chat-message assistant">
            <div className="chat-bubble">
              <p>Fetching official data…</p>
            </div>
          </div>
        )}
      </div>

      <form className="chat-input" onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          onChange={event => setInput(event.target.value)}
          placeholder="Ask about fare, route stops, or bus frequency"
        />
        <button type="submit" disabled={!input.trim() || loading}>
          Send
        </button>
      </form>
    </div>
  )
}
