/**
 * Thin API client with centralised error handling.
 * All fetch-JSON calls go through here so individual API modules
 * don't each need their own `res.ok` check.
 */
export async function apiGet<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`Request failed (${res.status})`)
  return res.json() as Promise<T>
}
