import { useMemo } from 'react'

interface WeatherBackgroundProps {
  /** Theme key from themeFor() — drives which animated layer is shown. */
  theme: string
}

/**
 * A lightweight, GPU-friendly animated backdrop that reacts to the weather
 * theme: drifting stars at night, a glowing sun on clear days, raked rain
 * streaks when it's wet, and slow snowfall. All motion is CSS-driven and
 * automatically stilled for users who prefer reduced motion (see index.css).
 */
export default function WeatherBackground({ theme }: WeatherBackgroundProps) {
  const isRain = theme === 'rain' || theme === 'storm'
  const isSnow = theme === 'snow'
  const isClearDay = theme === 'clear' || theme === 'partly'
  const isNight = theme === 'night'

  // Pre-compute particle positions once so they don't reshuffle every render.
  const drops = useMemo(() => makeDrops(60), [])
  const flakes = useMemo(() => makeFlakes(40), [])
  const stars = useMemo(() => makeStars(50), [])

  return (
    <div className="weather-bg" aria-hidden="true">
      {/* Soft colour wash that sits over the base gradient */}
      <div className="bg-glow" />

      {isClearDay && <div className="bg-sun" />}

      {isNight && (
        <div className="bg-stars">
          {stars.map((s, i) => (
            <span
              key={i}
              className="star"
              style={{
                left: `${s.left}%`,
                top: `${s.top}%`,
                width: `${s.size}px`,
                height: `${s.size}px`,
                animationDelay: `${s.delay}s`,
                animationDuration: `${s.dur}s`,
              }}
            />
          ))}
        </div>
      )}

      {isRain && (
        <div className="bg-rain">
          {drops.map((d, i) => (
            <span
              key={i}
              className="drop"
              style={{
                left: `${d.left}%`,
                animationDelay: `${d.delay}s`,
                animationDuration: `${d.dur}s`,
                opacity: d.opacity,
              }}
            />
          ))}
        </div>
      )}

      {isSnow && (
        <div className="bg-snow">
          {flakes.map((f, i) => (
            <span
              key={i}
              className="flake"
              style={{
                left: `${f.left}%`,
                fontSize: `${f.size}px`,
                animationDelay: `${f.delay}s`,
                animationDuration: `${f.dur}s`,
                opacity: f.opacity,
              }}
            >
              ❄
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function makeDrops(n: number) {
  return Array.from({ length: n }, () => ({
    left: rand(0, 100),
    delay: rand(0, 1.2),
    dur: rand(0.5, 1.1),
    opacity: rand(0.15, 0.5),
  }))
}

function makeFlakes(n: number) {
  return Array.from({ length: n }, () => ({
    left: rand(0, 100),
    size: rand(8, 18),
    delay: rand(0, 6),
    dur: rand(6, 12),
    opacity: rand(0.4, 0.9),
  }))
}

function makeStars(n: number) {
  return Array.from({ length: n }, () => ({
    left: rand(0, 100),
    top: rand(0, 70),
    size: rand(1, 2.6),
    delay: rand(0, 4),
    dur: rand(2.5, 6),
  }))
}

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min
}
