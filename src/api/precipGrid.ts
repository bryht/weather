/**
 * A homemade precipitation "radar" built from Open-Meteo's free forecast.
 *
 * RainViewer's free nowcast only reaches ~30 minutes ahead. Instead we sample a
 * grid of points around the location, ask Open-Meteo for each point's hourly
 * precipitation, and hand back the values so the map can render an animated
 * heatmap several hours into the future — no API key, same free data source we
 * already use elsewhere.
 */

import { apiGet } from './client'
import { FORECAST_BASE } from './constants'

const COLS = 13
const ROWS = 9
const STEP = 0.5 // degrees between grid points (~55 km; smoothed when drawn)
export const FORECAST_FRAMES = 7 // current hour + next 6 hours

export interface PrecipGrid {
  cols: number
  rows: number
  south: number
  north: number
  west: number
  east: number
  /** ISO (GMT) timestamp for each frame. */
  times: string[]
  /** frames[frame][row * cols + col] = precipitation in mm for that cell. */
  frames: number[][]
  /** Largest precipitation value across all frames (for scaling/feedback). */
  max: number
}

const round2 = (n: number) => Math.round(n * 100) / 100

/** Fetch the precipitation grid centred on (lat, lon). */
export async function fetchPrecipGrid(lat: number, lon: number): Promise<PrecipGrid> {
  const south = round2(lat - ((ROWS - 1) / 2) * STEP)
  const west = round2(lon - ((COLS - 1) / 2) * STEP)

  const lats: number[] = []
  const lons: number[] = []
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      lats.push(round2(south + r * STEP)) // row 0 = southernmost
      lons.push(round2(west + c * STEP)) // col 0 = westernmost
    }
  }

  const params = new URLSearchParams({
    latitude: lats.join(','),
    longitude: lons.join(','),
    hourly: 'precipitation',
    timezone: 'GMT',
    forecast_days: '2',
  })

  const data = await apiGet<unknown>(`${FORECAST_BASE}?${params.toString()}`)
  // Open-Meteo returns an array when several coordinates are requested.
  const locs: Array<{ hourly?: { time: string[]; precipitation: number[] } }> = Array.isArray(data)
    ? data
    : [data]

  const baseTimes = locs[0]?.hourly?.time ?? []
  const now = Date.now()
  let start = baseTimes.findIndex((t) => Date.parse(`${t}Z`) >= now - 30 * 60 * 1000)
  if (start < 0) start = 0

  const times: string[] = []
  const frames: number[][] = []
  let max = 0

  for (let f = 0; f < FORECAST_FRAMES; f++) {
    const idx = start + f
    times.push(baseTimes[idx] ?? '')
    const cells = locs.map((loc) => loc?.hourly?.precipitation?.[idx] ?? 0)
    for (const v of cells) if (v > max) max = v
    frames.push(cells)
  }

  return {
    cols: COLS,
    rows: ROWS,
    south,
    north: round2(south + (ROWS - 1) * STEP),
    west,
    east: round2(west + (COLS - 1) * STEP),
    times,
    frames,
    max,
  }
}
