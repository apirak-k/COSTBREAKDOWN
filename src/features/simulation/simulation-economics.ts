import { calculateScenarioBusinessMetrics } from '../../core/calculations/scenario-business'
import { isMasterDataNumericValueValid } from '../../core/utils/master-data-validation'
import type { CostSnapshot, ScenarioBusinessResult, SnapshotCost } from '../../core/types'

export interface EconomicSimulationDraft {
  fixedActionCost: string
  variableActionCostPerPiece: string
  batchSize: string
  sellingPriceOverride: string
  sgaPercentOverride: string
}

export type EconomicSimulationField = keyof EconomicSimulationDraft

export interface EconomicSimulationResult {
  fixedActionCost: number | null
  variableActionCostPerPiece: number | null
  batchSize: number | null
  fixedCostPerPiece: number | null
  requiredSavingPerPiece: number | null
  parameterSavingPerPiece: number | null
  economicMarginPerPiece: number | null
  simulationStandardCost: number | null
  sgaPerPiece: number | null
  operatingProfitPerPiece: number | null
  business: ScenarioBusinessResult
  warnings: string[]
}

export function createEconomicSimulationDraft(): EconomicSimulationDraft {
  return { fixedActionCost: '', variableActionCostPerPiece: '', batchSize: '', sellingPriceOverride: '', sgaPercentOverride: '' }
}

export function isEconomicSimulationInputValid(field: EconomicSimulationField, raw: string): boolean {
  if (raw.trim() === '') return true
  const value = Number(raw)
  if (!Number.isFinite(value)) return false
  const normalized = raw.trim()
  const isInteger = field === 'batchSize'
  if (!(isInteger ? /^\d+$/.test(normalized) : /^\d+(?:\.\d{1,2})?$/.test(normalized))) return false
  if (field === 'batchSize') return value > 0 && Number.isInteger(value)
  if (field === 'sgaPercentOverride') return isMasterDataNumericValueValid('sgaPercent', value)
  if (field === 'sellingPriceOverride') return isMasterDataNumericValueValid('sellingPrice', value)
  return value >= 0
}

export function updateEconomicSimulationDraft(
  draft: EconomicSimulationDraft,
  field: EconomicSimulationField,
  value: string
): EconomicSimulationDraft {
  if (!isEconomicSimulationInputValid(field, value) || draft[field] === value) return draft
  return { ...draft, [field]: value }
}

function parseInput(
  raw: string,
  field: EconomicSimulationField,
  label: string,
  warnings: string[]
): number | null {
  if (!raw.trim()) return null
  const value = Number(raw)
  if (!Number.isFinite(value)) {
    warnings.push(`${label} must be a finite number.`)
    return null
  }
  if (!isEconomicSimulationInputValid(field, raw)) {
    warnings.push(field === 'batchSize'
      ? `${label} must be a positive whole number.`
      : field === 'sgaPercentOverride'
        ? `${label} must be between 0% and 100%.`
        : `${label} must be zero or greater and use at most two decimal places.`)
    return null
  }
  return value
}

function parseOverride(
  raw: string,
  currentValue: number | null | undefined,
  field: 'sellingPriceOverride' | 'sgaPercentOverride',
  label: string,
  warnings: string[]
): number | null {
  if (!raw.trim()) return currentValue ?? null
  const value = Number(raw)
  if (!Number.isFinite(value)) {
    warnings.push(`${label} override must be a finite number.`)
    return null
  }
  if (!isEconomicSimulationInputValid(field, raw)) {
    warnings.push(field === 'sgaPercentOverride'
      ? `${label} override must be between 0% and 100%.`
      : `${label} override must be zero or greater and use at most two decimal places.`)
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
  const fixedActionCost = parseInput(draft.fixedActionCost, 'fixedActionCost', 'Fixed Action Cost', warnings)
  const variableActionCostPerPiece = parseInput(draft.variableActionCostPerPiece, 'variableActionCostPerPiece', 'Variable Action Cost / pc', warnings)
  const batchSize = parseInput(draft.batchSize, 'batchSize', 'Batch Size', warnings)
  const fixedCostPerPiece = fixedActionCost !== null && batchSize !== null && batchSize > 0
    ? finiteResult(fixedActionCost / batchSize, 'Fixed Cost / pc', warnings)
    : null
  const requiredSavingPerPiece = fixedCostPerPiece !== null && variableActionCostPerPiece !== null
    ? finiteResult(fixedCostPerPiece + variableActionCostPerPiece, 'Required Saving / pc', warnings)
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
    'sellingPriceOverride',
    'Selling Price',
    warnings
  )
  const sgaPercent = parseOverride(
    draft.sgaPercentOverride,
    currentSnapshot.product.sgaPercent,
    'sgaPercentOverride',
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
    fixedActionCost,
    variableActionCostPerPiece,
    batchSize,
    fixedCostPerPiece,
    requiredSavingPerPiece,
    parameterSavingPerPiece: parameterSaving,
    economicMarginPerPiece,
    simulationStandardCost,
    sgaPerPiece: business.sgaAmountPerPiece,
    operatingProfitPerPiece: business.operatingProfitPerPiece,
    business,
    warnings: [...new Set([...warnings, ...business.warnings])]
  }
}
