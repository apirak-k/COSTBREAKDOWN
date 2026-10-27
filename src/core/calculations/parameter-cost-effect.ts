import { areNumericValuesEquivalent, safeAdd, safeDivide, safeMultiply } from '../utils/guards'
import {
  addExactDecimals,
  compareExactDecimals,
  divideExactDecimals,
  exactDecimalToNumber,
  multiplyExactDecimals,
  parseExactDecimal,
  resolveExactDecimalInputPair,
  subtractExactDecimals,
  type ExactDecimal,
  type ExactDecimalInputPair
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

export interface ParameterCostEffectOptions {
  /** Simulation accepts valid zero-cost boundaries; Cost Breakdown retains its positive-only attribution domain. */
  allowZeroBoundary?: boolean
  /** Cost Breakdown comparison may align one-sided lexemes; Simulation keeps strict exact comparisons by default. */
  allowOneSidedNumberProjectionMatch?: boolean
}

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

function isNonNegativeFinite(value: number | null): value is number {
  return value !== null && Number.isFinite(value) && value >= 0
}

interface ExactAttributionFactor {
  key: string
  reference: ExactDecimal
  current: ExactDecimal
}

function exactZeroBoundaryAttribution(
  referenceCost: ExactDecimal,
  currentCost: ExactDecimal,
  factors: readonly ExactAttributionFactor[],
  calculateCost: (values: ReadonlyMap<string, ExactDecimal>) => ExactDecimal | null
): Record<string, number> | null {
  const zero = parseExactDecimal(0)!
  const zeroEffects = () => Object.fromEntries(factors.map(({ key }) => [key, 0]))
  const referenceIsZero = compareExactDecimals(referenceCost, zero) === 0
  const currentIsZero = compareExactDecimals(currentCost, zero) === 0
  if (referenceIsZero && currentIsZero) return zeroEffects()

  const changed = factors.filter(factor => compareExactDecimals(factor.reference, factor.current) !== 0)
  if (changed.length === 0) return null

  const totals = new Map(changed.map(({ key }) => [key, zero]))
  let permutationCount = 0
  let invalidPermutation = false
  const applyOrder = (order: readonly ExactAttributionFactor[]) => {
    const values = new Map(factors.map(({ key, reference }) => [key, reference]))
    let previousCost = referenceCost
    for (const factor of order) {
      values.set(factor.key, factor.current)
      const nextCost = calculateCost(values)
      if (!nextCost) {
        invalidPermutation = true
        return
      }
      const marginal = subtractExactDecimals(nextCost, previousCost)
      totals.set(factor.key, addExactDecimals(totals.get(factor.key)!, marginal))
      previousCost = nextCost
    }
    if (compareExactDecimals(previousCost, currentCost) !== 0) {
      invalidPermutation = true
      return
    }
    permutationCount += 1
  }
  const enumerate = (remaining: readonly ExactAttributionFactor[], order: readonly ExactAttributionFactor[]) => {
    if (remaining.length === 0) {
      applyOrder(order)
      return
    }
    remaining.forEach((factor, index) => enumerate(
      [...remaining.slice(0, index), ...remaining.slice(index + 1)],
      [...order, factor]
    ))
  }
  enumerate(changed, [])
  if (invalidPermutation || permutationCount === 0) return null

  const divisor = parseExactDecimal(permutationCount)!
  const averaged = new Map<string, ExactDecimal>()
  for (const factor of changed) {
    const average = divideExactDecimals(totals.get(factor.key)!, divisor)
    if (!average) return null
    averaged.set(factor.key, average)
  }

  const lastChanged = changed[changed.length - 1]
  let preceding = zero
  for (const factor of factors) {
    if (factor.key === lastChanged.key) continue
    const value = averaged.get(factor.key) ?? zero
    preceding = addExactDecimals(preceding, value)
  }
  averaged.set(lastChanged.key, subtractExactDecimals(subtractExactDecimals(currentCost, referenceCost), preceding))

  const result: Record<string, number> = {}
  for (const { key } of factors) {
    const value = exactDecimalToNumber(averaged.get(key) ?? zero)
    if (value === null || !Number.isFinite(value)) return null
    result[key] = value
  }
  return result
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
  const relativeDifference = relativeExact ? exactDecimalToNumber(relativeExact) : safeDivide(current - reference, reference)
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
  currentExact?: ExactDecimal | null,
  exactInputIsAuthoritative = false
): number | null {
  if (!isPositiveFinite(referenceFactor) || !isPositiveFinite(currentFactor)) return null
  if (exactInputIsAuthoritative && referenceExact && currentExact
    ? compareExactDecimals(referenceExact, currentExact) === 0
    : areNumericValuesEquivalent(referenceFactor, currentFactor)) return 0
  const logRatio = logarithmicRatio(referenceFactor, currentFactor, referenceExact, currentExact)
  if (logRatio === null) return null
  const result = safeMultiply(logMean, exponent, logRatio)
  return result !== null && Number.isFinite(result) ? result : null
}

function exactInputPair(
  reference: Record<string, unknown> & { exactInputs?: Record<string, string> },
  current: Record<string, unknown> & { exactInputs?: Record<string, string> },
  field: string,
  percentEntry = false,
  allowOneSidedNumberProjectionMatch = false
): ExactDecimalInputPair {
  return resolveExactDecimalInputPair(
    reference[field] as number | null,
    reference.exactInputs?.[field],
    current[field] as number | null,
    current.exactInputs?.[field],
    percentEntry,
    { allowOneSidedNumberProjectionMatch }
  )
}

function hasAuthoritativeExactInput(
  input: Record<string, unknown> & { exactInputs?: Record<string, string> },
  field: string
): boolean {
  const value = input.exactInputs?.[field]
  return typeof value === 'string' && value.trim().length > 0
}

function usesAuthoritativeExactInput(
  left: Record<string, unknown> & { exactInputs?: Record<string, string> },
  right: Record<string, unknown> & { exactInputs?: Record<string, string> },
  field: string
): boolean {
  return hasAuthoritativeExactInput(left, field) || hasAuthoritativeExactInput(right, field)
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
  current: BOMParameterCostEffectInput,
  {
    allowZeroBoundary = false,
    allowOneSidedNumberProjectionMatch = false
  }: ParameterCostEffectOptions = {}
): ParameterCostEffectResult<BOMParameterCostEffects> {
  if (!hasBOMInputs(reference) || !hasBOMInputs(current)) return UNAVAILABLE

  const validProductInput = allowZeroBoundary ? isNonNegativeFinite : isPositiveFinite
  if (!validProductInput(reference.usage) || !validProductInput(reference.price)
    || !validProductInput(current.usage) || !validProductInput(current.price)
    || reference.loss < 0 || reference.loss > 1
    || current.loss < 0 || current.loss > 1) return UNAVAILABLE

  const usagePair = exactInputPair(reference, current, 'usage', false, allowOneSidedNumberProjectionMatch)
  const pricePair = exactInputPair(reference, current, 'price', false, allowOneSidedNumberProjectionMatch)
  const lossPair = exactInputPair(reference, current, 'loss', true, allowOneSidedNumberProjectionMatch)
  const referenceUsage = usagePair.reference
  const currentUsage = usagePair.current
  const referencePrice = pricePair.reference
  const currentPrice = pricePair.current
  const referenceLoss = lossPair.reference
  const currentLoss = lossPair.current
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
    .filter(key => !({ usage: usagePair, price: pricePair, loss: lossPair }[key]).equivalent)
  if (changedKeys.length === 0) {
    return compareExactDecimals(referenceCostExact, currentCostExact) === 0
      ? { status: 'available', effects: { usage: 0, price: 0, loss: 0 } }
      : UNAVAILABLE
  }

  const targetGap = exactDecimalToNumber(subtractExactDecimals(currentCostExact, referenceCostExact))
  if (targetGap === null) return UNAVAILABLE

  const orderedKeys = ['usage', 'price', 'loss'] as const
  if (allowZeroBoundary && (compareExactDecimals(referenceCostExact, parseExactDecimal(0)!) === 0
    || compareExactDecimals(currentCostExact, parseExactDecimal(0)!) === 0)) {
    const zeroBoundaryEffects = exactZeroBoundaryAttribution(referenceCostExact, currentCostExact, [
      { key: 'usage', reference: referenceUsage, current: currentUsage },
      { key: 'price', reference: referencePrice, current: currentPrice },
      { key: 'loss', reference: referenceLossFactorExact, current: currentLossFactorExact }
    ], values => multiplyExactDecimals(values.get('usage')!, values.get('price')!, values.get('loss')!))
    if (!zeroBoundaryEffects) return UNAVAILABLE
    const reconciled = reconcileLastEffect(zeroBoundaryEffects, orderedKeys, changedKeys, targetGap)
    return reconciled ? {
      status: 'available',
      effects: { usage: reconciled.usage, price: reconciled.price, loss: reconciled.loss }
    } : UNAVAILABLE
  }

  const logMean = logarithmicMean(referenceCost, currentCost, referenceCostExact, currentCostExact)
  if (logMean === null) return UNAVAILABLE

  const usageEffect = usagePair.equivalent ? 0 : lmdiEffect(logMean, reference.usage, current.usage, 1, referenceUsage, currentUsage,
    usesAuthoritativeExactInput(reference, current, 'usage'))
  const priceEffect = pricePair.equivalent ? 0 : lmdiEffect(logMean, reference.price, current.price, 1, referencePrice, currentPrice,
    usesAuthoritativeExactInput(reference, current, 'price'))
  const lossEffect = lossPair.equivalent ? 0 : lmdiEffect(logMean, referenceLossFactor, currentLossFactor, 1, referenceLossFactorExact, currentLossFactorExact,
    usesAuthoritativeExactInput(reference, current, 'loss'))
  if (usageEffect === null || priceEffect === null || lossEffect === null) return UNAVAILABLE

  const effects: BOMParameterCostEffects = {
    usage: usageEffect,
    price: priceEffect,
    loss: lossEffect
  }

  const reconciled = reconcileLastEffect(effects, orderedKeys, changedKeys, targetGap)
  return reconciled ? { status: 'available', effects: reconciled } : UNAVAILABLE
}

type RoutingExactField = 'manning' | 'capacity' | 'yield' | 'laborRate' | 'burdenRate'
type ResolvedRoutingExactInputs = Record<RoutingExactField, ExactDecimal>
type RoutingExactInputPairs = Record<RoutingExactField, ExactDecimalInputPair>

interface RoutingSideCalculation {
  labor: number
  burden: number
  conversion: number
  exactLabor: ExactDecimal
  exactBurden: ExactDecimal
  exactConversion: ExactDecimal
}

function calculateRoutingSide(
  input: ValidRoutingParameterCostEffectInput,
  exactInputs: ResolvedRoutingExactInputs,
  allowZeroManning = false
): RoutingSideCalculation | null {
  const validManning = allowZeroManning ? isNonNegativeFinite : isPositiveFinite
  if (!validManning(input.manning) || !isPositiveFinite(input.capacity) || !isPositiveFinite(input.yield)
    || !isPositiveFinite(input.laborRate) || !isPositiveFinite(input.burdenRate)) return null

  const manning = exactInputs.manning
  const capacity = exactInputs.capacity
  const yieldValue = exactInputs.yield
  const laborRate = exactInputs.laborRate
  const burdenRate = exactInputs.burdenRate
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
  rateKey: 'laborRate' | 'burdenRate',
  allowZeroBoundary: boolean,
  exactPairs: RoutingExactInputPairs
): RoutingCostEffects | null {
  const targetGap = exactDecimalToNumber(subtractExactDecimals(currentCostExact, referenceCostExact))
  if (targetGap === null) return null

  const referenceManning = exactPairs.manning.reference
  const currentManning = exactPairs.manning.current
  const referenceCapacity = exactPairs.capacity.reference
  const currentCapacity = exactPairs.capacity.current
  const referenceYield = exactPairs.yield.reference
  const currentYield = exactPairs.yield.current
  const referenceLaborRate = exactPairs.laborRate.reference
  const currentLaborRate = exactPairs.laborRate.current
  const referenceBurdenRate = exactPairs.burdenRate.reference
  const currentBurdenRate = exactPairs.burdenRate.current
  if (!referenceManning || !currentManning || !referenceCapacity || !currentCapacity || !referenceYield || !currentYield
    || !referenceLaborRate || !currentLaborRate || !referenceBurdenRate || !currentBurdenRate) return null

  const orderedKeys = ['manning', 'capacity', 'yield', rateKey] as (keyof RoutingCostEffects)[]
  const changedKeys = orderedKeys.filter(key => !exactPairs[key].equivalent)
  if (allowZeroBoundary && (compareExactDecimals(referenceCostExact, parseExactDecimal(0)!) === 0
    || compareExactDecimals(currentCostExact, parseExactDecimal(0)!) === 0)) {
    const referenceRate = rateKey === 'laborRate' ? referenceLaborRate : referenceBurdenRate
    const currentRate = rateKey === 'laborRate' ? currentLaborRate : currentBurdenRate
    const zeroBoundaryEffects = exactZeroBoundaryAttribution(referenceCostExact, currentCostExact, [
      { key: 'manning', reference: referenceManning, current: currentManning },
      { key: 'capacity', reference: referenceCapacity, current: currentCapacity },
      { key: 'yield', reference: referenceYield, current: currentYield },
      { key: rateKey, reference: referenceRate, current: currentRate }
    ], values => {
      const denominator = multiplyExactDecimals(values.get('capacity')!, values.get('yield')!)
      const factor = divideExactDecimals(values.get('manning')!, denominator)
      return factor ? multiplyExactDecimals(factor, values.get(rateKey)!) : null
    })
    if (!zeroBoundaryEffects) return null
    const reconciled = reconcileLastEffect(zeroBoundaryEffects, orderedKeys, changedKeys, targetGap)
    if (!reconciled) return null
    return {
      manning: reconciled.manning ?? 0,
      capacity: reconciled.capacity ?? 0,
      yield: reconciled.yield ?? 0,
      laborRate: reconciled.laborRate ?? 0,
      burdenRate: reconciled.burdenRate ?? 0
    }
  }

  const logMean = logarithmicMean(referenceCost, currentCost, referenceCostExact, currentCostExact)
  if (logMean === null) return null

  const manningEffect = exactPairs.manning.equivalent ? 0 : lmdiEffect(logMean, reference.manning, current.manning, 1, referenceManning, currentManning,
    usesAuthoritativeExactInput(reference, current, 'manning'))
  const capacityEffect = exactPairs.capacity.equivalent ? 0 : lmdiEffect(logMean, reference.capacity, current.capacity, -1, referenceCapacity, currentCapacity,
    usesAuthoritativeExactInput(reference, current, 'capacity'))
  const yieldEffect = exactPairs.yield.equivalent ? 0 : lmdiEffect(logMean, reference.yield, current.yield, -1, referenceYield, currentYield,
    usesAuthoritativeExactInput(reference, current, 'yield'))
  const laborRateEffect = rateKey === 'laborRate' && !exactPairs.laborRate.equivalent
    ? lmdiEffect(logMean, reference.laborRate, current.laborRate, 1, referenceLaborRate, currentLaborRate,
      usesAuthoritativeExactInput(reference, current, 'laborRate'))
    : 0
  const burdenRateEffect = rateKey === 'burdenRate' && !exactPairs.burdenRate.equivalent
    ? lmdiEffect(logMean, reference.burdenRate, current.burdenRate, 1, referenceBurdenRate, currentBurdenRate,
      usesAuthoritativeExactInput(reference, current, 'burdenRate'))
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
  current: RoutingParameterCostEffectInput,
  {
    allowZeroBoundary = false,
    allowOneSidedNumberProjectionMatch = false
  }: ParameterCostEffectOptions = {}
): ParameterCostEffectResult<RoutingParameterCostEffects> {
  if (!hasRoutingInputs(reference) || !hasRoutingInputs(current)) return UNAVAILABLE

  const validManning = allowZeroBoundary ? isNonNegativeFinite : isPositiveFinite
  if (!validManning(reference.manning) || !isPositiveFinite(reference.capacity) || !isPositiveFinite(reference.yield)
    || !isPositiveFinite(reference.laborRate) || !isPositiveFinite(reference.burdenRate)
    || !validManning(current.manning) || !isPositiveFinite(current.capacity) || !isPositiveFinite(current.yield)
    || !isPositiveFinite(current.laborRate) || !isPositiveFinite(current.burdenRate)) return UNAVAILABLE

  const exactPairs: RoutingExactInputPairs = {
    manning: exactInputPair(reference, current, 'manning', false, allowOneSidedNumberProjectionMatch),
    capacity: exactInputPair(reference, current, 'capacity', false, allowOneSidedNumberProjectionMatch),
    yield: exactInputPair(reference, current, 'yield', true, allowOneSidedNumberProjectionMatch),
    laborRate: exactInputPair(reference, current, 'laborRate', false, allowOneSidedNumberProjectionMatch),
    burdenRate: exactInputPair(reference, current, 'burdenRate', false, allowOneSidedNumberProjectionMatch)
  }
  if (Object.values(exactPairs).some(pair => pair.reference === null || pair.current === null)) return UNAVAILABLE
  const referenceExactInputs = Object.fromEntries(Object.entries(exactPairs).map(([key, pair]) => [key, pair.reference])) as ResolvedRoutingExactInputs
  const currentExactInputs = Object.fromEntries(Object.entries(exactPairs).map(([key, pair]) => [key, pair.current])) as ResolvedRoutingExactInputs

  const referenceCost = calculateRoutingSide(reference, referenceExactInputs, allowZeroBoundary)
  const currentCost = calculateRoutingSide(current, currentExactInputs, allowZeroBoundary)
  if (!referenceCost || !currentCost) return UNAVAILABLE

  const labor = calculateElementEffects(
    reference, current, referenceCost.labor, currentCost.labor,
    referenceCost.exactLabor, currentCost.exactLabor, 'laborRate', allowZeroBoundary, exactPairs
  )
  const burden = calculateElementEffects(
    reference, current, referenceCost.burden, currentCost.burden,
    referenceCost.exactBurden, currentCost.exactBurden, 'burdenRate', allowZeroBoundary, exactPairs
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
