import { SnapshotRoutingStep, SnapshotWorkCenterRate } from '../types'
import { safeAdd, safeDivide, safeMultiply } from '../utils/guards'

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
}

interface SideCalculation {
  runtime: number | null
  laborCost: number | null
  burdenCost: number | null
  total: number | null
}

function normalizeKey(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? ''
}

function calculateSide(step: SnapshotRoutingStep | undefined, rates: SnapshotWorkCenterRate[]): SideCalculation {
  if (!step
    || step.manning === null || !Number.isFinite(step.manning)
    || step.capacity === null || !Number.isFinite(step.capacity)
    || step.yield === null || !Number.isFinite(step.yield)) {
    return { runtime: null, laborCost: null, burdenCost: null, total: null }
  }

  if (step.capacity <= 0 || step.yield <= 0) {
    return { runtime: null, laborCost: null, burdenCost: null, total: null }
  }

  const denominator = safeMultiply(step.capacity, step.yield)
  const runtime = denominator === null ? null : safeDivide(step.manning, denominator)
  if (runtime === null) {
    return { runtime: null, laborCost: null, burdenCost: null, total: null }
  }

  const matchingRates = step.workCenterId
    ? rates.filter(candidate => normalizeKey(candidate.workCenterCode) === normalizeKey(step.workCenterId))
    : []
  const rate = matchingRates.length === 1 ? matchingRates[0] : undefined
  const laborCost = rate?.laborRate === null || rate?.laborRate === undefined || !Number.isFinite(rate.laborRate)
    ? null
    : safeMultiply(runtime, rate.laborRate)
  const burdenCost = rate?.burdenRate === null || rate?.burdenRate === undefined || !Number.isFinite(rate.burdenRate)
    ? null
    : safeMultiply(runtime, rate.burdenRate)
  const total = laborCost === null || burdenCost === null ? null : safeAdd(laborCost, burdenCost)

  return { runtime, laborCost, burdenCost, total }
}

/** Calculates routing details with rates from the matching snapshot side, using absent-side zero for added/removed steps. */
export function calculateSnapshotRoutingDetail(
  pair: SnapshotRoutingPair,
  referenceRates: SnapshotWorkCenterRate[],
  currentRates: SnapshotWorkCenterRate[]
): SnapshotRoutingDetail {
  const reference = pair.reference ? calculateSide(pair.reference, referenceRates) : { runtime: 0, laborCost: 0, burdenCost: 0, total: 0 }
  const current = pair.current ? calculateSide(pair.current, currentRates) : { runtime: 0, laborCost: 0, burdenCost: 0, total: 0 }

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
    totalGap: reference.total === null || current.total === null ? null : safeAdd(current.total, -reference.total)
  }
}
