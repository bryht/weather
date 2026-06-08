import { useEffect, useMemo, useState } from 'react'
import { CircleMarker, MapContainer, TileLayer, useMap } from 'react-leaflet'
import { FORECAST_FRAMES, fetchPrecipGrid, type PrecipGrid } from '../api/precipGrid'
import ForecastLayer from './ForecastLayer'

interface RadarFrame {
  time: number
  path: string
}

interface RainViewerResponse {
  host: string
  radar: {
    past: RadarFrame[]
    nowcast: RadarFrame[]
  }
}

interface RadarMapProps {
  lat: number
  lon: number
  label: string
}

type Mode = 'forecast' | 'live'

// RainViewer colour scheme 4 ("The Weather Channel") gives the familiar
// Buienradar-like ramp: light green → yellow → orange → red → magenta.
const COLOR_SCHEME = 4
const RADAR_OPACITY = 0.85
const FORECAST_OPACITY = 0.6
const FRAME_MS = 420 // observed (past) frames step quickly
const FORECAST_MS = 750 // linger on RainViewer nowcast frames
const HOLD_LAST_MS = 1600 // pause on the final frame before looping
const FC_FRAME_MS = 850 // our hourly forecast frames step more slowly
const PAST_LOOP_FRAMES = 6

/** Re-centre the Leaflet map whenever the selected location changes. */
function Recenter({ lat, lon }: { lat: number; lon: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView([lat, lon], map.getZoom(), { animate: true })
  }, [lat, lon, map])
  return null
}

/**
 * react-leaflet measures the map at mount, before the card has its final size,
 * which leaves tiles mis-sized/grey. Recompute the size once laid out and on
 * every container resize.
 */
function FixSize() {
  const map = useMap()
  useEffect(() => {
    const fix = () => map.invalidateSize()
    const raf = requestAnimationFrame(fix)
    const t = setTimeout(fix, 300)
    window.addEventListener('resize', fix)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(t)
      window.removeEventListener('resize', fix)
    }
  }, [map])
  return null
}

/**
 * Live radar overlay (RainViewer). Every frame is mounted up-front with its
 * tiles preloaded; we animate by toggling opacity, so stepping through time is
 * smooth and never flashes blank.
 */
function RadarLayers({ host, frames, index }: { host: string; frames: RadarFrame[]; index: number }) {
  if (!host) return null
  return (
    <>
      {frames.map((frame, i) => (
        <TileLayer
          key={frame.path}
          url={`${host}${frame.path}/256/{z}/{x}/{y}/${COLOR_SCHEME}/1_1.png`}
          opacity={i === index ? RADAR_OPACITY : 0}
          maxNativeZoom={10}
          minNativeZoom={1}
          tileSize={256}
          zIndex={300 + i}
        />
      ))}
    </>
  )
}

/** Clock + relative-time label for a frame, at minute or hour granularity. */
function timeInfo(unixSec: number, granularity: 'min' | 'hour') {
  const d = new Date(unixSec * 1000)
  const clock = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const mins = Math.round((unixSec - Date.now() / 1000) / 60)
  let relative: string
  if (granularity === 'hour') {
    const hrs = Math.round(mins / 60)
    relative = hrs <= 0 ? 'Now' : `+${hrs}h`
  } else if (Math.abs(mins) <= 4) {
    relative = 'Now'
  } else {
    relative = mins > 0 ? `+${mins} min` : `${mins} min`
  }
  return { clock, relative, future: mins > 5 }
}

export default function RadarMap({ lat, lon, label }: RadarMapProps) {
  const [mode, setMode] = useState<Mode>('forecast')
  const [playing, setPlaying] = useState(true)

  // --- Live radar (RainViewer) state ---
  const [host, setHost] = useState('')
  const [frames, setFrames] = useState<RadarFrame[]>([])
  const [nowcastStart, setNowcastStart] = useState(0)
  const [liveIndex, setLiveIndex] = useState(0)

  // --- Homemade forecast (Open-Meteo grid) state ---
  const [grid, setGrid] = useState<PrecipGrid | null>(null)
  const [fcIndex, setFcIndex] = useState(0)
  const [fcError, setFcError] = useState(false)

  // Fetch RainViewer frames lazily, the first time Live mode is opened.
  useEffect(() => {
    if (mode !== 'live' || host) return
    let cancelled = false
    fetch('https://api.rainviewer.com/public/weather-maps.json')
      .then((r) => r.json())
      .then((data: RainViewerResponse) => {
        if (cancelled) return
        const past = data.radar?.past ?? []
        const nowcast = data.radar?.nowcast ?? []
        setHost(data.host)
        setFrames([...past, ...nowcast])
        setNowcastStart(past.length)
        setLiveIndex(Math.max(0, past.length - 1))
      })
      .catch(() => {
        /* radar overlay is optional; the base map still renders */
      })
    return () => {
      cancelled = true
    }
  }, [mode, host])

  // (Re)build the forecast grid for the current location whenever Forecast mode
  // is active and the location changes.
  useEffect(() => {
    if (mode !== 'forecast') return
    let cancelled = false
    setFcError(false)
    fetchPrecipGrid(lat, lon)
      .then((g) => {
        if (cancelled) return
        setGrid(g)
        setFcIndex(0)
      })
      .catch(() => {
        if (!cancelled) setFcError(true)
      })
    return () => {
      cancelled = true
    }
  }, [mode, lat, lon])

  const loopStart = Math.max(0, nowcastStart - PAST_LOOP_FRAMES)

  // Live playback: forward-looking loop with lingering forecast frames.
  useEffect(() => {
    if (mode !== 'live' || !playing || frames.length === 0) return
    const last = frames.length - 1
    const delay = liveIndex >= last ? HOLD_LAST_MS : liveIndex >= nowcastStart ? FORECAST_MS : FRAME_MS
    const t = window.setTimeout(() => {
      setLiveIndex((i) => (i >= last ? loopStart : i + 1))
    }, delay)
    return () => window.clearTimeout(t)
  }, [mode, playing, liveIndex, frames.length, nowcastStart, loopStart])

  // Forecast playback: loop the hourly frames, holding a beat on the last one.
  useEffect(() => {
    if (mode !== 'forecast' || !playing || !grid) return
    const last = FORECAST_FRAMES - 1
    const t = window.setTimeout(
      () => setFcIndex((i) => (i >= last ? 0 : i + 1)),
      fcIndex >= last ? HOLD_LAST_MS : FC_FRAME_MS,
    )
    return () => window.clearTimeout(t)
  }, [mode, playing, grid, fcIndex])

  const isForecastMode = mode === 'forecast'

  // Pseudo-frames so the shared timeline can render the forecast hours too.
  const fcTimeline = useMemo<RadarFrame[]>(
    () => (grid ? grid.times.map((t, i) => ({ time: Date.parse(`${t}Z`) / 1000, path: `fc-${i}` })) : []),
    [grid],
  )

  const tlFrames = isForecastMode ? fcTimeline : frames
  const tlIndex = isForecastMode ? fcIndex : liveIndex
  const tlNowcastStart = isForecastMode ? 1 : nowcastStart

  // Header label + forecast badge.
  const info = useMemo(() => {
    if (isForecastMode) {
      const t = fcTimeline[fcIndex]
      if (!t) return null
      return timeInfo(t.time, 'hour')
    }
    const f = frames[liveIndex]
    if (!f) return null
    return timeInfo(f.time, 'min')
  }, [isForecastMode, fcTimeline, fcIndex, frames, liveIndex])

  return (
    <section className="card radar-card">
      <div className="card-head">
        <h2>Rain radar</h2>
        <div className="radar-mode" role="group" aria-label="Radar source">
          <button
            type="button"
            className={isForecastMode ? 'active' : ''}
            aria-pressed={isForecastMode}
            onClick={() => {
              setMode('forecast')
              setPlaying(true)
            }}
          >
            Forecast · 6h
          </button>
          <button
            type="button"
            className={!isForecastMode ? 'active' : ''}
            aria-pressed={!isForecastMode}
            onClick={() => {
              setMode('live')
              setPlaying(true)
            }}
          >
            Live
          </button>
        </div>
      </div>

      <div className="radar-map">
        <MapContainer
          center={[lat, lon]}
          zoom={7}
          minZoom={3}
          maxZoom={11}
          scrollWheelZoom={false}
          style={{ height: '100%', width: '100%' }}
          attributionControl={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            subdomains={['a', 'b', 'c', 'd']}
            maxNativeZoom={19}
            minNativeZoom={0}
          />
          {isForecastMode
            ? grid && <ForecastLayer grid={grid} frame={fcIndex} opacity={FORECAST_OPACITY} />
            : <RadarLayers host={host} frames={frames} index={liveIndex} />}
          <CircleMarker
            center={[lat, lon]}
            radius={6}
            pathOptions={{ color: '#fff', weight: 2, fillColor: '#ff5252', fillOpacity: 1 }}
          />
          <Recenter lat={lat} lon={lon} />
          <FixSize />
        </MapContainer>

        {info && (
          <div className={`radar-time-pill ${info.future ? 'forecast' : ''}`}>
            {info.future && <span className="rfb-dot" />}
            {isForecastMode || info.future ? 'Forecast' : 'Observed'} · {info.relative} · {info.clock}
          </div>
        )}

        {isForecastMode && fcError && (
          <div className="radar-note">Forecast unavailable — try Live radar.</div>
        )}
        {isForecastMode && !grid && !fcError && <div className="radar-note">Building forecast…</div>}

        <div className="radar-legend" aria-hidden="true">
          <span className="radar-legend-label">Light</span>
          <span className="radar-legend-bar" />
          <span className="radar-legend-label">Heavy</span>
        </div>
      </div>

      <div className="radar-controls">
        <button
          className="radar-btn"
          onClick={() => setPlaying((p) => !p)}
          aria-label={playing ? 'Pause animation' : 'Play animation'}
        >
          {playing ? '❚❚' : '▶'}
        </button>

        <RadarTimeline
          frames={tlFrames}
          nowcastStart={tlNowcastStart}
          index={tlIndex}
          onScrub={(i) => {
            setPlaying(false)
            if (isForecastMode) setFcIndex(i)
            else setLiveIndex(i)
          }}
        />
      </div>

      <p className="radar-credit">
        {label} ·{' '}
        {isForecastMode ? (
          <>
            Forecast by{' '}
            <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
              Open-Meteo
            </a>
          </>
        ) : (
          <>
            Radar by{' '}
            <a href="https://www.rainviewer.com/" target="_blank" rel="noreferrer">
              RainViewer
            </a>
          </>
        )}
      </p>
    </section>
  )
}

/**
 * Shared timeline: observed frames on the left, forecast on the right, a "Now"
 * divider between them, clickable ticks for scrubbing, and time labels.
 */
function RadarTimeline({
  frames,
  nowcastStart,
  index,
  onScrub,
}: {
  frames: RadarFrame[]
  nowcastStart: number
  index: number
  onScrub: (i: number) => void
}) {
  if (frames.length === 0) return <div className="radar-timeline empty" />

  const nowPct = (nowcastStart / frames.length) * 100
  const labelEvery = Math.max(1, Math.round(frames.length / 4))
  const labels = frames
    .map((f, i) => ({ i, f }))
    .filter(({ i }) => i % labelEvery === 0 || i === frames.length - 1)

  return (
    <div className="radar-timeline">
      <div className="rt-track" role="group" aria-label="Radar time">
        <span className="rt-now" style={{ left: `${nowPct}%` }} aria-hidden="true">
          <span className="rt-now-tag">Now</span>
        </span>

        {frames.map((frame, i) => {
          const future = i >= nowcastStart
          const active = i === index
          return (
            <button
              key={frame.path}
              type="button"
              className={`rt-seg ${future ? 'future' : 'past'} ${active ? 'active' : ''}`}
              onClick={() => onScrub(i)}
              aria-label={new Date(frame.time * 1000).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
              aria-pressed={active}
            />
          )
        })}
      </div>

      <div className="rt-labels" aria-hidden="true">
        {labels.map(({ i, f }) => (
          <span
            key={f.path}
            className="rt-label"
            style={{ left: `${(i / (frames.length - 1)) * 100}%` }}
          >
            {new Date(f.time * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        ))}
      </div>
    </div>
  )
}
