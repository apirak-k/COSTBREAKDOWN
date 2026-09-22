import React from 'react'
import { WhatIfResult } from '../../../core'
import { ScenarioCard } from './ScenarioCard'

interface SimulationGridProps {
  scenarios: WhatIfResult[]
  targetLabel: string
  targetPlaceholder: string
  isRouting?: boolean
  onUpdateScenario: (idx: number, field: string, val: string) => void
}

export const SimulationGrid: React.FC<SimulationGridProps> = ({
  scenarios,
  targetLabel,
  targetPlaceholder,
  isRouting,
  onUpdateScenario
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {scenarios.map((sim, idx) => (
        <ScenarioCard
          key={sim.letter}
          scenario={sim}
          targetLabel={targetLabel}
          targetPlaceholder={targetPlaceholder}
          isRouting={isRouting}
          onUpdate={(field, val) => onUpdateScenario(idx, field, val)}
        />
      ))}
    </div>
  )
}
