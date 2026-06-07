import type { UnitSystem } from '../api/types'

interface UnitToggleProps {
  value: UnitSystem
  onChange: (value: UnitSystem) => void
}

/** Segmented °C / °F switch that also flips wind & precipitation units. */
export default function UnitToggle({ value, onChange }: UnitToggleProps) {
  return (
    <div className="unit-toggle" role="group" aria-label="Temperature units">
      <button
        type="button"
        className={value === 'metric' ? 'active' : ''}
        aria-pressed={value === 'metric'}
        onClick={() => onChange('metric')}
      >
        °C
      </button>
      <button
        type="button"
        className={value === 'imperial' ? 'active' : ''}
        aria-pressed={value === 'imperial'}
        onClick={() => onChange('imperial')}
      >
        °F
      </button>
    </div>
  )
}
