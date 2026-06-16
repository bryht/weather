import { memo, useCallback, useEffect } from 'react'
import { CircleMarker, MapContainer, TileLayer, useMap } from 'react-leaflet'
import ForecastLayer from './ForecastLayer'
import { formatHour } from '../utils/format'
import { useRadarData, type RadarFrame } from '../hooks/useRadarData'
import { useRadarPlayback, RADAR_CONFIG } from '../hooks/useRadarPlayback'

const { colorScheme, radarOpacity, forecastOpacity } = RADAR_CONFIG

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

/**
 * Live radar overlay (RainViewer). Every frame is mounted up-front with its
 * tiles preloaded; we animate by toggling opacity, so stepping through time is
 * smooth and never flashes blank.
 */
const RadarLayers = memo(function RadarLayers({ host, frames, index }: { host: string; frames: RadarFrame[]; index: number }) {
  if (!host) return null
  return (
    <>
      {frames.map((frame, i) => (
        <TileLayer
          key={frame.path}
          url={`${host}${frame.path}/256/{z}/{x}/{y}/${colorScheme}/1_1.png`}
          opacity={i === index ? radarOpacity : 0}
          maxNativeZoom={10}
          minNativeZoom={1}
          tileSize={256}
          zIndex={300 + i}
        />
      ))}
    </>
  )
})

export default function RadarMap({ lat, lon, label }: RadarMapProps) {
  const data = useRadarData(lat, lon)
  const playback = useRadarPlayback({
    mode: data.mode,
    frames: data.frames,
    nowcastStart: data.nowcastStart,
    grid: data.grid,
    fcTimeline: data.fcTimeline,
    forecastFrames: data.FORECAST_FRAMES,
  })

  const { isForecastMode, playing, setPlaying, liveIndex, fcIndex, info, handleScrub } = playback
  const { setMode, host, frames, grid, fcError, frameIntensities } = data

  const switchMode = useCallback((m: 'forecast' | 'live') => {
    setMode(m)
    setPlaying(true)
  }, [setMode, setPlaying])

  return (
    <section className="card radar-card">
      <div className="card-head">
        <h2>Rain radar</h2>
        <div className="radar-mode" role="group" aria-label="Radar source">
          <button
            type="button"
            className={isForecastMode ? 'active' : ''}
            aria-pressed={isForecastMode}
            onClick={() => switchMode('forecast')}
          >
            Forecast · 6h
          </button>
          <button
            type="button"
            className={!isForecastMode ? 'active' : ''}
            aria-pressed={!isForecastMode}
            onClick={() => switchMode('live')}
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
            ? grid && <ForecastLayer grid={grid} frame={fcIndex} opacity={forecastOpacity} />
            : <RadarLayers host={host} frames={frames} index={liveIndex} />}
          {/* Pulsing ring behind the location marker */}
          <CircleMarker
            center={[lat, lon]}
            radius={14}
            pathOptions={{ color: '#fff', weight: 0, fillColor: '#fff', fillOpacity: 0.12 }}
            className="radar-pulse"
          />
          <CircleMarker
            center={[lat, lon]}
            radius={5}
            pathOptions={{ color: '#fff', weight: 2, fillColor: '#ff5252', fillOpacity: 1 }}
          />
          <Recenter lat={lat} lon={lon} />
          <FixSize />
        </MapContainer>

        {info && (
          <div className={`radar-time-pill ${info.future ? 'forecast' : ''}`}>
            <span className="rtp-type">
              {isForecastMode || info.future ? 'Forecast' : 'Observed'}
            </span>
            <span className="rtp-time">
              {info.relative === 'Now' ? 'Now' : info.relative}
              <span className="rtp-clock">{info.clock}</span>
            </span>
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
          className={`radar-btn ${playing ? 'is-playing' : ''}`}
          onClick={() => setPlaying((p) => !p)}
          aria-label={playing ? 'Pause animation' : 'Play animation'}
        >
          {playing ? (
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
              <path d="M8 5.14v13.72a1 1 0 001.5.86l11-6.86a1 1 0 000-1.72l-11-6.86A1 1 0 008 5.14z" />
            </svg>
          )}
        </button>

        <RadarTimeline
          frames={playback.tlFrames}
          nowcastStart={playback.tlNowcastStart}
          index={playback.tlIndex}
          intensities={isForecastMode ? frameIntensities : []}
          onScrub={handleScrub}
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
 * divider between them, intensity bars, a playhead, clickable scrubbing, and time labels.
 */
const RadarTimeline = memo(function RadarTimeline({
  frames,
  nowcastStart,
  index,
  intensities,
  onScrub,
}: {
  frames: RadarFrame[]
  nowcastStart: number
  index: number
  intensities: number[]
  onScrub: (i: number) => void
}) {
  if (frames.length === 0) return <div className="radar-timeline empty" />

  const nowPct = (nowcastStart / frames.length) * 100
  const playheadPct = frames.length > 1 ? (index / (frames.length - 1)) * 100 : 0
  const labelEvery = Math.max(1, Math.round(frames.length / 4))
  const labels = frames
    .map((f, i) => ({ i, f }))
    .filter(({ i }) => i % labelEvery === 0 || i === frames.length - 1)

  return (
    <div className="radar-timeline">
      <div className="rt-track" role="group" aria-label="Radar time">
        {/* Playhead triangle */}
        <span className="rt-playhead" style={{ left: `${playheadPct}%` }} aria-hidden="true" />

        {/* "Now" divider */}
        <span className="rt-now" style={{ left: `${nowPct}%` }} aria-hidden="true">
          <span className="rt-now-tag">Now</span>
        </span>

        {frames.map((frame, i) => {
          const future = i >= nowcastStart
          const active = i === index
          const intensity = intensities[i]
          // Forecast bars use intensity data; live bars use a uniform height.
          const barHeight = intensity !== undefined
            ? `${Math.max(12, intensity * 100)}%`
            : '40%'
          return (
            <button
              key={frame.path}
              type="button"
              className={`rt-seg ${future ? 'future' : 'past'} ${active ? 'active' : ''}`}
              onClick={() => onScrub(i)}
              aria-label={formatHour(new Date(frame.time * 1000).toISOString())}
              aria-pressed={active}
            >
              <span className="rt-bar" style={{ height: barHeight }} />
            </button>
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
            {formatHour(new Date(f.time * 1000).toISOString())}
          </span>
        ))}
      </div>
    </div>
  )
})
