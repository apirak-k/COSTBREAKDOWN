import { CostSnapshot } from '../../core/types/snapshot.types'
import { PrioritizationCandidate } from '../../core/calculations/material-candidates'

export type ScenarioInputDefinition = (
  | { sourceType: 'bom'; sourceId: string; field: 'price' | 'loss' | 'consumption' }
  | { sourceType: 'routing'; sourceId: string; field: 'manning' | 'capacity' | 'yield' }
  | { sourceType: 'rate'; sourceId: string; field: 'laborRate' | 'burdenRate' }
) & {
  key: string
  label: string
  unit: string
  currentValue: number | null
  displayScale: number
}

function normalizeCode(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? ''
}

function inputDefinition(
  sourceType: ScenarioInputDefinition['sourceType'],
  sourceId: string,
  field: ScenarioInputDefinition['field'],
  label: string,
  unit: string,
  currentValue: number | null,
  displayScale: number
): ScenarioInputDefinition {
  return {
    key: JSON.stringify([sourceType, sourceId, field]),
    sourceType,
    sourceId,
    field,
    label,
    unit,
    currentValue,
    displayScale
  } as ScenarioInputDefinition
}

function getBOMInputs(
  candidate: PrioritizationCandidate,
  current: CostSnapshot
): ScenarioInputDefinition[] {
  const item = current.bom.find(row => row.id === candidate.sourceId)
  if (!item || current.bom.filter(row => row.id === candidate.sourceId).length !== 1) return []

  const materialName = item.description || item.itemCode || item.id
  const unit = item.unit.trim() || 'unit'
  return [
    inputDefinition('bom', item.id, 'price', `${materialName} — Price`, `THB/${unit}`, item.price, 1),
    inputDefinition('bom', item.id, 'loss', `${materialName} — Loss`, '%', item.loss, 100),
    inputDefinition('bom', item.id, 'consumption', `${materialName} — Usage`, `${unit}/pc`, item.consumption, 1)
  ]
}

function getWorkCenterInputs(
  candidate: PrioritizationCandidate,
  current: CostSnapshot
): ScenarioInputDefinition[] {
  const candidateRates = current.rates.filter(rate => rate.id === candidate.sourceId)
  if (candidateRates.length !== 1) return []

  const rate = candidateRates[0]
  const centerCode = normalizeCode(rate?.workCenterCode)
  if (!rate || !centerCode) return []

  const ratesForCenter = current.rates.filter(item => normalizeCode(item.workCenterCode) === centerCode)
  const inputs: ScenarioInputDefinition[] = []
  if (ratesForCenter.length === 1) {
    inputs.push(
      inputDefinition('rate', rate.id, 'laborRate', `${rate.workCenterCode} — Labor rate`, 'THB/MHr', rate.laborRate, 1),
      inputDefinition('rate', rate.id, 'burdenRate', `${rate.workCenterCode} — Burden rate`, 'THB/MHr', rate.burdenRate, 1)
    )
  }

  const matchingSteps = current.routing.filter(step =>
    step.isGeneratedSizingPlaceholder !== true && normalizeCode(step.workCenterId) === centerCode
  )
  const seenStepIds = new Set<string>()
  matchingSteps.forEach(step => {
    if (!step.id || seenStepIds.has(step.id) || matchingSteps.filter(item => item.id === step.id).length !== 1) return
    seenStepIds.add(step.id)
    const operationName = step.processName || step.processCode || step.operationCode || step.id
    inputs.push(
      inputDefinition('routing', step.id, 'manning', `${operationName} — Manning`, 'people', step.manning, 1),
      inputDefinition('routing', step.id, 'capacity', `${operationName} — Capacity`, 'pcs/hr', step.capacity, 1),
      inputDefinition('routing', step.id, 'yield', `${operationName} — Yield`, '%', step.yield, 100)
    )
  })

  return inputs
}

/** Exposes only numeric inputs on records already present in Current for the selected candidate. */
export function getScenarioInputDefinitions(
  candidate: PrioritizationCandidate,
  currentSnapshot: CostSnapshot
): ScenarioInputDefinition[] {
  if (candidate.sourceType === 'bom') return getBOMInputs(candidate, currentSnapshot)
  return getWorkCenterInputs(candidate, currentSnapshot)
}
