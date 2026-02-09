import React, { useEffect, useRef, useState } from 'react'
import useJourneyStore from '../store/useJourneyStore'
import './AIChatWindow.css'

export default function AIChatWindow({ isOpen = true, onClose, embedded = false }) {
  const origin = useJourneyStore(state => state.originStation)
  const destination = useJourneyStore(state => state.destinationStation)
  const journey = useJourneyStore(state => state.journey)
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: 'Ask about Janmarg operational rules, frequency, peak hours, or fares.'
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef(null)

  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, loading])

  if (!embedded && !isOpen) return null

  const sendMessage = async () => {
    const trimmed = input.trim()
    if (!trimmed || loading) return

    setMessages(prev => [...prev, { role: 'user', text: trimmed }])
    setInput('')
    setLoading(true)

    try {
      const history = messages
        .slice(-6)
        .map(item => ({ role: item.role, content: item.text }))

      const response = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          origin,
          destination,
          journey,
          history
        })
      })

      if (!response.ok) {
        throw new Error('Chat request failed')
      }

      const data = await response.json()
      setMessages(prev => [...prev, { role: 'assistant', text: data.response }])
    } catch (error) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          text: 'Janmarg AI is unavailable right now. Please try again.'
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    sendMessage()
  }

  const wrapperClass = embedded ? 'ai-chat-embedded' : 'ai-chat-overlay'
  const dialogProps = embedded ? {} : { role: 'dialog', 'aria-modal': 'true' }

  return (
    <div className={wrapperClass} {...dialogProps}>
      <div className="ai-chat-window">
        <header className="ai-chat-header">
          <div>
            <h3>Janmarg Transit AI Assistant</h3>
          </div>
          {!embedded && (
            <button type="button" className="ai-chat-close" onClick={onClose}>
              Close
            </button>
          )}
        </header>

        <div className="ai-chat-body">
          {messages.map((message, idx) => (
            <div
              key={`${message.role}-${idx}`}
              className={`ai-chat-message ${message.role}`}
            >
              <div className="ai-chat-bubble">
                {message.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="ai-chat-message assistant">
              <div className="ai-chat-bubble typing">Janmarg AI is thinking...</div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <form className="ai-chat-input" onSubmit={handleSubmit}>
          <input
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask Janmarg AI"
          />
          <button type="submit" disabled={!input.trim() || loading}>
            Send
          </button>
        </form>
      </div>
    </div>
  )
}
