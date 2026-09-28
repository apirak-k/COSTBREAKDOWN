import React from 'react'
import type { ScenarioInputDefinition } from '../scenario-inputs'

interface ScenarioInputFieldProps {
  definition: ScenarioInputDefinition
  scenarioLetter: 'A' | 'B' | 'C'
  value: string | undefined
  onChange: (inputKey: string, value: string) => void
}

function formatValue(value: number | null, displayScale: number): string {
  if (value === null) return 'N/A'
  return (value * displayScale).toLocaleString(undefined, { maximumFractionDigits: 4 })
}

export const ScenarioInputField: React.FC<ScenarioInputFieldProps> = ({
  definition,
  scenarioLetter,
  value,
  onChange
}) => {
  const safeKey = definition.key.replace(/[^a-zA-Z0-9_-]/g, '-')
  const inputId = `scenario-${scenarioLetter}-input-${safeKey}`
  const helperId = `${inputId}-help`
  const currentDisplay = formatValue(definition.currentValue, definition.displayScale)
  const currentWithUnit = definition.unit
    ? `${currentDisplay} ${definition.unit}`
    : currentDisplay

  return (
    <div className="min-w-0 space-y-1.5">
      <label htmlFor={inputId} className="block text-sm font-medium text-slate-800">
        <span className="block">{definition.label}</span>
        <span className="mt-0.5 block font-normal text-slate-500">
          Current: <span className="font-mono tabular-nums">{currentWithUnit}</span>
        </span>
      </label>
      <div className="flex items-center gap-2">
        <input
          id={inputId}
          type="number"
          step="any"
          inputMode="decimal"
          value={value ?? ''}
          onChange={event => onChange(definition.key, event.target.value)}
          placeholder={definition.currentValue === null ? undefined : currentDisplay}
          aria-describedby={helperId}
          className="min-h-10 min-w-0 flex-1 rounded-sm border border-slate-300 bg-white px-3 py-2 font-mono text-sm tabular-nums text-slate-900 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
        {definition.unit && (
          <span className="shrink-0 text-xs text-slate-600" aria-hidden="true">
            {definition.unit}
          </span>
        )}
      </div>
      <p id={helperId} className="text-xs leading-5 text-slate-600">
        Leave blank to use Current. The value is entered in {definition.unit || 'the displayed unit'}.
      </p>
    </div>
  )
}
