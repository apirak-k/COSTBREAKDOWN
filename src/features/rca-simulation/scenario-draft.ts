import { WhatIfScenario } from '../../core'

export function createScenarioDrafts(): WhatIfScenario[] {
  return [
    { letter: 'A', label: '', targetValue: '', investment: '', lotSize: '5000' },
    { letter: 'B', label: '', targetValue: '', investment: '', lotSize: '5000' },
    { letter: 'C', label: '', targetValue: '', investment: '', lotSize: '5000' }
  ]
}

export function updateScenarioDraft(
  scenarios: WhatIfScenario[],
  index: number,
  field: keyof WhatIfScenario,
  value: string
): WhatIfScenario[] {
  if (index < 0 || index >= scenarios.length) return scenarios

  return scenarios.map((scenario, scenarioIndex) => (
    scenarioIndex === index
      ? { ...scenario, [field]: value }
      : scenario
  ))
}
