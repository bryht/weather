// WMO weather interpretation codes used by Open-Meteo.
// https://open-meteo.com/en/docs

export interface WeatherInfo {
  label: string
  icon: string // emoji glyph, varies by day/night where relevant
}

interface CodeEntry {
  label: string
  day: string
  night: string
}

const CODES: Record<number, CodeEntry> = {
  0: { label: 'Clear sky', day: '☀️', night: '🌙' },
  1: { label: 'Mainly clear', day: '🌤️', night: '🌙' },
  2: { label: 'Partly cloudy', day: '⛅', night: '☁️' },
  3: { label: 'Overcast', day: '☁️', night: '☁️' },
  45: { label: 'Fog', day: '🌫️', night: '🌫️' },
  48: { label: 'Rime fog', day: '🌫️', night: '🌫️' },
  51: { label: 'Light drizzle', day: '🌦️', night: '🌧️' },
  53: { label: 'Drizzle', day: '🌦️', night: '🌧️' },
  55: { label: 'Heavy drizzle', day: '🌧️', night: '🌧️' },
  56: { label: 'Freezing drizzle', day: '🌧️', night: '🌧️' },
  57: { label: 'Freezing drizzle', day: '🌧️', night: '🌧️' },
  61: { label: 'Light rain', day: '🌦️', night: '🌧️' },
  63: { label: 'Rain', day: '🌧️', night: '🌧️' },
  65: { label: 'Heavy rain', day: '🌧️', night: '🌧️' },
  66: { label: 'Freezing rain', day: '🌧️', night: '🌧️' },
  67: { label: 'Freezing rain', day: '🌧️', night: '🌧️' },
  71: { label: 'Light snow', day: '🌨️', night: '🌨️' },
  73: { label: 'Snow', day: '🌨️', night: '🌨️' },
  75: { label: 'Heavy snow', day: '❄️', night: '❄️' },
  77: { label: 'Snow grains', day: '🌨️', night: '🌨️' },
  80: { label: 'Rain showers', day: '🌦️', night: '🌧️' },
  81: { label: 'Rain showers', day: '🌧️', night: '🌧️' },
  82: { label: 'Violent rain showers', day: '⛈️', night: '⛈️' },
  85: { label: 'Snow showers', day: '🌨️', night: '🌨️' },
  86: { label: 'Heavy snow showers', day: '❄️', night: '❄️' },
  95: { label: 'Thunderstorm', day: '⛈️', night: '⛈️' },
  96: { label: 'Thunderstorm, hail', day: '⛈️', night: '⛈️' },
  99: { label: 'Thunderstorm, hail', day: '⛈️', night: '⛈️' },
}

const FALLBACK: CodeEntry = { label: 'Unknown', day: '❓', night: '❓' }

export function weatherInfo(code: number, isDay = true): WeatherInfo {
  const entry = CODES[code] ?? FALLBACK
  return { label: entry.label, icon: isDay ? entry.day : entry.night }
}

/** Pick a background gradient theme key based on conditions and time of day. */
export function themeFor(code: number, isDay: boolean): string {
  if (!isDay) return 'night'
  if (code === 0 || code === 1) return 'clear'
  if (code === 2) return 'partly'
  if (code >= 45 && code <= 48) return 'fog'
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return 'snow'
  if (code >= 95) return 'storm'
  if (code >= 51) return 'rain'
  return 'cloudy'
}
