import { useEffect, useMemo, useRef, useState } from 'react'
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

/** Animated rain radar overlay sourced from the free RainViewer API. */
function RadarLayer({ host, frame, opacity }: { host: string; frame: RadarFrame | null; opacity: number }) {
  if (!frame) return null
  // color 4 = "Universal Blue" scheme, smooth=1, snow=1
  const url = `${host}${frame.path}/256/{z}/{x}/{y}/4/1_1.png`
  return <TileLayer key={frame.path} url={url} opacity={opacity} />
}

export default function RadarMap({ lat, lon, label }: RadarMapProps) {
  const [host, setHost] = useState('')
  const [frames, setFrames] = useState<RadarFrame[]>([])
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(true)
  const timer = useRef<number | null>(null)

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
        setIndex(Math.max(0, past.length - 1))
      })
      .catch(() => {
        /* radar overlay is optional; the base map still renders */
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!playing || frames.length === 0) return
    timer.current = window.setInterval(() => {
      setIndex((i) => (i + 1) % frames.length)
    }, 700)
    return () => {
      if (timer.current) window.clearInterval(timer.current)
    }
  }, [playing, frames.length])

  const current = frames[index] ?? null
  const frameLabel = useMemo(() => {
    if (!current) return ''
    const d = new Date(current.time * 1000)
    const now = Date.now() / 1000
    const tag = current.time > now ? ' (forecast)' : ''
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + tag
  }, [current])

  return (
    <section className="card radar-card">
      <div className="card-head">
        <h2>Rain radar</h2>
        <span className="radar-time">{frameLabel}</span>
      </div>
      <div className="radar-map">
        <MapContainer
          center={[lat, lon]}
          zoom={8}
          scrollWheelZoom={false}
          style={{ height: '100%', width: '100%' }}
          attributionControl={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            subdomains={['a', 'b', 'c', 'd']}
          />
          <RadarLayer host={host} frame={current} opacity={0.7} />
          <CircleMarker
            center={[lat, lon]}
            radius={6}
            pathOptions={{ color: '#fff', weight: 2, fillColor: '#ff5252', fillOpacity: 1 }}
          />
          <Recenter lat={lat} lon={lon} />
          <FixSize />
        </MapContainer>
      </div>
      <div className="radar-controls">
        <button
          className="radar-btn"
          onClick={() => setPlaying((p) => !p)}
          aria-label={playing ? 'Pause radar animation' : 'Play radar animation'}
        >
          {playing ? '❚❚' : '▶'}
        </button>
        <input
          className="radar-slider"
          type="range"
          min={0}
          max={Math.max(0, frames.length - 1)}
          value={index}
          onChange={(e) => {
            setPlaying(false)
            setIndex(Number(e.target.value))
          }}
          aria-label="Radar time"
        />
        <span className="radar-loc">{label}</span>
      </div>
      <p className="radar-credit">
        Radar by <a href="https://www.rainviewer.com/" target="_blank" rel="noreferrer">RainViewer</a>
      </p>
    </section>
  )
}
