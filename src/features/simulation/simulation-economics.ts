import { calculateScenarioBusinessMetrics } from '../../core/calculations/scenario-business'
import type { CostSnapshot, ScenarioBusinessResult, SnapshotCost } from '../../core/types'

export interface EconomicSimulationDraft {
  actionCost: string
  evaluationQuantity: string
  sellingPriceOverride: string
  sgaPercentOverride: string
}

export type EconomicSimulationField = keyof EconomicSimulationDraft

export interface EconomicSimulationResult {
  actionCost: number | null
  evaluationQuantity: number | null
  requiredSavingPerPiece: number | null
  parameterSavingPerPiece: number | null
  economicMarginPerPiece: number | null
  simulationStandardCost: number | null
  business: ScenarioBusinessResult
  warnings: string[]
}

export function createEconomicSimulationDraft(): EconomicSimulationDraft {
  return { actionCost: '', evaluationQuantity: '', sellingPriceOverride: '', sgaPercentOverride: '' }
}

export function updateEconomicSimulationDraft(
  draft: EconomicSimulationDraft,
  field: EconomicSimulationField,
  value: string
): EconomicSimulationDraft {
  return draft[field] === value ? draft : { ...draft, [field]: value }
}

function parseInput(raw: string, label: string, warnings: string[]): number | null {
  if (!raw.trim()) return null
  const value = Number(raw)
  if (!Number.isFinite(value)) {
    warnings.push(`${label} must be a finite number.`)
    return null
  }
  return value
}

function parseOverride(raw: string, currentValue: number | null | undefined, label: string, warnings: string[]): number | null {
  if (!raw.trim()) return currentValue ?? null
  const value = Number(raw)
  if (!Number.isFinite(value)) {
    warnings.push(`${label} override must be a finite number.`)
    return null
  }
  return value
}

function finiteResult(value: number, label: string, warnings: string[]): number | null {
  if (!Number.isFinite(value)) {
    warnings.push(`${label} could not be calculated as a finite value.`)
    return null
  }
  return value
}

export function calculateEconomicSimulation(
  currentSnapshot: CostSnapshot,
  simulationCost: SnapshotCost | null,
  parameterSavingPerPiece: number | null,
  draft: EconomicSimulationDraft
): EconomicSimulationResult {
  const warnings: string[] = []
  const actionCost = parseInput(draft.actionCost, 'Action Cost', warnings)
  const evaluationQuantity = parseInput(draft.evaluationQuantity, 'Evaluation Quantity', warnings)
  const validQuantity = evaluationQuantity !== null && evaluationQuantity > 0

  if (evaluationQuantity !== null && !validQuantity) {
    warnings.push('Evaluation Quantity must be greater than zero for division.')
  }

  const requiredSavingPerPiece = actionCost !== null && validQuantity
    ? finiteResult(actionCost / evaluationQuantity, 'Required Saving / pc', warnings)
    : null
  const parameterSaving = parameterSavingPerPiece !== null && Number.isFinite(parameterSavingPerPiece)
    ? parameterSavingPerPiece
    : null
  if (parameterSavingPerPiece !== null && parameterSaving === null) {
    warnings.push('Parameter Saving / pc must be a finite number.')
  }
  const economicMarginPerPiece = parameterSaving !== null && requiredSavingPerPiece !== null
    ? finiteResult(parameterSaving - requiredSavingPerPiece, 'Economic Margin / pc', warnings)
    : null

  const sellingPrice = parseOverride(
    draft.sellingPriceOverride,
    currentSnapshot.product.sellingPrice,
    'Selling Price',
    warnings
  )
  const sgaPercent = parseOverride(
    draft.sgaPercentOverride,
    currentSnapshot.product.sgaPercent,
    'SG&A %',
    warnings
  )
  const rawStandardCost = simulationCost?.total ?? null
  const simulationStandardCost = rawStandardCost === null || Number.isFinite(rawStandardCost)
    ? rawStandardCost
    : null
  if (rawStandardCost !== null && simulationStandardCost === null) {
    warnings.push('SIM Standard Cost must be a finite number.')
  }
  const business = calculateScenarioBusinessMetrics({ sellingPrice, sgaPercent }, simulationStandardCost)

  return {
    actionCost,
    evaluationQuantity,
    requiredSavingPerPiece,
    parameterSavingPerPiece: parameterSaving,
    economicMarginPerPiece,
    simulationStandardCost,
    business,
    warnings: [...new Set([...warnings, ...business.warnings])]
  }
}
