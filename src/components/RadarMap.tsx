import { useEffect, useMemo, useState } from 'react'
import { CircleMarker, MapContainer, TileLayer, useMap } from 'react-leaflet'

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

// RainViewer colour scheme 4 ("The Weather Channel") gives the familiar
// Buienradar-like ramp: light green → yellow → orange → red → magenta.
const COLOR_SCHEME = 4
const RADAR_OPACITY = 0.85
const FRAME_MS = 450 // time each frame is shown while playing
const HOLD_LAST_MS = 1400 // pause on the final (newest forecast) frame

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
 * Radar overlay (RainViewer). Every frame is mounted up-front with its tiles
 * preloaded; we animate purely by toggling opacity, so stepping through time is
 * smooth and never flashes blank — the way Buienradar's loop feels.
 */
function RadarLayers({
  host,
  frames,
  index,
}: {
  host: string
  frames: RadarFrame[]
  index: number
}) {
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

export default function RadarMap({ lat, lon, label }: RadarMapProps) {
  const [host, setHost] = useState('')
  const [frames, setFrames] = useState<RadarFrame[]>([])
  const [nowcastStart, setNowcastStart] = useState(0)
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch('https://api.rainviewer.com/public/weather-maps.json')
      .then((r) => r.json())
      .then((data: RainViewerResponse) => {
        if (cancelled) return
        const past = data.radar?.past ?? []
        const nowcast = data.radar?.nowcast ?? []
        const all = [...past, ...nowcast]
        setHost(data.host)
        setFrames(all)
        setNowcastStart(past.length)
        // Start on the most recent observed frame ("now").
        setIndex(Math.max(0, past.length - 1))
      })
      .catch(() => {
        /* radar overlay is optional; the base map still renders */
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Advance one frame at a time, holding a beat on the final forecast frame
  // before looping — mirrors Buienradar's playback rhythm.
  useEffect(() => {
    if (!playing || frames.length === 0) return
    const isLast = index === frames.length - 1
    const t = window.setTimeout(
      () => setIndex((i) => (i + 1) % frames.length),
      isLast ? HOLD_LAST_MS : FRAME_MS,
    )
    return () => window.clearTimeout(t)
  }, [playing, index, frames.length])

  const current = frames[index] ?? null
  const isForecast = index >= nowcastStart

  const { clock, relative } = useMemo(() => {
    if (!current) return { clock: '', relative: '' }
    const d = new Date(current.time * 1000)
    const clockStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const mins = Math.round((current.time - Date.now() / 1000) / 60)
    let rel: string
    if (Math.abs(mins) <= 4) rel = 'Now'
    else if (mins > 0) rel = `+${mins} min`
    else rel = `${mins} min`
    return { clock: clockStr, relative: rel }
  }, [current])

  return (
    <section className="card radar-card">
      <div className="card-head">
        <h2>Rain radar</h2>
        <span className={`radar-time ${isForecast ? 'forecast' : ''}`}>
          {relative} · {clock}
        </span>
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
          <RadarLayers host={host} frames={frames} index={index} />
          <CircleMarker
            center={[lat, lon]}
            radius={6}
            pathOptions={{ color: '#fff', weight: 2, fillColor: '#ff5252', fillOpacity: 1 }}
          />
          <Recenter lat={lat} lon={lon} />
          <FixSize />
        </MapContainer>

        {/* Precipitation intensity legend, Buienradar-style */}
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
          aria-label={playing ? 'Pause radar animation' : 'Play radar animation'}
        >
          {playing ? '❚❚' : '▶'}
        </button>

        <RadarTimeline
          frames={frames}
          nowcastStart={nowcastStart}
          index={index}
          onScrub={(i) => {
            setPlaying(false)
            setIndex(i)
          }}
        />
      </div>

      <p className="radar-credit">
        {label} · Radar by{' '}
        <a href="https://www.rainviewer.com/" target="_blank" rel="noreferrer">
          RainViewer
        </a>
      </p>
    </section>
  )
}

/**
 * A Buienradar-style timeline: past frames on the left, forecast (nowcast) on
 * the right, a "Now" divider between them, and a draggable playhead. Each frame
 * is a clickable tick for precise scrubbing.
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

  // A handful of evenly spaced time labels along the track.
  const labelEvery = Math.max(1, Math.round(frames.length / 4))
  const labels = frames
    .map((f, i) => ({ i, f }))
    .filter(({ i }) => i % labelEvery === 0 || i === frames.length - 1)

  return (
    <div className="radar-timeline">
      <div className="rt-track" role="group" aria-label="Radar time">
        {/* Now divider between observed and forecast halves */}
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
            {new Date(f.time * 1000).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        ))}
      </div>
    </div>
  )
}
