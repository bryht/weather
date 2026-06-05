/** Format an ISO time string as a short local hour, e.g. "14:00". */
export function formatHour(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

/** Format an ISO date as a weekday, e.g. "Mon". The first item becomes "Today". */
export function formatWeekday(iso: string, index: number): string {
  if (index === 0) return 'Today'
  return new Date(iso).toLocaleDateString([], { weekday: 'short' })
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']

export function windDirectionLabel(deg: number): string {
  return COMPASS[Math.round(deg / 45) % 8]
}

export function round(n: number): number {
  return Math.round(n)
}

export function locationLabel(name: string, admin1?: string, country?: string): string {
  const parts = [name]
  if (admin1 && admin1 !== name) parts.push(admin1)
  if (country) parts.push(country)
  return parts.join(', ')
}
