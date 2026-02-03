import React, { useState } from 'react'
import { Search } from 'lucide-react'
import './SearchBar.css'

const STOPS = [
  'ISKCON Cross Road', 
  'ISRO Colony',
  'Star Bazaar',
  'Jodhpur Char Rasta',
  'Shivranjani', 
  'Jhansi Ki Rani', 
  'Nehrunagar', 
  'Manekbag', 
  'Dharnidhar Derasar', 
  'Anjali Cross Road',
  'Himmatlal Park',
  'University',
  'Memnagar',
  'Sola Cross-Road',
  'Shastrinagar',
  'Pragatinagar',
  'Akbarnagar',
  'Ranip Cross-Road',
  'RTO Circle',
  'Ahmedabad Domestic Airport',
  'Sabarmati Power-House',
  'Sabarmati Police Station',
  'Motera Cross-Road',
  'Visat-Gandhinagar Junction',
  'Vishwakarma Government Engineering College'
]

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
