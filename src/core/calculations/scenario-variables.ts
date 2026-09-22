import { ScenarioValue, ScenarioVariableDefinition, WhatIfScenario } from '../types'

export const scenarioVariableDefinitions: ScenarioVariableDefinition[] = [
  {
    key: 'activeTotalCost',
    label: 'Active total cost',
    valueType: 'amount',
    unit: 'THB/pc',
    formula: 'Source value from the active cost breakdown'
  },
  {
    key: 'targetValue',
    label: 'Target driver input',
    valueType: 'driver-defined',
    unit: 'driver-defined',
    dependencies: ['activeDriver'],
    formula: 'User-provided scenario override'
  },
  {
    key: 'secondaryTargetValue',
    label: 'Secondary target input',
    valueType: 'driver-defined',
    unit: 'driver-defined',
    dependencies: ['targetValue'],
    formula: 'Optional user-provided scenario override'
  },
  {
    key: 'investment',
    label: 'Fixed investment',
    valueType: 'amount',
    unit: 'THB',
    formula: 'Scenario assumption'
  },
  {
    key: 'variableAddedCost',
    label: 'Variable added cost',
    valueType: 'amount',
    unit: 'THB/pc',
    formula: 'Scenario assumption'
  },
  {
    key: 'lotSize',
    label: 'Lot size',
    valueType: 'quantity',
    unit: 'pcs',
    formula: 'Scenario assumption'
  },
  {
    key: 'grossSaving',
    label: 'Gross saving',
    valueType: 'amount',
    unit: 'THB/pc',
    dependencies: ['activeTotalCost', 'targetValue'],
    formula: 'Active driver cost minus scenario driver cost'
  },
  {
    key: 'fixedAddedCostPerUnit',
    label: 'Fixed cost per unit',
    valueType: 'amount',
    unit: 'THB/pc',
    dependencies: ['investment', 'lotSize'],
    formula: 'investment / lotSize'
  },
  {
    key: 'variableAddedCostPerUnit',
    label: 'Variable cost per unit',
    valueType: 'amount',
    unit: 'THB/pc',
    dependencies: ['variableAddedCost'],
    formula: 'Scenario variable added cost'
  },
  {
    key: 'addedCost',
    label: 'Added cost',
    valueType: 'amount',
    unit: 'THB/pc',
    dependencies: ['fixedAddedCostPerUnit', 'variableAddedCostPerUnit'],
    formula: 'fixed cost per unit + variable cost per unit'
  },
  {
    key: 'netSaving',
    label: 'Net saving',
    valueType: 'amount',
    unit: 'THB/pc',
    dependencies: ['grossSaving', 'addedCost'],
    formula: 'gross saving - added cost'
  },
  {
    key: 'predictedTotal',
    label: 'Predicted total cost',
    valueType: 'amount',
    unit: 'THB/pc',
    dependencies: ['activeTotalCost', 'netSaving'],
    formula: 'active total cost - net saving'
  },
  {
    key: 'totalNetBenefit',
    label: 'Total net benefit',
    valueType: 'amount',
    unit: 'THB',
    dependencies: ['netSaving', 'lotSize'],
    formula: 'net saving * lot size'
  }
]

function parseOverride(value?: string): number | null {
  if (!value?.trim()) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function buildScenarioValues(
  scenario: WhatIfScenario,
  totalActiveCost: number,
  calculated: Record<string, number | null>
): ScenarioValue[] {
  const values: Record<string, number | string | null> = {
    activeTotalCost: totalActiveCost,
    targetValue: parseOverride(scenario.targetValue),
    secondaryTargetValue: parseOverride(scenario.secondaryTargetValue),
    investment: parseOverride(scenario.investment),
    variableAddedCost: parseOverride(scenario.variableAddedCost),
    lotSize: parseOverride(scenario.lotSize),
    ...calculated
  }

  return [
    ...scenarioVariableDefinitions.map(definition => ({
      ...definition,
      value: values[definition.key] ?? null,
      origin: definition.key === 'activeTotalCost' ? 'source' as const
        : ['targetValue', 'secondaryTargetValue', 'investment', 'variableAddedCost', 'lotSize'].includes(definition.key)
        ? 'override' as const
        : 'calculated' as const
    })),
    ...(scenario.additionalVariables ?? [])
  ]
}
