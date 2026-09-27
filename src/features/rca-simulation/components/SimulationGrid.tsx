import React from 'react'
import type { ScenarioCostResult } from '../../../core'
import type { ScenarioDraftForm } from '../scenario-draft'
import type { ScenarioInputDefinition } from '../scenario-inputs'
import { ScenarioCard } from './ScenarioCard'

interface SimulationGridProps {
  scenarios: ScenarioDraftForm[]
  inputDefinitions: ScenarioInputDefinition[]
  results: ScenarioCostResult[]
  inputWarningsByLetter: Record<'A' | 'B' | 'C', string[]>
  onUpdateLabel: (letter: 'A' | 'B' | 'C', label: string) => void
  onUpdateInput: (letter: 'A' | 'B' | 'C', inputKey: string, value: string) => void
}

function unavailableResult(scenario: ScenarioDraftForm): ScenarioCostResult {
  const missingCost = {
    snapshotId: 'unavailable',
    material: null,
    labor: null,
    burden: null,
    total: null,
    status: 'missing' as const,
    warnings: ['No calculation result was returned for this scenario.']
  }

  return {
    letter: scenario.letter,
    label: scenario.label,
    currentCost: missingCost,
    scenarioCost: missingCost,
    overrideWarnings: []
  }
}

export const SimulationGrid: React.FC<SimulationGridProps> = ({
  scenarios,
  inputDefinitions,
  results,
  inputWarningsByLetter,
  onUpdateLabel,
  onUpdateInput
}) => (
  <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Scenario comparison">
    {scenarios.map(scenario => {
      const result = results.find(item => item.letter === scenario.letter) ?? unavailableResult(scenario)

      return (
        <ScenarioCard
          key={scenario.letter}
          scenario={scenario}
          inputDefinitions={inputDefinitions}
          result={result}
          inputWarnings={inputWarningsByLetter[scenario.letter] ?? []}
          onUpdateLabel={label => onUpdateLabel(scenario.letter, label)}
          onUpdateInput={(inputKey, value) => onUpdateInput(scenario.letter, inputKey, value)}
        />
      )
    })}
  </section>
)
