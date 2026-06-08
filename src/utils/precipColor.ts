/**
 * Shared precipitation colour ramp (mm/h → RGBA), used by both the homemade
 * forecast overlay and the legend. Mirrors the familiar Buienradar intensity
 * scale: light green → green → yellow → orange → red → magenta.
 */
export function precipColor(mm: number): [number, number, number, number] {
  if (mm < 0.1) return [0, 0, 0, 0]
  if (mm < 0.5) return [143, 240, 143, 120]
  if (mm < 1) return [31, 179, 31, 150]
  if (mm < 2.5) return [244, 224, 0, 175]
  if (mm < 5) return [255, 140, 0, 195]
  if (mm < 10) return [255, 42, 42, 210]
  return [255, 55, 198, 225]
}
