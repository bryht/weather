import { memo, useMemo } from 'react'
import { ImageOverlay } from 'react-leaflet'
import type { PrecipGrid } from '../api/precipGrid'
import { precipColor } from '../utils/precipColor'

interface ForecastLayerProps {
  grid: PrecipGrid
  frame: number
  opacity: number
}

/**
 * Renders one frame of the homemade precipitation forecast as a Leaflet
 * ImageOverlay. The grid is painted onto a tiny canvas (one pixel per cell);
 * Leaflet then scales it across the bounds, and the browser's bilinear
 * smoothing turns the coarse grid into soft, radar-like precipitation blobs.
 */
export default memo(function ForecastLayer({ grid, frame, opacity }: ForecastLayerProps) {
  const url = useMemo(() => buildFrameDataUrl(grid, frame), [grid, frame])
  const bounds = useMemo(
    () => [[grid.south, grid.west], [grid.north, grid.east]] as [[number, number], [number, number]],
    [grid.south, grid.west, grid.north, grid.east],
  )
  if (!url) return null

  return <ImageOverlay url={url} bounds={bounds} opacity={opacity} zIndex={350} />
})

function buildFrameDataUrl(grid: PrecipGrid, frame: number): string {
  const values = grid.frames[frame]
  if (!values) return ''

  const canvas = document.createElement('canvas')
  canvas.width = grid.cols
  canvas.height = grid.rows
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''

  const img = ctx.createImageData(grid.cols, grid.rows)
  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.cols; col++) {
      const value = values[row * grid.cols + col] ?? 0
      const [r, g, b, a] = precipColor(value)
      // Canvas y grows downward (north at top); our grid row 0 is the south.
      const canvasRow = grid.rows - 1 - row
      const p = (canvasRow * grid.cols + col) * 4
      img.data[p] = r
      img.data[p + 1] = g
      img.data[p + 2] = b
      img.data[p + 3] = a
    }
  }
  ctx.putImageData(img, 0, 0)
  return canvas.toDataURL()
}
