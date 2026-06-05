import { useCallback, useEffect, useState } from 'react'
import { fetchForecast } from './api/forecast'
import { nearestPlace } from './api/geocoding'
import type { Forecast, GeoLocation } from './api/types'
import CurrentConditions from './components/CurrentConditions'
import DailyForecast from './components/DailyForecast'
import HourlyForecast from './components/HourlyForecast'
import PrecipChart from './components/PrecipChart'
import RadarMap from './components/RadarMap'
import SearchBar from './components/SearchBar'
import { locationLabel } from './utils/format'
import { themeFor } from './utils/weatherCodes'

const STORAGE_KEY = 'weather:location'

// Amsterdam — a nod to Buienradar's Dutch roots — as the default first view.
const DEFAULT_LOCATION: GeoLocation = {
  id: 2759794,
  name: 'Amsterdam',
  latitude: 52.374,
  longitude: 4.8897,
  country: 'Netherlands',
  admin1: 'North Holland',
}

function loadSavedLocation(): GeoLocation {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as GeoLocation
  } catch {
    /* ignore malformed storage */
  }
  return DEFAULT_LOCATION
}

export default function App() {
  const [location, setLocation] = useState<GeoLocation>(loadSavedLocation)
  const [forecast, setForecast] = useState<Forecast | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [locating, setLocating] = useState(false)

  const loadForecast = useCallback(async (loc: GeoLocation) => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchForecast(loc.latitude, loc.longitude)
      setForecast(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the forecast.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadForecast(location)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(location))
    } catch {
      /* ignore */
    }
  }, [location, loadForecast])

  const handleUseMyLocation = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setError('Geolocation is not supported by this browser.')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const loc = await nearestPlace(pos.coords.latitude, pos.coords.longitude)
        setLocation(loc)
        setLocating(false)
      },
      () => {
        setError('Location permission denied.')
        setLocating(false)
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
    )
  }, [])

  const theme = forecast
    ? themeFor(forecast.current.weatherCode, forecast.current.isDay)
    : 'night'

  const fullLabel =
    location.name === 'My location'
      ? 'My location'
      : locationLabel(location.name, location.admin1, location.country)

  return (
    <div className={`app theme-${theme}`}>
      <div className="app-inner">
        <header className="app-header">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true">
              🌧️
            </span>
            <div>
              <h1 className="brand-title">Weather</h1>
              <p className="brand-sub">Live rain radar &amp; forecast</p>
            </div>
          </div>
          <SearchBar
            onSelect={setLocation}
            onUseMyLocation={handleUseMyLocation}
            locating={locating}
          />
        </header>

        {error && (
          <div className="banner error">
            <span>{error}</span>
            <button onClick={() => loadForecast(location)}>Retry</button>
          </div>
        )}

        {loading && !forecast && <div className="loading">Loading forecast…</div>}

        {forecast && (
          <main className={`grid ${loading ? 'is-stale' : ''}`}>
            <CurrentConditions
              current={forecast.current}
              units={forecast.units}
              locationName={fullLabel}
            />
            <PrecipChart data={forecast.precip} unit={forecast.units.precipitation} />
            <RadarMap lat={location.latitude} lon={location.longitude} label={fullLabel} />
            <HourlyForecast data={forecast.hourly} units={forecast.units} />
            <DailyForecast data={forecast.daily} units={forecast.units} />
          </main>
        )}

        <footer className="app-footer">
          <span>
            Data by{' '}
            <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
              Open-Meteo
            </a>
          </span>
          <span className="footer-sep">·</span>
          <span>Inspired by Buienradar</span>
        </footer>
      </div>
    </div>
  )
}
