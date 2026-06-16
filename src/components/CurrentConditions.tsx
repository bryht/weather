import type { CurrentWeather, Forecast } from '../api/types'
import { formatPrecip, uvLevel, windDirectionLabel } from '../utils/format'
import { weatherInfo } from '../utils/weatherCodes'

interface CurrentConditionsProps {
  current: CurrentWeather
  units: Forecast['units']
  locationName: string
}

export default function CurrentConditions({ current, units, locationName }: CurrentConditionsProps) {
  const info = weatherInfo(current.weatherCode, current.isDay)
  const uv = uvLevel(current.uvIndex)

  const stats = [
    {
      label: 'Wind',
      value: `${Math.round(current.windSpeed)} ${units.windSpeed} ${windDirectionLabel(current.windDirection)}`,
      arrow: current.windDirection,
    },
    { label: 'Gusts', value: `${Math.round(current.windGust)} ${units.windSpeed}` },
    { label: 'Humidity', value: `${Math.round(current.humidity)}%` },
    { label: 'Precip', value: `${formatPrecip(current.precipitation)} ${units.precipitation}` },
    { label: 'Pressure', value: `${Math.round(current.pressure)} hPa` },
    {
      label: 'UV index',
      value: `${Math.round(current.uvIndex)} · ${uv.label}`,
      dot: uv.color,
    },
  ]

  return (
    <section className="card current-card">
      <div className="current-main">
        <div className="current-icon" aria-hidden="true">
          {info.icon}
        </div>
        <div className="current-temp-block">
          <span className="current-temp">
            {Math.round(current.temperature)}
            <span className="deg">{units.temperature}</span>
          </span>
          <span className="current-desc">{info.label}</span>
          <span className="current-feels">
            Feels like {Math.round(current.apparentTemperature)}
            {units.temperature}
          </span>
          <span className="current-location">📍 {locationName}</span>
        </div>
      </div>
      <div className="current-stats">
        {stats.map((s) => (
          <div className="stat" key={s.label}>
            <span className="stat-label">{s.label}</span>
            <span className="stat-value">
              {s.dot && <span className="uv-dot" style={{ background: s.dot }} />}
              {s.arrow !== undefined && (
                <span
                  className="wind-arrow"
                  style={{ transform: `rotate(${s.arrow}deg)` }}
                  aria-hidden="true"
                >
                  ↑
                </span>
              )}
              {s.value}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
