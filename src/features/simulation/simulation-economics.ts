import { calculateScenarioBusinessMetrics } from '../../core/calculations/scenario-business'
import { isMasterDataNumericValueValid } from '../../core/utils/master-data-validation'
import {
  addExactDecimals,
  divideExactDecimals,
  exactDecimalToNumber,
  exactDecimalToString,
  compareExactDecimals,
  parseExactDecimal,
  subtractExactDecimals,
  type ExactDecimal
} from '../../core/utils/exact-decimal'
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
  breakEvenQuantity: number | null
  preciseBreakEvenQuantity: number | null
  breakEvenNotAchievable: boolean
  simulationStandardCost: number | null
  sgaPerPiece: number | null
  operatingProfitPerPiece: number | null
  exactValues?: Partial<Record<
    'fixedCostPerPiece' | 'requiredSavingPerPiece' | 'parameterSavingPerPiece' | 'economicMarginPerPiece'
    | 'preciseBreakEvenQuantity' | 'simulationStandardCost', string | null
  >>
  business: ScenarioBusinessResult
  warnings: string[]
}

export function createEconomicSimulationDraft(sourceSnapshot?: CostSnapshot): EconomicSimulationDraft {
  const sellingPrice = sourceSnapshot?.product.sellingPrice
  const sgaPercent = sourceSnapshot?.product.sgaPercent
  const exactSellingPrice = sourceSnapshot?.product.exactDecimalInputs?.sellingPrice
  const exactSGAPercent = sourceSnapshot?.product.exactDecimalInputs?.sgaPercent
  return {
    fixedActionCost: '',
    variableActionCostPerPiece: '',
    batchSize: '',
    sellingPriceOverride: sellingPrice != null && isMasterDataNumericValueValid('sellingPrice', sellingPrice)
      ? exactSellingPrice ?? String(sellingPrice)
      : '',
    sgaPercentOverride: sgaPercent != null && isMasterDataNumericValueValid('sgaPercent', sgaPercent)
      ? exactSGAPercent ?? String(sgaPercent)
      : ''
  }
}

export function isEconomicSimulationInputValid(field: EconomicSimulationField, raw: string): boolean {
  if (raw.trim() === '') return true
  const value = Number(raw)
  if (!Number.isFinite(value)) return false
  const normalized = raw.trim()
  const isInteger = field === 'batchSize'
  if (!(isInteger ? /^\d+$/.test(normalized) : /^\d+(?:\.\d*)?(?:[eE][+-]?\d+)?$/.test(normalized))) return false
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
        : `${label} must be zero or greater.`)
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
      : `${label} override must be zero or greater.`)
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

function exactDraftValue(raw: string, parsed: number | null): ExactDecimal | null {
  if (raw.trim()) return parseExactDecimal(raw)
  return parsed === null ? null : parseExactDecimal(parsed)
}

function calculatedNumber(value: ExactDecimal | null, label: string, warnings: string[]): number | null {
  if (!value) return null
  const result = exactDecimalToNumber(value)
  return result === null ? finiteResult(Number.NaN, label, warnings) : finiteResult(result, label, warnings)
}

function ceilPositiveRatio(numerator: ExactDecimal, denominator: ExactDecimal): bigint | null {
  if (numerator.coefficient < 0n || denominator.coefficient <= 0n) return null
  const scaledNumerator = numerator.coefficient * 10n ** BigInt(denominator.scale)
  const scaledDenominator = denominator.coefficient * 10n ** BigInt(numerator.scale)
  if (scaledDenominator === 0n) return null
  const wholeUnits = scaledNumerator / scaledDenominator
  return wholeUnits + (scaledNumerator % scaledDenominator === 0n ? 0n : 1n)
}

export function calculateEconomicSimulation(
  afterSnapshot: CostSnapshot,
  afterCost: SnapshotCost | null,
  parameterSavingPerPiece: number | null,
  draft: EconomicSimulationDraft,
  parameterSavingExact?: string | null
): EconomicSimulationResult {
  const warnings: string[] = []
  const fixedActionCost = parseInput(draft.fixedActionCost, 'fixedActionCost', 'Fixed Action Cost', warnings)
  const variableActionCostPerPiece = parseInput(draft.variableActionCostPerPiece, 'variableActionCostPerPiece', 'Variable Action Cost / pc', warnings)
  const batchSize = parseInput(draft.batchSize, 'batchSize', 'Batch Size', warnings)
  const exactFixedActionCost = exactDraftValue(draft.fixedActionCost, fixedActionCost)
  const exactVariableActionCost = exactDraftValue(draft.variableActionCostPerPiece, variableActionCostPerPiece)
  const exactBatchSize = exactDraftValue(draft.batchSize, batchSize)
  const exactFixedCostPerPiece = exactFixedActionCost && exactBatchSize && batchSize !== null && batchSize > 0
    ? divideExactDecimals(exactFixedActionCost, exactBatchSize)
    : null
  const fixedCostPerPiece = exactFixedActionCost !== null && exactBatchSize !== null && batchSize !== null && batchSize > 0
    ? calculatedNumber(exactFixedCostPerPiece, 'Fixed Cost / pc', warnings)
    : null
  const exactRequiredSavingPerPiece = exactFixedCostPerPiece && exactVariableActionCost
    ? addExactDecimals(exactFixedCostPerPiece, exactVariableActionCost)
    : null
  const requiredSavingPerPiece = fixedCostPerPiece !== null && variableActionCostPerPiece !== null
    ? calculatedNumber(exactRequiredSavingPerPiece, 'Required Saving / pc', warnings)
    : null
  const exactParameterSaving = parameterSavingPerPiece !== null && Number.isFinite(parameterSavingPerPiece)
    ? (parameterSavingExact?.trim() ? parseExactDecimal(parameterSavingExact) : parseExactDecimal(parameterSavingPerPiece))
    : null
  const parameterSaving = exactParameterSaving ? exactDecimalToNumber(exactParameterSaving) : null
  if (parameterSavingPerPiece !== null && parameterSaving === null) {
    warnings.push('Parameter Saving / pc must be a finite number.')
  }
  const exactEconomicMargin = exactParameterSaving && exactRequiredSavingPerPiece
    ? subtractExactDecimals(exactParameterSaving, exactRequiredSavingPerPiece)
    : null
  const economicMarginPerPiece = parameterSaving !== null && requiredSavingPerPiece !== null
    ? calculatedNumber(exactEconomicMargin, 'Economic Margin / pc', warnings)
    : null
  const exactNetSaving = exactParameterSaving && exactVariableActionCost
    ? subtractExactDecimals(exactParameterSaving, exactVariableActionCost)
    : null
  const netSavingPerPiece = parameterSaving !== null && variableActionCostPerPiece !== null
    ? calculatedNumber(exactNetSaving, 'Net Saving / pc', warnings)
    : null
  let preciseBreakEvenQuantity: number | null = null
  let exactPreciseBreakEvenQuantity: ExactDecimal | null = null
  let breakEvenQuantity: number | null = null
  let breakEvenNotAchievable = false
  if (fixedActionCost !== null && netSavingPerPiece !== null) {
    if (!exactNetSaving || compareExactDecimals(exactNetSaving, parseExactDecimal(0)!) <= 0) {
      breakEvenNotAchievable = true
    } else {
      exactPreciseBreakEvenQuantity = exactFixedActionCost && exactNetSaving
        ? divideExactDecimals(exactFixedActionCost, exactNetSaving)
        : null
      preciseBreakEvenQuantity = calculatedNumber(exactPreciseBreakEvenQuantity, 'Break-even Quantity', warnings)
      if (preciseBreakEvenQuantity !== null && exactFixedActionCost && exactNetSaving) {
        const roundedQuantityExact = ceilPositiveRatio(exactFixedActionCost, exactNetSaving)
        const roundedQuantity = roundedQuantityExact === null ? null : Number(roundedQuantityExact)
        if (roundedQuantityExact !== null && roundedQuantity !== null
          && Number.isSafeInteger(roundedQuantity) && BigInt(roundedQuantity) === roundedQuantityExact) {
          breakEvenQuantity = roundedQuantity === 0 ? 0 : roundedQuantity
        }
        else {
          preciseBreakEvenQuantity = null
          warnings.push('Break-even Quantity exceeds the supported whole-quantity range.')
        }
      }
    }
  }

  const sellingPrice = parseOverride(
    draft.sellingPriceOverride,
    afterSnapshot.product.sellingPrice,
    'sellingPriceOverride',
    'Selling Price',
    warnings
  )
  const sgaPercent = parseOverride(
    draft.sgaPercentOverride,
    afterSnapshot.product.sgaPercent,
    'sgaPercentOverride',
    'SG&A %',
    warnings
  )
  const rawStandardCost = afterCost?.total ?? null
  const simulationStandardCost = rawStandardCost === null || Number.isFinite(rawStandardCost)
    ? rawStandardCost
    : null
  if (rawStandardCost !== null && simulationStandardCost === null) {
    warnings.push('SIM Standard Cost must be a finite number.')
  }
  const exactSellingPrice = draft.sellingPriceOverride.trim()
    ? draft.sellingPriceOverride
    : afterSnapshot.product.exactDecimalInputs?.sellingPrice
  const exactSGAPercent = draft.sgaPercentOverride.trim()
    ? draft.sgaPercentOverride
    : afterSnapshot.product.exactDecimalInputs?.sgaPercent
  const exactStandardCost = rawStandardCost === null ? undefined : afterCost?.exactValues?.total ?? String(rawStandardCost)
  const business = calculateScenarioBusinessMetrics({ sellingPrice, sgaPercent }, simulationStandardCost, {
    sellingPrice: exactSellingPrice,
    sgaPercent: exactSGAPercent,
    standardCost: exactStandardCost
  })

  return {
    fixedActionCost,
    variableActionCostPerPiece,
    batchSize,
    fixedCostPerPiece,
    requiredSavingPerPiece,
    parameterSavingPerPiece: parameterSaving,
    economicMarginPerPiece,
    breakEvenQuantity,
    preciseBreakEvenQuantity,
    breakEvenNotAchievable,
    simulationStandardCost,
    sgaPerPiece: business.sgaAmountPerPiece,
    operatingProfitPerPiece: business.operatingProfitPerPiece,
    exactValues: {
      fixedCostPerPiece: exactFixedCostPerPiece ? exactDecimalToString(exactFixedCostPerPiece) : null,
      requiredSavingPerPiece: exactRequiredSavingPerPiece ? exactDecimalToString(exactRequiredSavingPerPiece) : null,
      parameterSavingPerPiece: exactParameterSaving ? exactDecimalToString(exactParameterSaving) : null,
      economicMarginPerPiece: exactEconomicMargin ? exactDecimalToString(exactEconomicMargin) : null,
      preciseBreakEvenQuantity: preciseBreakEvenQuantity === null ? null : exactPreciseBreakEvenQuantity ? exactDecimalToString(exactPreciseBreakEvenQuantity) : null,
      simulationStandardCost: exactStandardCost ?? null
    },
    business,
    warnings: [...new Set([...warnings, ...business.warnings])]
  }
}
