export interface GeoLocation {
  id: number
  name: string
  latitude: number
  longitude: number
  country?: string
  countryCode?: string
  admin1?: string
  timezone?: string
}

export interface CurrentWeather {
  time: string
  temperature: number
  apparentTemperature: number
  weatherCode: number
  isDay: boolean
  windSpeed: number
  windDirection: number
  windGust: number
  humidity: number
  precipitation: number
  pressure: number
  uvIndex: number
}

export interface HourlyPoint {
  time: string
  temperature: number
  weatherCode: number
  precipitation: number
  precipitationProbability: number
  isDay: boolean
}

export interface DailyPoint {
  date: string
  weatherCode: number
  tempMax: number
  tempMin: number
  precipitationSum: number
  precipitationProbability: number
  sunrise: string
  sunset: string
  windSpeedMax: number
  uvIndexMax: number
}

/** A single point in the short-term precipitation graph (15-minute steps). */
export interface PrecipPoint {
  time: string
  precipitation: number
}

/** Measurement system the user can toggle between. */
export type UnitSystem = 'metric' | 'imperial'

export interface Forecast {
  current: CurrentWeather
  hourly: HourlyPoint[]
  daily: DailyPoint[]
  precip: PrecipPoint[]
  timezone: string
  units: {
    temperature: string
    windSpeed: string
    precipitation: string
  }
}
