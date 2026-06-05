import type { Forecast, HourlyPoint } from '../api/types'
import { formatHour, round } from '../utils/format'
import { weatherInfo } from '../utils/weatherCodes'

interface HourlyForecastProps {
  data: HourlyPoint[]
  units: Forecast['units']
}

export default function HourlyForecast({ data, units }: HourlyForecastProps) {
  if (data.length === 0) return null

  return (
    <section className="card hourly-card">
      <div className="card-head">
        <h2>Next 24 hours</h2>
      </div>
      <div className="hourly-scroll">
        {data.map((h, i) => {
          const info = weatherInfo(h.weatherCode, h.isDay)
          return (
            <div className="hourly-item" key={h.time}>
              <span className="hourly-time">{i === 0 ? 'Now' : formatHour(h.time)}</span>
              <span className="hourly-icon" aria-label={info.label} title={info.label}>
                {info.icon}
              </span>
              <span className="hourly-temp">
                {round(h.temperature)}
                {units.temperature}
              </span>
              <span className={`hourly-pop ${h.precipitationProbability >= 30 ? 'likely' : ''}`}>
                💧{h.precipitationProbability}%
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
