import { ScenarioBusinessInputs, ScenarioBusinessResult } from '../types'

function finiteValue(value: number | null, label: string, warnings: string[]): number | null {
  if (value === null) {
    warnings.push(`${label} is unavailable.`)
    return null
  }
  if (!Number.isFinite(value)) {
    warnings.push(`${label} must be a finite number.`)
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

/** Calculates only the finalized Selling Price, SG&A amount, and OP measures. */
export function calculateScenarioBusinessMetrics(
  inputs: ScenarioBusinessInputs,
  standardCostPerPiece: number | null
): ScenarioBusinessResult {
  const warnings: string[] = []
  const sellingPrice = finiteValue(inputs.sellingPrice, 'Selling Price', warnings)
  const sgaPercent = finiteValue(inputs.sgaPercent, 'SG&A %', warnings)
  const standardCost = finiteValue(standardCostPerPiece, 'Standard Cost', warnings)
  const sgaAmountPerPiece = sellingPrice !== null && sgaPercent !== null
    ? finiteResult(sellingPrice * (sgaPercent / 100), 'SG&A amount / pc', warnings)
    : null
  const operatingProfitPerPiece = sellingPrice !== null && standardCost !== null && sgaAmountPerPiece !== null
    ? finiteResult(sellingPrice - standardCost - sgaAmountPerPiece, 'OP / pc', warnings)
    : null

  return {
    sellingPrice,
    sgaPercent,
    sgaAmountPerPiece,
    operatingProfitPerPiece,
    warnings: [...new Set(warnings)]
  }
}
