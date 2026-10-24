import { areNumericValuesEquivalent, safeAdd, safeMultiply } from '../utils/guards'
import {
  addExactDecimals,
  compareExactDecimals,
  divideExactDecimals,
  exactDecimalInputValue,
  exactDecimalToNumber,
  multiplyExactDecimals,
  parseExactDecimal,
  subtractExactDecimals,
  type ExactDecimal
} from '../utils/exact-decimal'

export interface BOMParameterCostEffectInput {
  usage: number | null
  price: number | null
  loss: number | null
  exactInputs?: Partial<Record<'usage' | 'price' | 'loss', string>>
}

export interface BOMParameterCostEffects {
  usage: number
  price: number
  loss: number
}

export interface RoutingParameterCostEffectInput {
  manning: number | null
  capacity: number | null
  yield: number | null
  laborRate: number | null
  burdenRate: number | null
  exactInputs?: Partial<Record<'manning' | 'capacity' | 'yield' | 'laborRate' | 'burdenRate', string>>
}

export interface RoutingCostEffects {
  manning: number
  capacity: number
  yield: number
  laborRate: number
  burdenRate: number
}

export interface RoutingParameterCostEffects {
  labor: RoutingCostEffects
  burden: RoutingCostEffects
  conversion: RoutingCostEffects
}

export type ParameterCostEffectResult<T> =
  | { status: 'available'; effects: T }
  | { status: 'unavailable' }

type ValidBOMParameterCostEffectInput = {
  usage: number
  price: number
  loss: number
  exactInputs?: BOMParameterCostEffectInput['exactInputs']
}

type ValidRoutingParameterCostEffectInput = {
  manning: number
  capacity: number
  yield: number
  laborRate: number
  burdenRate: number
  exactInputs?: RoutingParameterCostEffectInput['exactInputs']
}

const UNAVAILABLE: ParameterCostEffectResult<never> = { status: 'unavailable' }

function isPositiveFinite(value: number | null): value is number {
  return value !== null && Number.isFinite(value) && value > 0
}

function hasBOMInputs(input: BOMParameterCostEffectInput): input is ValidBOMParameterCostEffectInput {
  return input.usage !== null && Number.isFinite(input.usage)
    && input.price !== null && Number.isFinite(input.price)
    && input.loss !== null && Number.isFinite(input.loss)
}

function hasRoutingInputs(input: RoutingParameterCostEffectInput): input is ValidRoutingParameterCostEffectInput {
  return input.manning !== null && Number.isFinite(input.manning)
    && input.capacity !== null && Number.isFinite(input.capacity)
    && input.yield !== null && Number.isFinite(input.yield)
    && input.laborRate !== null && Number.isFinite(input.laborRate)
    && input.burdenRate !== null && Number.isFinite(input.burdenRate)
}

function logarithmicRatio(
  reference: number,
  current: number,
  referenceExact?: ExactDecimal | null,
  currentExact?: ExactDecimal | null
): number | null {
  if (!isPositiveFinite(reference) || !isPositiveFinite(current)) return null
  const exactReference = referenceExact ?? parseExactDecimal(reference)
  const exactCurrent = currentExact ?? parseExactDecimal(current)
  if (exactReference && exactCurrent && compareExactDecimals(exactReference, exactCurrent) === 0) return 0
  if (reference === current && (!exactReference || !exactCurrent)) return 0

  const relativeExact = exactReference && exactCurrent
    ? divideExactDecimals(subtractExactDecimals(exactCurrent, exactReference), exactReference)
    : null
  const relativeDifference = relativeExact ? exactDecimalToNumber(relativeExact) : (current - reference) / reference
  if (relativeDifference === null) return null
  const result = Number.isFinite(relativeDifference) && relativeDifference > -1
    ? Math.log1p(relativeDifference)
    : Math.log(current) - Math.log(reference)
  return Number.isFinite(result) ? result : null
}

function logarithmicMean(
  reference: number,
  current: number,
  referenceExact?: ExactDecimal | null,
  currentExact?: ExactDecimal | null
): number | null {
  if (!isPositiveFinite(reference) || !isPositiveFinite(current)) return null
  const exactReference = referenceExact ?? parseExactDecimal(reference)
  const exactCurrent = currentExact ?? parseExactDecimal(current)
  if (exactReference && exactCurrent && compareExactDecimals(exactReference, exactCurrent) === 0) return reference
  if (reference === current && (!exactReference || !exactCurrent)) return reference

  const logDifference = logarithmicRatio(reference, current, exactReference, exactCurrent)
  const exactDifference = exactReference && exactCurrent ? subtractExactDecimals(exactCurrent, exactReference) : null
  const costDifference = exactDifference ? exactDecimalToNumber(exactDifference) : current - reference
  if (logDifference === null || logDifference === 0 || costDifference === null || !Number.isFinite(costDifference)) return null

  const result = costDifference / logDifference
  return Number.isFinite(result) && result > 0 ? result : null
}

function lmdiEffect(
  logMean: number,
  referenceFactor: number,
  currentFactor: number,
  exponent = 1,
  referenceExact?: ExactDecimal | null,
  currentExact?: ExactDecimal | null
): number | null {
  if (!isPositiveFinite(referenceFactor) || !isPositiveFinite(currentFactor)) return null
  if (referenceExact && currentExact
    ? compareExactDecimals(referenceExact, currentExact) === 0
    : areNumericValuesEquivalent(referenceFactor, currentFactor)) return 0
  const logRatio = logarithmicRatio(referenceFactor, currentFactor, referenceExact, currentExact)
  if (logRatio === null) return null
  const result = safeMultiply(logMean, exponent, logRatio)
  return result !== null && Number.isFinite(result) ? result : null
}

function exactInput(
  input: Record<string, unknown> & { exactInputs?: Record<string, string> },
  field: string,
  percentEntry = false
): ExactDecimal | null {
  const value = input[field]
  return typeof value === 'number'
    ? exactDecimalInputValue(value, input.exactInputs?.[field], percentEntry)
    : null
}

function inputsEqual(
  left: Record<string, unknown> & { exactInputs?: Record<string, string> },
  right: Record<string, unknown> & { exactInputs?: Record<string, string> },
  field: string,
  percentEntry = false
): boolean {
  const exactLeft = exactInput(left, field, percentEntry)
  const exactRight = exactInput(right, field, percentEntry)
  if (exactLeft && exactRight) return compareExactDecimals(exactLeft, exactRight) === 0
  return areNumericValuesEquivalent(left[field] as number | null, right[field] as number | null)
}

function reconcileLastEffect<T extends object>(
  effects: T,
  orderedKeys: readonly (keyof T)[],
  changedKeys: readonly (keyof T)[],
  targetGap: number
): T | null {
  const reconciliationKey = [...orderedKeys].reverse().find(key => changedKeys.includes(key))
  if (reconciliationKey === undefined) {
    let total = 0
    for (const key of orderedKeys) {
      const value = effects[key]
      if (typeof value !== 'number' || !Number.isFinite(value)) return null
      const next = safeAdd(total, value)
      if (next === null) return null
      total = next
    }
    return total === targetGap ? effects : null
  }

  let precedingEffects = 0
  for (const key of orderedKeys) {
    if (key === reconciliationKey) continue
    const value = effects[key]
    if (typeof value !== 'number' || !Number.isFinite(value)) return null
    const next = safeAdd(precedingEffects, value)
    if (next === null) return null
    precedingEffects = next
  }

  const reconciledLastEffect = safeAdd(targetGap, -precedingEffects)
  if (reconciledLastEffect === null) return null
  return { ...effects, [reconciliationKey]: reconciledLastEffect } as T
}

/** Uses additive LMDI to split a matched BOM cost change across usage, price, and (1 + loss). */
export function calculateBOMParameterCostEffects(
  reference: BOMParameterCostEffectInput,
  current: BOMParameterCostEffectInput
): ParameterCostEffectResult<BOMParameterCostEffects> {
  if (!hasBOMInputs(reference) || !hasBOMInputs(current)) return UNAVAILABLE

  if (!isPositiveFinite(reference.usage) || !isPositiveFinite(reference.price)
    || !isPositiveFinite(current.usage) || !isPositiveFinite(current.price)
    || reference.loss < 0 || reference.loss > 1
    || current.loss < 0 || current.loss > 1) return UNAVAILABLE

  const referenceUsage = exactInput(reference, 'usage')
  const currentUsage = exactInput(current, 'usage')
  const referencePrice = exactInput(reference, 'price')
  const currentPrice = exactInput(current, 'price')
  const referenceLoss = exactInput(reference, 'loss', true)
  const currentLoss = exactInput(current, 'loss', true)
  if (!referenceUsage || !currentUsage || !referencePrice || !currentPrice || !referenceLoss || !currentLoss) return UNAVAILABLE
  const one = parseExactDecimal(1)!
  const referenceLossFactorExact = addExactDecimals(one, referenceLoss)
  const currentLossFactorExact = addExactDecimals(one, currentLoss)
  const referenceLossFactor = exactDecimalToNumber(referenceLossFactorExact)
  const currentLossFactor = exactDecimalToNumber(currentLossFactorExact)
  if (referenceLossFactor === null || currentLossFactor === null
    || !isPositiveFinite(referenceLossFactor) || !isPositiveFinite(currentLossFactor)) return UNAVAILABLE

  const referenceCostExact = multiplyExactDecimals(referenceUsage, referencePrice, referenceLossFactorExact)
  const currentCostExact = multiplyExactDecimals(currentUsage, currentPrice, currentLossFactorExact)
  const referenceCost = exactDecimalToNumber(referenceCostExact)
  const currentCost = exactDecimalToNumber(currentCostExact)
  if (referenceCost === null || currentCost === null) return UNAVAILABLE

  const changedKeys = (['usage', 'price', 'loss'] as const)
    .filter(key => !inputsEqual(reference, current, key, key === 'loss'))
  if (changedKeys.length === 0) {
    return compareExactDecimals(referenceCostExact, currentCostExact) === 0
      ? { status: 'available', effects: { usage: 0, price: 0, loss: 0 } }
      : UNAVAILABLE
  }

  const logMean = logarithmicMean(referenceCost, currentCost, referenceCostExact, currentCostExact)
  const targetGap = exactDecimalToNumber(subtractExactDecimals(currentCostExact, referenceCostExact))
  if (logMean === null || targetGap === null) return UNAVAILABLE

  const usageEffect = lmdiEffect(logMean, reference.usage, current.usage, 1, referenceUsage, currentUsage)
  const priceEffect = lmdiEffect(logMean, reference.price, current.price, 1, referencePrice, currentPrice)
  const lossEffect = lmdiEffect(logMean, referenceLossFactor, currentLossFactor, 1, referenceLossFactorExact, currentLossFactorExact)
  if (usageEffect === null || priceEffect === null || lossEffect === null) return UNAVAILABLE

  const effects: BOMParameterCostEffects = {
    usage: usageEffect,
    price: priceEffect,
    loss: lossEffect
  }

  const reconciled = reconcileLastEffect(effects, ['usage', 'price', 'loss'], changedKeys, targetGap)
  return reconciled ? { status: 'available', effects: reconciled } : UNAVAILABLE
}

interface RoutingSideCalculation {
  labor: number
  burden: number
  conversion: number
  exactLabor: ExactDecimal
  exactBurden: ExactDecimal
  exactConversion: ExactDecimal
}

function calculateRoutingSide(input: ValidRoutingParameterCostEffectInput): RoutingSideCalculation | null {
  if (!isPositiveFinite(input.manning) || !isPositiveFinite(input.capacity) || !isPositiveFinite(input.yield)
    || !isPositiveFinite(input.laborRate) || !isPositiveFinite(input.burdenRate)) return null

  const manning = exactInput(input, 'manning')
  const capacity = exactInput(input, 'capacity')
  const yieldValue = exactInput(input, 'yield', true)
  const laborRate = exactInput(input, 'laborRate')
  const burdenRate = exactInput(input, 'burdenRate')
  if (!manning || !capacity || !yieldValue || !laborRate || !burdenRate) return null
  const denominator = multiplyExactDecimals(capacity, yieldValue)
  const factor = divideExactDecimals(manning, denominator)
  if (!factor) return null
  const exactLabor = multiplyExactDecimals(factor, laborRate)
  const exactBurden = multiplyExactDecimals(factor, burdenRate)
  const exactConversion = addExactDecimals(exactLabor, exactBurden)
  const labor = exactDecimalToNumber(exactLabor)
  const burden = exactDecimalToNumber(exactBurden)
  const conversion = exactDecimalToNumber(exactConversion)
  return labor === null || burden === null || conversion === null
    ? null
    : { labor, burden, conversion, exactLabor, exactBurden, exactConversion }
}

function calculateElementEffects(
  reference: ValidRoutingParameterCostEffectInput,
  current: ValidRoutingParameterCostEffectInput,
  referenceCost: number,
  currentCost: number,
  referenceCostExact: ExactDecimal,
  currentCostExact: ExactDecimal,
  rateKey: 'laborRate' | 'burdenRate'
): RoutingCostEffects | null {
  const logMean = logarithmicMean(referenceCost, currentCost, referenceCostExact, currentCostExact)
  const targetGap = exactDecimalToNumber(subtractExactDecimals(currentCostExact, referenceCostExact))
  if (logMean === null || targetGap === null) return null

  const referenceManning = exactInput(reference, 'manning')
  const currentManning = exactInput(current, 'manning')
  const referenceCapacity = exactInput(reference, 'capacity')
  const currentCapacity = exactInput(current, 'capacity')
  const referenceYield = exactInput(reference, 'yield', true)
  const currentYield = exactInput(current, 'yield', true)
  const referenceLaborRate = exactInput(reference, 'laborRate')
  const currentLaborRate = exactInput(current, 'laborRate')
  const referenceBurdenRate = exactInput(reference, 'burdenRate')
  const currentBurdenRate = exactInput(current, 'burdenRate')
  if (!referenceManning || !currentManning || !referenceCapacity || !currentCapacity || !referenceYield || !currentYield
    || !referenceLaborRate || !currentLaborRate || !referenceBurdenRate || !currentBurdenRate) return null

  const manningEffect = lmdiEffect(logMean, reference.manning, current.manning, 1, referenceManning, currentManning)
  const capacityEffect = lmdiEffect(logMean, reference.capacity, current.capacity, -1, referenceCapacity, currentCapacity)
  const yieldEffect = lmdiEffect(logMean, reference.yield, current.yield, -1, referenceYield, currentYield)
  const laborRateEffect = rateKey === 'laborRate'
    ? lmdiEffect(logMean, reference.laborRate, current.laborRate, 1, referenceLaborRate, currentLaborRate)
    : 0
  const burdenRateEffect = rateKey === 'burdenRate'
    ? lmdiEffect(logMean, reference.burdenRate, current.burdenRate, 1, referenceBurdenRate, currentBurdenRate)
    : 0
  if (manningEffect === null || capacityEffect === null || yieldEffect === null
    || laborRateEffect === null || burdenRateEffect === null) return null

  const effects: RoutingCostEffects = {
    manning: manningEffect,
    capacity: capacityEffect,
    yield: yieldEffect,
    laborRate: laborRateEffect,
    burdenRate: burdenRateEffect
  }

  const orderedKeys = ['manning', 'capacity', 'yield', rateKey] as (keyof RoutingCostEffects)[]
  const changedKeys = orderedKeys.filter(key => !inputsEqual(reference, current, key, key === 'yield'))
  if (changedKeys.length === 0) {
    return compareExactDecimals(referenceCostExact, currentCostExact) === 0
      ? { manning: 0, capacity: 0, yield: 0, laborRate: 0, burdenRate: 0 }
      : null
  }
  return reconcileLastEffect(effects, orderedKeys, changedKeys, targetGap)
}

/** Uses additive LMDI for Labor and Burden independently, then sums matching parameter effects into Conversion. */
export function calculateRoutingParameterCostEffects(
  reference: RoutingParameterCostEffectInput,
  current: RoutingParameterCostEffectInput
): ParameterCostEffectResult<RoutingParameterCostEffects> {
  if (!hasRoutingInputs(reference) || !hasRoutingInputs(current)) return UNAVAILABLE

  if (!isPositiveFinite(reference.manning) || !isPositiveFinite(reference.capacity) || !isPositiveFinite(reference.yield)
    || !isPositiveFinite(reference.laborRate) || !isPositiveFinite(reference.burdenRate)
    || !isPositiveFinite(current.manning) || !isPositiveFinite(current.capacity) || !isPositiveFinite(current.yield)
    || !isPositiveFinite(current.laborRate) || !isPositiveFinite(current.burdenRate)) return UNAVAILABLE

  const referenceCost = calculateRoutingSide(reference)
  const currentCost = calculateRoutingSide(current)
  if (!referenceCost || !currentCost) return UNAVAILABLE

  const labor = calculateElementEffects(
    reference, current, referenceCost.labor, currentCost.labor,
    referenceCost.exactLabor, currentCost.exactLabor, 'laborRate'
  )
  const burden = calculateElementEffects(
    reference, current, referenceCost.burden, currentCost.burden,
    referenceCost.exactBurden, currentCost.exactBurden, 'burdenRate'
  )
  if (!labor || !burden) return UNAVAILABLE

  const conversionValues = {
    manning: safeAdd(labor.manning, burden.manning),
    capacity: safeAdd(labor.capacity, burden.capacity),
    yield: safeAdd(labor.yield, burden.yield),
    laborRate: labor.laborRate,
    burdenRate: burden.burdenRate
  }
  if (Object.values(conversionValues).some(value => value === null)) return UNAVAILABLE

  return {
    status: 'available',
    effects: {
      labor,
      burden,
      conversion: conversionValues as RoutingCostEffects
    }
  }
}
