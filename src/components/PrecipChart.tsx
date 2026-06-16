import type { PrecipPoint } from '../api/types'
import { formatHour, formatPrecip } from '../utils/format'

interface PrecipChartProps {
  data: PrecipPoint[]
  unit: string
}

/**
 * Buienradar's signature: a short-term precipitation graph for the next ~2 hours,
 * built from Open-Meteo's 15-minute precipitation forecast.
 */
export default function PrecipChart({ data, unit }: PrecipChartProps) {
  if (data.length === 0) return null

  const max = Math.max(0.5, ...data.map((d) => d.precipitation))
  const total = data.reduce((sum, d) => sum + d.precipitation, 0)
  const willRain = total > 0.05

  return (
    <section className="card precip-card">
      <div className="card-head">
        <h2>Precipitation · next 2 hours</h2>
        <span className={`precip-summary ${willRain ? 'wet' : 'dry'}`}>
          {willRain ? `${formatPrecip(total)} ${unit} expected` : 'Stays dry'}
        </span>
      </div>
      <div className="precip-graph" role="img" aria-label="Short-term precipitation forecast">
        {data.map((d) => {
          const height = Math.max(2, (d.precipitation / max) * 100)
          return (
            <div className="precip-col" key={d.time}>
              <div className="precip-bar-wrap">
                <div
                  className={`precip-bar ${d.precipitation > 0 ? 'has-rain' : ''}`}
                  style={{ height: `${height}%` }}
                  title={`${formatPrecip(d.precipitation)} ${unit}`}
                />
              </div>
              <span className="precip-label">{formatHour(d.time)}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
