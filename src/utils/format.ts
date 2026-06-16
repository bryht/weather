/** Format an ISO time string as a short local hour, e.g. "14:00". */
export function formatHour(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

/** Format an ISO date as a weekday, e.g. "Mon". The first item becomes "Today". */
export function formatWeekday(iso: string, index: number): string {
  if (index === 0) return 'Today'
  return new Date(iso).toLocaleDateString([], { weekday: 'short' })
}

const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']

export function windDirectionLabel(deg: number): string {
  return COMPASS[Math.round(deg / 45) % 8]
}


export function formatPrecip(mm: number): string {
  return mm < 1 ? mm.toFixed(2) : mm.toFixed(1)
}

export function locationLabel(name?: string, admin1?: string, country?: string): string {
  const parts: string[] = []
  if (name) parts.push(name)
  if (admin1 && admin1 !== name) parts.push(admin1)
  if (country) parts.push(country)
  return parts.join(', ')
}

/** Map a UV index value to a human risk band and accent colour. */
export function uvLevel(uv: number): { label: string; color: string } {
  if (uv < 3) return { label: 'Low', color: '#7ed957' }
  if (uv < 6) return { label: 'Moderate', color: '#ffd166' }
  if (uv < 8) return { label: 'High', color: '#ff9f45' }
  if (uv < 11) return { label: 'Very high', color: '#ef5350' }
  return { label: 'Extreme', color: '#b388ff' }
}

/**
 * Fraction of daylight elapsed between sunrise and sunset for "now" (0–1),
 * clamped so the sun marker stays on the arc before dawn / after dusk.
 */
export function dayProgress(sunrise: string, sunset: string, now = Date.now()): number {
  const rise = new Date(sunrise).getTime()
  const set = new Date(sunset).getTime()
  if (!Number.isFinite(rise) || !Number.isFinite(set) || set <= rise) return 0
  return Math.min(1, Math.max(0, (now - rise) / (set - rise)))
}
