import type { DailyPoint, Forecast } from '../api/types'
import { formatWeekday } from '../utils/format'
import { weatherInfo } from '../utils/weatherCodes'

interface DailyForecastProps {
  data: DailyPoint[]
  units: Forecast['units']
}

export default function DailyForecast({ data, units }: DailyForecastProps) {
  if (data.length === 0) return null

  // Shared min/max across the week so the temperature bars line up visually.
  const allMin = Math.min(...data.map((d) => d.tempMin))
  const allMax = Math.max(...data.map((d) => d.tempMax))
  const span = Math.max(1, allMax - allMin)

  return (
    <section className="card daily-card">
      <div className="card-head">
        <h2>7-day forecast</h2>
      </div>
      <div className="daily-list">
        {data.map((d, i) => {
          const info = weatherInfo(d.weatherCode, true)
          const left = ((d.tempMin - allMin) / span) * 100
          const width = ((d.tempMax - d.tempMin) / span) * 100
          return (
            <div className="daily-row" key={d.date}>
              <span className="daily-day">{formatWeekday(d.date, i)}</span>
              <span className="daily-icon" aria-label={info.label} title={info.label}>
                {info.icon}
              </span>
              <span className="daily-pop">💧{d.precipitationProbability}%</span>
              <span className="daily-min">
                {Math.round(d.tempMin)}
                {units.temperature}
              </span>
              <div className="daily-bar-track">
                <div
                  className="daily-bar-fill"
                  style={{ left: `${left}%`, width: `${Math.max(8, width)}%` }}
                />
              </div>
              <span className="daily-max">
                {Math.round(d.tempMax)}
                {units.temperature}
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
