import { ScenarioBusinessInputs, ScenarioBusinessResult } from '../types'
import { isMasterDataNumericValueValid } from '../utils/master-data-validation'
import {
  divideExactDecimals,
  exactDecimalInputValue,
  exactDecimalToNumber,
  exactDecimalToString,
  multiplyExactDecimals,
  parseExactDecimal,
  subtractExactDecimals
} from '../utils/exact-decimal'

function finiteValue(value: number | null, label: string, warnings: string[]): number | null {
  if (value == null) {
    warnings.push(`${label} is unavailable.`)
    return null
  }
  if (!Number.isFinite(value)) {
    warnings.push(`${label} must be a finite number.`)
    return null
  }
  return value
}

function storedValue(
  value: number | null,
  field: 'sellingPrice' | 'sgaPercent',
  label: string,
  warnings: string[]
): number | null {
  if (value == null) {
    warnings.push(`${label} is unavailable.`)
    return null
  }
  if (!isMasterDataNumericValueValid(field, value)) {
    warnings.push(`${label} is invalid.`)
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
  standardCostPerPiece: number | null,
  exactInputs: { sellingPrice?: string; sgaPercent?: string; standardCost?: string } = {}
): ScenarioBusinessResult {
  const warnings: string[] = []
  const sellingPrice = storedValue(inputs.sellingPrice, 'sellingPrice', 'Selling Price', warnings)
  const sgaPercent = storedValue(inputs.sgaPercent, 'sgaPercent', 'SG&A %', warnings)
  const standardCost = finiteValue(standardCostPerPiece, 'Standard Cost', warnings)
  const exactSellingPrice = exactDecimalInputValue(sellingPrice, exactInputs.sellingPrice)
  const exactSGAPercent = exactDecimalInputValue(sgaPercent, exactInputs.sgaPercent)
  const exactStandardCost = standardCost === null
    ? null
    : exactInputs.standardCost?.trim()
      ? parseExactDecimal(exactInputs.standardCost)
      : parseExactDecimal(standardCost)
  const exactSGAAmount = exactSellingPrice && exactSGAPercent
    ? multiplyExactDecimals(
      exactSellingPrice,
      divideExactDecimals(exactSGAPercent, parseExactDecimal(100)!)!
    )
    : null
  const sgaAmountValue = exactSGAAmount ? exactDecimalToNumber(exactSGAAmount) : null
  const sgaAmountPerPiece = sellingPrice !== null && sgaPercent !== null
    ? sgaAmountValue === null
      ? (warnings.push('SG&A amount / pc could not be calculated as a finite value.'), null)
      : finiteResult(sgaAmountValue, 'SG&A amount / pc', warnings)
    : null
  const exactOperatingProfit = exactSellingPrice && exactStandardCost && exactSGAAmount
    ? subtractExactDecimals(subtractExactDecimals(exactSellingPrice, exactStandardCost), exactSGAAmount)
    : null
  const operatingProfitValue = exactOperatingProfit ? exactDecimalToNumber(exactOperatingProfit) : null
  const operatingProfitPerPiece = sellingPrice !== null && standardCost !== null && sgaAmountPerPiece !== null
    ? operatingProfitValue === null
      ? (warnings.push('OP / pc could not be calculated as a finite value.'), null)
      : finiteResult(operatingProfitValue, 'OP / pc', warnings)
    : null

  return {
    sellingPrice,
    sgaPercent,
    sgaAmountPerPiece,
    operatingProfitPerPiece,
    exactValues: {
      sgaAmountPerPiece: exactSGAAmount ? exactDecimalToString(exactSGAAmount) : null,
      operatingProfitPerPiece: exactOperatingProfit ? exactDecimalToString(exactOperatingProfit) : null
    },
    warnings: [...new Set(warnings)]
  }
}
