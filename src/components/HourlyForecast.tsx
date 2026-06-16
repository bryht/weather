import type { Forecast, HourlyPoint } from '../api/types'
import { formatHour } from '../utils/format'
import { weatherInfo } from '../utils/weatherCodes'

interface HourlyForecastProps {
  data: HourlyPoint[]
  units: Forecast['units']
}

const ITEM_W = 60 // px — must match .hourly-item width in CSS
const CURVE_H = 40 // px — height of the SVG temperature curve band

export default function HourlyForecast({ data, units }: HourlyForecastProps) {
  if (data.length === 0) return null

  // Build a smooth temperature curve across the strip. Each point sits at the
  // horizontal centre of its column; y is scaled within the curve band.
  const temps = data.map((h) => h.temperature)
  const min = Math.min(...temps)
  const max = Math.max(...temps)
  const span = Math.max(1, max - min)
  const width = data.length * ITEM_W

  const points = temps.map((t, i) => {
    const x = i * ITEM_W + ITEM_W / 2
    const y = CURVE_H - 6 - ((t - min) / span) * (CURVE_H - 12)
    return { x, y }
  })
  const line = points.map((p) => `${p.x},${p.y.toFixed(1)}`).join(' ')
  const area = `0,${CURVE_H} ${line} ${width},${CURVE_H}`

  return (
    <section className="card hourly-card">
      <div className="card-head">
        <h2>Next 24 hours</h2>
      </div>
      <div className="hourly-scroll">
        <div className="hourly-inner" style={{ width }}>
          <svg
            className="hourly-curve"
            width={width}
            height={CURVE_H}
            viewBox={`0 0 ${width} ${CURVE_H}`}
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="tempFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(79,195,247,0.35)" />
                <stop offset="100%" stopColor="rgba(79,195,247,0)" />
              </linearGradient>
            </defs>
            <polygon points={area} fill="url(#tempFill)" />
            <polyline
              points={line}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {points.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r="2" fill="var(--accent)" />
            ))}
          </svg>
          <div className="hourly-row">
            {data.map((h, i) => {
              const info = weatherInfo(h.weatherCode, h.isDay)
              return (
                <div className="hourly-item" key={h.time}>
                  <span className="hourly-temp">
                    {Math.round(h.temperature)}
                    {units.temperature}
                  </span>
                  <span className="hourly-icon" aria-label={info.label} title={info.label}>
                    {info.icon}
                  </span>
                  <span className={`hourly-pop ${h.precipitationProbability >= 30 ? 'likely' : ''}`}>
                    💧{h.precipitationProbability}%
                  </span>
                  <span className="hourly-time">{i === 0 ? 'Now' : formatHour(h.time)}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
