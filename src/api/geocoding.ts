import { apiGet } from './client'
import type { GeoLocation } from './types'

const GEO_BASE = 'https://geocoding-api.open-meteo.com/v1'

interface GeoApiResult {
  id: number
  name: string
  latitude: number
  longitude: number
  country?: string
  country_code?: string
  admin1?: string
  timezone?: string
}

/** Search for matching places by name using the Open-Meteo geocoding API. */
export async function searchLocations(query: string, count = 6, signal?: AbortSignal): Promise<GeoLocation[]> {
  const q = query.trim()
  if (q.length < 2) return []

  const url = `${GEO_BASE}/search?name=${encodeURIComponent(q)}&count=${count}&language=en&format=json`
  const data = await apiGet<{ results?: GeoApiResult[] }>(url, signal)
  return (data.results ?? []).map(mapResult)
}

/** Reverse-ish: build a friendly label for a set of coordinates from geolocation. */
export async function nearestPlace(lat: number, lon: number): Promise<GeoLocation> {
  // Open-Meteo has no reverse endpoint, so we synthesise a "My location" entry.
  return {
    id: -1,
    name: 'My location',
    latitude: lat,
    longitude: lon,
  }
}

function mapResult(r: GeoApiResult): GeoLocation {
  return {
    id: r.id,
    name: r.name,
    latitude: r.latitude,
    longitude: r.longitude,
    country: r.country,
    countryCode: r.country_code,
    admin1: r.admin1,
    timezone: r.timezone,
  }
}
