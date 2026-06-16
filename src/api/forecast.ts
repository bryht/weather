import type {
  CurrentWeather,
  DailyPoint,
  Forecast,
  HourlyPoint,
  PrecipPoint,
  UnitSystem,
} from './types'

import { FORECAST_BASE } from './constants'

interface ForecastApiResponse {
  timezone: string
  current_units: Record<string, string>
  current: {
    time: string
    temperature_2m: number
    apparent_temperature: number
    weather_code: number
    is_day: number
    wind_speed_10m: number
    wind_direction_10m: number
    wind_gusts_10m: number
    relative_humidity_2m: number
    precipitation: number
    surface_pressure: number
  }
  minutely_15?: {
    time: string[]
    precipitation: number[]
  }
  hourly: {
    time: string[]
    temperature_2m: number[]
    weather_code: number[]
    precipitation: number[]
    precipitation_probability: number[]
    is_day: number[]
  }
  daily: {
    time: string[]
    weather_code: number[]
    temperature_2m_max: number[]
    temperature_2m_min: number[]
    precipitation_sum: number[]
    precipitation_probability_max: number[]
    sunrise: string[]
    sunset: string[]
    wind_speed_10m_max: number[]
    uv_index_max: number[]
  }
}

export async function fetchForecast(
  lat: number,
  lon: number,
  unitSystem: UnitSystem = 'metric',
  signal?: AbortSignal,
): Promise<Forecast> {
  const imperial = unitSystem === 'imperial'
  const params = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lon.toFixed(4),
    timezone: 'auto',
    temperature_unit: imperial ? 'fahrenheit' : 'celsius',
    wind_speed_unit: imperial ? 'mph' : 'kmh',
    precipitation_unit: imperial ? 'inch' : 'mm',
    current: [
      'temperature_2m',
      'apparent_temperature',
      'weather_code',
      'is_day',
      'wind_speed_10m',
      'wind_direction_10m',
      'wind_gusts_10m',
      'relative_humidity_2m',
      'precipitation',
      'surface_pressure',
    ].join(','),
    minutely_15: 'precipitation',
    hourly: [
      'temperature_2m',
      'weather_code',
      'precipitation',
      'precipitation_probability',
      'is_day',
    ].join(','),
    daily: [
      'weather_code',
      'temperature_2m_max',
      'temperature_2m_min',
      'precipitation_sum',
      'precipitation_probability_max',
      'sunrise',
      'sunset',
      'wind_speed_10m_max',
      'uv_index_max',
    ].join(','),
    forecast_days: '7',
    forecast_minutely_15: '8',
  })

  const res = await fetch(`${FORECAST_BASE}?${params.toString()}`, { signal })
  if (!res.ok) throw new Error(`Forecast request failed (${res.status})`)
  const data: ForecastApiResponse = await res.json()

  return {
    timezone: data.timezone,
    units: {
      temperature: data.current_units?.temperature_2m ?? '°C',
      windSpeed: data.current_units?.wind_speed_10m ?? 'km/h',
      precipitation: data.current_units?.precipitation ?? 'mm',
    },
    current: mapCurrent(data),
    hourly: mapHourly(data),
    daily: mapDaily(data),
    precip: mapPrecip(data),
  }
}

function mapCurrent(d: ForecastApiResponse): CurrentWeather {
  const c = d.current
  return {
    time: c.time,
    temperature: c.temperature_2m,
    apparentTemperature: c.apparent_temperature,
    weatherCode: c.weather_code,
    isDay: c.is_day === 1,
    windSpeed: c.wind_speed_10m,
    windDirection: c.wind_direction_10m,
    windGust: c.wind_gusts_10m,
    humidity: c.relative_humidity_2m,
    precipitation: c.precipitation,
    pressure: c.surface_pressure,
    uvIndex: d.daily?.uv_index_max?.[0] ?? 0,
  }
}

function mapHourly(d: ForecastApiResponse): HourlyPoint[] {
  const h = d.hourly
  const now = Date.now()
  return h.time
    .map((time, i) => ({
      time,
      temperature: h.temperature_2m[i],
      weatherCode: h.weather_code[i],
      precipitation: h.precipitation[i],
      precipitationProbability: h.precipitation_probability?.[i] ?? 0,
      isDay: (h.is_day?.[i] ?? 1) === 1,
    }))
    // Keep from the current hour onward, capped to the next 24 hours.
    .filter((p) => new Date(p.time).getTime() >= now - 60 * 60 * 1000)
    .slice(0, 24)
}

function mapDaily(d: ForecastApiResponse): DailyPoint[] {
  const day = d.daily
  return day.time.map((date, i) => ({
    date,
    weatherCode: day.weather_code[i],
    tempMax: day.temperature_2m_max[i],
    tempMin: day.temperature_2m_min[i],
    precipitationSum: day.precipitation_sum[i],
    precipitationProbability: day.precipitation_probability_max?.[i] ?? 0,
    sunrise: day.sunrise[i],
    sunset: day.sunset[i],
    windSpeedMax: day.wind_speed_10m_max[i],
    uvIndexMax: day.uv_index_max?.[i] ?? 0,
  }))
}

function mapPrecip(d: ForecastApiResponse): PrecipPoint[] {
  const m = d.minutely_15
  if (!m) return []
  const now = Date.now()
  return m.time
    .map((time, i) => ({ time, precipitation: m.precipitation[i] ?? 0 }))
    .filter((p) => new Date(p.time).getTime() >= now - 15 * 60 * 1000)
    .slice(0, 8)
}
