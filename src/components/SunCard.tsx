import type { DailyPoint } from '../api/types'
import { dayProgress, formatTime, uvLevel } from '../utils/format'

interface SunCardProps {
  today: DailyPoint
  uvIndex: number
}

/**
 * Sunrise / sunset card with a live arc showing where the sun is in the day,
 * plus the current UV index. Uses data already returned by the forecast API.
 */
export default function SunCard({ today, uvIndex }: SunCardProps) {
  const progress = dayProgress(today.sunrise, today.sunset)
  const isUp = progress > 0 && progress < 1

  // Position the sun marker along a semicircle (180° sweep).
  const angle = Math.PI * progress
  const cx = 50 - Math.cos(angle) * 44
  const cy = 50 - Math.sin(angle) * 44

  const uv = uvLevel(uvIndex)

  return (
    <section className="card sun-card">
      <div className="card-head">
        <h2>Sun &amp; UV</h2>
        <span className="sun-state">{isUp ? '☀️ Up' : '🌙 Down'}</span>
      </div>

      <div className="sun-arc-wrap">
        <svg className="sun-arc" viewBox="0 0 100 56" preserveAspectRatio="xMidYMax meet">
          <defs>
            <linearGradient id="arcGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#ffb347" />
              <stop offset="50%" stopColor="#ffd166" />
              <stop offset="100%" stopColor="#ff8a65" />
            </linearGradient>
          </defs>
          {/* Dashed horizon + full arc track */}
          <line x1="2" y1="50" x2="98" y2="50" className="sun-horizon" />
          <path d="M 6 50 A 44 44 0 0 1 94 50" className="sun-track" />
          {/* Filled portion up to current progress */}
          <path
            d="M 6 50 A 44 44 0 0 1 94 50"
            className="sun-progress"
            style={{ strokeDashoffset: 138 * (1 - progress) }}
          />
          {isUp && <circle cx={cx} cy={cy} r="4.5" className="sun-dot" />}
        </svg>
      </div>

      <div className="sun-times">
        <div className="sun-time">
          <span className="sun-time-label">Sunrise</span>
          <span className="sun-time-value">🌅 {formatTime(today.sunrise)}</span>
        </div>
        <div className="sun-uv">
          <span className="sun-time-label">UV index</span>
          <span className="sun-time-value">
            <span className="uv-dot" style={{ background: uv.color }} />
            {Math.round(uvIndex)} · {uv.label}
          </span>
        </div>
        <div className="sun-time end">
          <span className="sun-time-label">Sunset</span>
          <span className="sun-time-value">🌇 {formatTime(today.sunset)}</span>
        </div>
      </div>
    </section>
  )
}
