import React, { useState } from 'react'
import { Search } from 'lucide-react'
import './SearchBar.css'

const STOPS = ['Shivranjani', 'ISKCON', 'Nehrunagar', 'L.D. College', 'RTO']

function SearchBar({ onRouteSelect }) {
  const [source, setSource] = useState('')
  const [destination, setDestination] = useState('')

  const handleSearch = () => {
    if (source && destination && source !== destination) {
      onRouteSelect(source, destination)
    }
  }

  return (
    <div className="search-bar-container">
      <div className="search-bar glass-effect">
        <div className="search-icon">
          <Search size={20} color="#000000" />
        </div>

        <div className="search-inputs">
          {/* Source Dropdown */}
          <div className="dropdown-wrapper">
            <label>From</label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="dropdown"
            >
              <option value="">Select Source</option>
              {STOPS.map((stop) => (
                <option key={stop} value={stop}>
                  {stop}
                </option>
              ))}
            </select>
          </div>

          {/* Destination Dropdown */}
          <div className="dropdown-wrapper">
            <label>To</label>
            <select
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="dropdown"
            >
              <option value="">Select Destination</option>
              {STOPS.map((stop) => (
                <option key={stop} value={stop}>
                  {stop}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleSearch}
          className="search-button"
          disabled={!source || !destination || source === destination}
        >
          Search
        </button>
      </div>
    </div>
  )
}

export default SearchBar
