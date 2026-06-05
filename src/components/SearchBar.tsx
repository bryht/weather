import { useEffect, useRef, useState } from 'react'
import type { GeoLocation } from '../api/types'
import { searchLocations } from '../api/geocoding'
import { locationLabel } from '../utils/format'

interface SearchBarProps {
  onSelect: (loc: GeoLocation) => void
  onUseMyLocation: () => void
  locating: boolean
}

export default function SearchBar({ onSelect, onUseMyLocation, locating }: SearchBarProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GeoLocation[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      return
    }
    setLoading(true)
    const handle = window.setTimeout(async () => {
      try {
        const found = await searchLocations(q)
        setResults(found)
        setOpen(true)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => window.clearTimeout(handle)
  }, [query])

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  function choose(loc: GeoLocation) {
    onSelect(loc)
    setQuery('')
    setResults([])
    setOpen(false)
  }

  return (
    <div className="search" ref={boxRef}>
      <div className="search-row">
        <span className="search-icon" aria-hidden="true">
          🔍
        </span>
        <input
          className="search-input"
          type="text"
          placeholder="Search city or place…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          aria-label="Search for a location"
        />
        <button
          className="loc-btn"
          onClick={onUseMyLocation}
          disabled={locating}
          title="Use my location"
          aria-label="Use my location"
        >
          {locating ? '…' : '📍'}
        </button>
      </div>
      {open && (results.length > 0 || loading) && (
        <ul className="search-results">
          {loading && results.length === 0 && <li className="search-empty">Searching…</li>}
          {results.map((r) => (
            <li key={r.id}>
              <button className="search-result" onClick={() => choose(r)}>
                <span className="result-name">{r.name}</span>
                <span className="result-meta">{locationLabel('', r.admin1, r.country)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
