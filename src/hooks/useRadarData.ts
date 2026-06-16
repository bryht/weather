import { useEffect, useMemo, useState } from 'react'
import { FORECAST_FRAMES, fetchPrecipGrid, type PrecipGrid } from '../api/precipGrid'

export interface RadarFrame {
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

export type RadarMode = 'forecast' | 'live'

/**
 * Fetches radar data for the rain radar map:
 * - Live mode: RainViewer past + nowcast frames
 * - Forecast mode: Open-Meteo precipitation grid
 */
export function useRadarData(lat: number, lon: number) {
  const [mode, setMode] = useState<RadarMode>('forecast')

  // --- Live radar (RainViewer) state ---
  const [host, setHost] = useState('')
  const [frames, setFrames] = useState<RadarFrame[]>([])
  const [nowcastStart, setNowcastStart] = useState(0)

  // --- Homemade forecast (Open-Meteo grid) state ---
  const [grid, setGrid] = useState<PrecipGrid | null>(null)
  const [fcError, setFcError] = useState(false)

  // Pseudo-frames so the shared timeline can render the forecast hours too.
  const fcTimeline = useMemo<RadarFrame[]>(
    () => (grid ? grid.times.map((t, i) => ({ time: Date.parse(`${t}Z`) / 1000, path: `fc-${i}` })) : []),
    [grid],
  )

  // Normalised precipitation intensity (0–1) per forecast frame, for the timeline bars.
  const frameIntensities = useMemo<number[]>(() => {
    if (!grid || grid.max === 0) return []
    return grid.frames.map((frame) => {
      const sum = frame.reduce((s, v) => s + v, 0)
      // Normalise against a moderate-rain baseline so typical rain fills the bar.
      const baseline = frame.length * 1.5 // ~1.5 mm/h across the grid = full bar
      return Math.min(1, sum / baseline)
    })
  }, [grid])

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
      })
      .catch(() => {
        if (!cancelled) setFcError(true)
      })
    return () => {
      cancelled = true
    }
  }, [mode, lat, lon])

  return {
    mode,
    setMode,
    // Live
    host,
    frames,
    nowcastStart,
    // Forecast
    grid,
    fcError,
    fcTimeline,
    frameIntensities,
    FORECAST_FRAMES,
  }
}
