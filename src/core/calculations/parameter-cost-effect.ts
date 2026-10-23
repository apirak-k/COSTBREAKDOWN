import { areNumericValuesEquivalent, safeAdd, safeDivide, safeMultiply } from '../utils/guards'

export interface BOMParameterCostEffectInput {
  usage: number | null
  price: number | null
  loss: number | null
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
}

type ValidRoutingParameterCostEffectInput = {
  manning: number
  capacity: number
  yield: number
  laborRate: number
  burdenRate: number
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

function logarithmicRatio(reference: number, current: number): number | null {
  if (!isPositiveFinite(reference) || !isPositiveFinite(current)) return null
  if (reference === current) return 0

  const relativeDifference = (current - reference) / reference
  const result = Number.isFinite(relativeDifference) && relativeDifference > -1
    ? Math.log1p(relativeDifference)
    : Math.log(current) - Math.log(reference)
  return Number.isFinite(result) ? result : null
}

function logarithmicMean(reference: number, current: number): number | null {
  if (!isPositiveFinite(reference) || !isPositiveFinite(current)) return null
  if (reference === current) return reference

  const logDifference = logarithmicRatio(reference, current)
  const costDifference = current - reference
  if (logDifference === null || logDifference === 0 || !Number.isFinite(costDifference)) return null

  const result = costDifference / logDifference
  return Number.isFinite(result) && result > 0 ? result : null
}

function lmdiEffect(
  logMean: number,
  referenceFactor: number,
  currentFactor: number,
  exponent = 1
): number | null {
  if (!isPositiveFinite(referenceFactor) || !isPositiveFinite(currentFactor)) return null
  if (areNumericValuesEquivalent(referenceFactor, currentFactor)) return 0
  const logRatio = logarithmicRatio(referenceFactor, currentFactor)
  if (logRatio === null) return null
  const result = safeMultiply(logMean, exponent, logRatio)
  return result !== null && Number.isFinite(result) ? result : null
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
    || !isPositiveFinite(reference.loss)
    || !isPositiveFinite(current.usage) || !isPositiveFinite(current.price)
    || !isPositiveFinite(current.loss)) return UNAVAILABLE

  const referenceLossFactor = 1 + reference.loss!
  const currentLossFactor = 1 + current.loss!
  if (!isPositiveFinite(referenceLossFactor) || !isPositiveFinite(currentLossFactor)) return UNAVAILABLE

  const referenceCost = safeMultiply(reference.usage, reference.price, referenceLossFactor)
  const currentCost = safeMultiply(current.usage, current.price, currentLossFactor)
  if (referenceCost === null || currentCost === null) return UNAVAILABLE

  const changedKeys = (['usage', 'price', 'loss'] as const)
    .filter(key => !areNumericValuesEquivalent(reference[key], current[key]))
  if (changedKeys.length === 0) {
    return areNumericValuesEquivalent(referenceCost, currentCost)
      ? { status: 'available', effects: { usage: 0, price: 0, loss: 0 } }
      : UNAVAILABLE
  }

  const logMean = logarithmicMean(referenceCost, currentCost)
  const targetGap = safeAdd(currentCost, -referenceCost)
  if (logMean === null || targetGap === null) return UNAVAILABLE

  const usageEffect = lmdiEffect(logMean, reference.usage, current.usage)
  const priceEffect = lmdiEffect(logMean, reference.price, current.price)
  const lossEffect = lmdiEffect(logMean, referenceLossFactor, currentLossFactor)
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
}

function calculateRoutingSide(input: ValidRoutingParameterCostEffectInput): RoutingSideCalculation | null {
  if (!isPositiveFinite(input.manning) || !isPositiveFinite(input.capacity) || !isPositiveFinite(input.yield)
    || !isPositiveFinite(input.laborRate) || !isPositiveFinite(input.burdenRate)) return null

  const denominator = safeMultiply(input.capacity, input.yield)
  const factor = denominator === null ? null : safeDivide(input.manning, denominator)
  const labor = factor === null ? null : safeMultiply(factor, input.laborRate)
  const burden = factor === null ? null : safeMultiply(factor, input.burdenRate)
  const conversion = labor === null || burden === null ? null : safeAdd(labor, burden)
  return labor === null || burden === null || conversion === null ? null : { labor, burden, conversion }
}

function calculateElementEffects(
  reference: ValidRoutingParameterCostEffectInput,
  current: ValidRoutingParameterCostEffectInput,
  referenceCost: number,
  currentCost: number,
  rateKey: 'laborRate' | 'burdenRate'
): RoutingCostEffects | null {
  const logMean = logarithmicMean(referenceCost, currentCost)
  const targetGap = safeAdd(currentCost, -referenceCost)
  if (logMean === null || targetGap === null) return null

  const manningEffect = lmdiEffect(logMean, reference.manning, current.manning)
  const capacityEffect = lmdiEffect(logMean, reference.capacity, current.capacity, -1)
  const yieldEffect = lmdiEffect(logMean, reference.yield, current.yield, -1)
  const laborRateEffect = rateKey === 'laborRate' ? lmdiEffect(logMean, reference.laborRate, current.laborRate) : 0
  const burdenRateEffect = rateKey === 'burdenRate' ? lmdiEffect(logMean, reference.burdenRate, current.burdenRate) : 0
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
  const changedKeys = orderedKeys.filter(key => !areNumericValuesEquivalent(reference[key], current[key]))
  if (changedKeys.length === 0) {
    return areNumericValuesEquivalent(referenceCost, currentCost)
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

  const labor = calculateElementEffects(reference, current, referenceCost.labor, currentCost.labor, 'laborRate')
  const burden = calculateElementEffects(reference, current, referenceCost.burden, currentCost.burden, 'burdenRate')
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
