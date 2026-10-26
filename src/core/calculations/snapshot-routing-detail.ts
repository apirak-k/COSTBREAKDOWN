import { SnapshotRoutingStep, SnapshotWorkCenterRate } from '../types'
import {
  addExactDecimals,
  divideExactDecimals,
  exactDecimalInputValue,
  exactDecimalToNumber,
  exactDecimalToString,
  multiplyExactDecimals,
  parseExactDecimal,
  subtractExactDecimals,
  type ExactDecimal
} from '../utils/exact-decimal'
import { isMasterDataNumericValueValid } from '../utils/master-data-validation'

export interface SnapshotRoutingPair {
  reference?: SnapshotRoutingStep
  current?: SnapshotRoutingStep
}

export interface SnapshotRoutingDetail {
  pair: SnapshotRoutingPair
  referenceRuntime: number | null
  currentRuntime: number | null
  referenceLaborCost: number | null
  currentLaborCost: number | null
  referenceBurdenCost: number | null
  currentBurdenCost: number | null
  referenceTotal: number | null
  currentTotal: number | null
  totalGap: number | null
  exactValues?: {
    referenceRuntime: string | null
    currentRuntime: string | null
    referenceLaborCost: string | null
    currentLaborCost: string | null
    referenceBurdenCost: string | null
    currentBurdenCost: string | null
    referenceTotal: string | null
    currentTotal: string | null
    totalGap: string | null
  }
}

interface SideCalculation {
  runtime: number | null
  laborCost: number | null
  burdenCost: number | null
  total: number | null
  exactRuntime: ExactDecimal | null
  exactLaborCost: ExactDecimal | null
  exactBurdenCost: ExactDecimal | null
  exactTotal: ExactDecimal | null
}

function asNumber(value: ExactDecimal | null): number | null {
  return value ? exactDecimalToNumber(value) : null
}

function normalizeKey(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? ''
}

/** Resolves a Routing step's Work Center only when its snapshot-side identity is unique. */
export function resolveSnapshotRoutingRate(
  step: SnapshotRoutingStep | undefined,
  rates: SnapshotWorkCenterRate[]
): SnapshotWorkCenterRate | undefined {
  if (!step?.workCenterId) return undefined
  const matchingRates = rates.filter(rate => normalizeKey(rate.workCenterCode) === normalizeKey(step.workCenterId))
  return matchingRates.length === 1 ? matchingRates[0] : undefined
}

function calculateSide(step: SnapshotRoutingStep | undefined, rates: SnapshotWorkCenterRate[]): SideCalculation {
  if (!step
    || step.manning == null || !isMasterDataNumericValueValid('manning', step.manning)
    || step.capacity == null || !isMasterDataNumericValueValid('capacity', step.capacity)
    || step.yield == null || !isMasterDataNumericValueValid('yield', step.yield)) {
    return { runtime: null, laborCost: null, burdenCost: null, total: null, exactRuntime: null, exactLaborCost: null, exactBurdenCost: null, exactTotal: null }
  }

  const manning = exactDecimalInputValue(step.manning, step.exactDecimalInputs?.manning)
  const capacity = exactDecimalInputValue(step.capacity, step.exactDecimalInputs?.capacity)
  const yieldValue = exactDecimalInputValue(step.yield, step.exactDecimalInputs?.yield, true)
  const denominator = capacity && yieldValue ? multiplyExactDecimals(capacity, yieldValue) : null
  const exactRuntime = manning && denominator ? divideExactDecimals(manning, denominator) : null
  const runtime = asNumber(exactRuntime)
  if (runtime === null) {
    return { runtime: null, laborCost: null, burdenCost: null, total: null, exactRuntime, exactLaborCost: null, exactBurdenCost: null, exactTotal: null }
  }

  const rate = resolveSnapshotRoutingRate(step, rates)
  const exactLaborRate = rate?.laborRate == null || !isMasterDataNumericValueValid('laborRate', rate.laborRate)
    ? null
    : exactDecimalInputValue(rate.laborRate, rate.exactDecimalInputs?.laborRate)
  const exactBurdenRate = rate?.burdenRate == null || !isMasterDataNumericValueValid('burdenRate', rate.burdenRate)
    ? null
    : exactDecimalInputValue(rate.burdenRate, rate.exactDecimalInputs?.burdenRate)
  const exactLaborCost = exactLaborRate ? multiplyExactDecimals(exactRuntime!, exactLaborRate) : null
  const exactBurdenCost = exactBurdenRate ? multiplyExactDecimals(exactRuntime!, exactBurdenRate) : null
  const laborCost = asNumber(exactLaborCost)
  const burdenCost = asNumber(exactBurdenCost)
  const exactTotal = exactLaborCost && exactBurdenCost ? addExactDecimals(exactLaborCost, exactBurdenCost) : null
  const total = asNumber(exactTotal)

  return { runtime, laborCost, burdenCost, total, exactRuntime, exactLaborCost, exactBurdenCost, exactTotal }
}

/** Calculates routing details with rates from the matching snapshot side, using absent-side zero for added/removed steps. */
export function calculateSnapshotRoutingDetail(
  pair: SnapshotRoutingPair,
  referenceRates: SnapshotWorkCenterRate[],
  currentRates: SnapshotWorkCenterRate[]
): SnapshotRoutingDetail {
  const zero = parseExactDecimal(0)!
  const emptySide = { runtime: 0, laborCost: 0, burdenCost: 0, total: 0, exactRuntime: zero, exactLaborCost: zero, exactBurdenCost: zero, exactTotal: zero }
  const reference = pair.reference ? calculateSide(pair.reference, referenceRates) : emptySide
  const current = pair.current ? calculateSide(pair.current, currentRates) : emptySide
  const exactGap = reference.exactTotal && current.exactTotal
    ? subtractExactDecimals(current.exactTotal, reference.exactTotal)
    : null

  return {
    pair,
    referenceRuntime: reference.runtime,
    currentRuntime: current.runtime,
    referenceLaborCost: reference.laborCost,
    currentLaborCost: current.laborCost,
    referenceBurdenCost: reference.burdenCost,
    currentBurdenCost: current.burdenCost,
    referenceTotal: reference.total,
    currentTotal: current.total,
    totalGap: exactGap ? (exactGap.coefficient === 0n ? 0 : exactDecimalToNumber(exactGap)) : null,
    exactValues: {
      referenceRuntime: reference.exactRuntime ? exactDecimalToString(reference.exactRuntime) : null,
      currentRuntime: current.exactRuntime ? exactDecimalToString(current.exactRuntime) : null,
      referenceLaborCost: reference.exactLaborCost ? exactDecimalToString(reference.exactLaborCost) : null,
      currentLaborCost: current.exactLaborCost ? exactDecimalToString(current.exactLaborCost) : null,
      referenceBurdenCost: reference.exactBurdenCost ? exactDecimalToString(reference.exactBurdenCost) : null,
      currentBurdenCost: current.exactBurdenCost ? exactDecimalToString(current.exactBurdenCost) : null,
      referenceTotal: reference.exactTotal ? exactDecimalToString(reference.exactTotal) : null,
      currentTotal: current.exactTotal ? exactDecimalToString(current.exactTotal) : null,
      totalGap: exactGap ? exactDecimalToString(exactGap) : null
    }
  }
}
