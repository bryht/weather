import { useCallback, useEffect, useState } from 'react'
import { fetchForecast } from './api/forecast'
import { nearestPlace } from './api/geocoding'
import type { Forecast, GeoLocation, UnitSystem } from './api/types'
import CurrentConditions from './components/CurrentConditions'
import DailyForecast from './components/DailyForecast'
import HourlyForecast from './components/HourlyForecast'
import InstallPrompt from './components/InstallPrompt'
import PrecipChart from './components/PrecipChart'
import RadarMap from './components/RadarMap'
import SearchBar from './components/SearchBar'
import SunCard from './components/SunCard'
import UnitToggle from './components/UnitToggle'
import WeatherBackground from './components/WeatherBackground'
import { locationLabel } from './utils/format'
import { themeFor } from './utils/weatherCodes'

const STORAGE_KEY = 'weather:location'
const UNITS_KEY = 'weather:units'

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

function loadSavedUnits(): UnitSystem {
  try {
    return localStorage.getItem(UNITS_KEY) === 'imperial' ? 'imperial' : 'metric'
  } catch {
    return 'metric'
  }
}

export default function App() {
  const [location, setLocation] = useState<GeoLocation>(loadSavedLocation)
  const [units, setUnits] = useState<UnitSystem>(loadSavedUnits)
  const [forecast, setForecast] = useState<Forecast | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [locating, setLocating] = useState(false)

  const loadForecast = useCallback(
    async (loc: GeoLocation, unitSystem: UnitSystem, signal?: AbortSignal) => {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchForecast(loc.latitude, loc.longitude, unitSystem, signal)
        if (!signal?.aborted) setForecast(data)
      } catch (err) {
        if (!signal?.aborted) {
          setError(err instanceof Error ? err.message : 'Could not load the forecast.')
        }
      } finally {
        if (!signal?.aborted) setLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    const controller = new AbortController()
    loadForecast(location, units, controller.signal)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(location))
      localStorage.setItem(UNITS_KEY, units)
    } catch {
      /* ignore */
    }
    return () => controller.abort()
  }, [location, units, loadForecast])

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

  const fullLabel = locationLabel(location.name, location.admin1, location.country)

  return (
    <div className={`app theme-${theme}`}>
      <WeatherBackground theme={theme} />
      <div className="app-inner">
        <header className="app-header">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true">
              🌦️
            </span>
            <div>
              <h1 className="brand-title">Weather</h1>
              <p className="brand-sub">Live rain radar &amp; forecast</p>
            </div>
            <UnitToggle value={units} onChange={setUnits} />
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
            <button onClick={() => loadForecast(location, units)}>Retry</button>
          </div>
        )}

        {loading && !forecast && <LoadingSkeleton />}

        {forecast && (
          <main className={`grid ${loading ? 'is-stale' : ''}`}>
            <CurrentConditions
              current={forecast.current}
              units={forecast.units}
              locationName={fullLabel}
              uvIndex={forecast.daily[0]?.uvIndexMax ?? 0}
            />
            <PrecipChart data={forecast.precip} unit={forecast.units.precipitation} />
            <RadarMap lat={location.latitude} lon={location.longitude} label={fullLabel} />
            {forecast.daily[0] && (
              <SunCard today={forecast.daily[0]} uvIndex={forecast.daily[0].uvIndexMax} />
            )}
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
      <InstallPrompt />
    </div>
  )
}

/** Shimmering placeholder shown while the first forecast loads. */
function LoadingSkeleton() {
  return (
    <div className="grid" aria-busy="true" aria-label="Loading forecast">
      <div className="card skeleton skeleton-current" />
      <div className="card skeleton skeleton-block" />
      <div className="card skeleton skeleton-radar" />
      <div className="card skeleton skeleton-block" />
    </div>
  )
}
