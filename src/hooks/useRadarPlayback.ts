import { useCallback, useEffect, useMemo, useState } from 'react'
import type { RadarFrame, RadarMode } from './useRadarData'
import type { PrecipGrid } from '../api/precipGrid'
import { formatHour } from '../utils/format'

const FRAME_MS = 420 // observed (past) frames step quickly
const FORECAST_MS = 750 // linger on RainViewer nowcast frames
const HOLD_LAST_MS = 1600 // pause on the final frame before looping
const FC_FRAME_MS = 850 // our hourly forecast frames step more slowly
const PAST_LOOP_FRAMES = 6

export const RADAR_CONFIG = {
  colorScheme: 4, // RainViewer "The Weather Channel" ramp
  radarOpacity: 0.85,
  forecastOpacity: 0.6,
} as const

interface FrameInfo {
  clock: string
  relative: string
  future: boolean
}

/** Clock + relative-time label for a frame, at minute or hour granularity. */
function timeInfo(unixSec: number, granularity: 'min' | 'hour'): FrameInfo {
  const d = new Date(unixSec * 1000)
  const clock = formatHour(d.toISOString())
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

/** Manages radar animation playback: indices, auto-advance, scrubbing, and timeline info. */
export function useRadarPlayback(params: {
  mode: RadarMode
  frames: RadarFrame[]
  nowcastStart: number
  grid: PrecipGrid | null
  fcTimeline: RadarFrame[]
  forecastFrames: number
}) {
  const { mode, frames, nowcastStart, grid, fcTimeline, forecastFrames } = params
  const [playing, setPlaying] = useState(true)
  const [liveIndex, setLiveIndex] = useState(0)
  const [fcIndex, setFcIndex] = useState(0)

  const isForecastMode = mode === 'forecast'

  // Reset live index to the latest past frame when switching to live mode.
  useEffect(() => {
    if (mode === 'live' && nowcastStart > 0) {
      setLiveIndex(Math.max(0, nowcastStart - 1))
    }
  }, [mode, nowcastStart])

  // Reset forecast index when switching to forecast mode or grid changes.
  useEffect(() => {
    if (mode === 'forecast') setFcIndex(0)
  }, [mode, grid])

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
    const last = forecastFrames - 1
    const t = window.setTimeout(
      () => setFcIndex((i) => (i >= last ? 0 : i + 1)),
      fcIndex >= last ? HOLD_LAST_MS : FC_FRAME_MS,
    )
    return () => window.clearTimeout(t)
  }, [mode, playing, grid, fcIndex, forecastFrames])

  const tlFrames = isForecastMode ? fcTimeline : frames
  const tlIndex = isForecastMode ? fcIndex : liveIndex
  const tlNowcastStart = isForecastMode ? 1 : nowcastStart

  // Header label + forecast badge.
  const info = useMemo<FrameInfo | null>(() => {
    if (isForecastMode) {
      const t = fcTimeline[fcIndex]
      if (!t) return null
      return timeInfo(t.time, 'hour')
    }
    const f = frames[liveIndex]
    if (!f) return null
    return timeInfo(f.time, 'min')
  }, [isForecastMode, fcTimeline, fcIndex, frames, liveIndex])

  const handleScrub = useCallback((i: number) => {
    setPlaying(false)
    if (mode === 'forecast') setFcIndex(i)
    else setLiveIndex(i)
  }, [mode])

  return {
    playing,
    setPlaying,
    isForecastMode,
    // Live
    liveIndex,
    // Forecast
    fcIndex,
    // Timeline
    tlFrames,
    tlIndex,
    tlNowcastStart,
    info,
    handleScrub,
  }
}
