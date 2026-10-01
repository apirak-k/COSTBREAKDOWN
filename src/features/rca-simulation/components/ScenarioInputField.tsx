import React from 'react'
import type { ScenarioInputDefinition } from '../scenario-inputs'

interface ScenarioInputFieldProps {
  definition: ScenarioInputDefinition
  scenarioLetter: 'A' | 'B' | 'C'
  value: string | undefined
  onChange: (inputKey: string, value: string) => void
}

export const ScenarioInputField: React.FC<ScenarioInputFieldProps> = ({
  definition,
  scenarioLetter,
  value,
  onChange
}) => {
  const safeKey = definition.key.replace(/[^a-zA-Z0-9_-]/g, '-')
  const inputId = `scenario-${scenarioLetter}-input-${safeKey}`
  const helperId = `scenario-${scenarioLetter}-input-guidance`

  return (
    <div className="min-w-0">
      <label htmlFor={inputId} className="mb-1.5 block min-h-5 text-sm font-medium leading-5 text-slate-800">
        {definition.label}
      </label>
      <div className="flex items-center gap-2">
        <input
          id={inputId}
          type="number"
          step="any"
          inputMode="decimal"
          value={value ?? ''}
          onChange={event => onChange(definition.key, event.target.value)}
          aria-describedby={helperId}
          className="min-h-11 min-w-0 flex-1 rounded-sm border border-slate-400 bg-white px-3 py-2 font-mono text-sm tabular-nums text-slate-900 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
        {definition.unit && (
          <span className="shrink-0 text-xs text-slate-600" aria-hidden="true">
            {definition.unit}
          </span>
        )}
      </div>
    </div>
  )
}
