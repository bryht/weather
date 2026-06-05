import type { CurrentWeather, Forecast } from '../api/types'
import { round, windDirectionLabel } from '../utils/format'
import { weatherInfo } from '../utils/weatherCodes'

interface CurrentConditionsProps {
  current: CurrentWeather
  units: Forecast['units']
  locationName: string
}

export default function CurrentConditions({ current, units, locationName }: CurrentConditionsProps) {
  const info = weatherInfo(current.weatherCode, current.isDay)

  const stats = [
    { label: 'Feels like', value: `${round(current.apparentTemperature)}${units.temperature}` },
    {
      label: 'Wind',
      value: `${round(current.windSpeed)} ${units.windSpeed} ${windDirectionLabel(current.windDirection)}`,
    },
    { label: 'Humidity', value: `${round(current.humidity)}%` },
    { label: 'Precip', value: `${current.precipitation.toFixed(1)} ${units.precipitation}` },
    { label: 'Pressure', value: `${round(current.pressure)} hPa` },
  ]

  return (
    <section className="card current-card">
      <div className="current-main">
        <div className="current-icon" aria-hidden="true">
          {info.icon}
        </div>
        <div className="current-temp-block">
          <span className="current-temp">
            {round(current.temperature)}
            <span className="deg">{units.temperature}</span>
          </span>
          <span className="current-desc">{info.label}</span>
          <span className="current-location">{locationName}</span>
        </div>
      </div>
      <div className="current-stats">
        {stats.map((s) => (
          <div className="stat" key={s.label}>
            <span className="stat-label">{s.label}</span>
            <span className="stat-value">{s.value}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
