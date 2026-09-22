import { WhatIfScenario } from '../../core'

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
