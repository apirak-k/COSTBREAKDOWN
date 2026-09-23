import { SnapshotRoutingStep, SnapshotWorkCenterRate } from '../types'

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
  if (!step || step.manning === null || step.capacity === null || step.yield === null) {
    return { runtime: null, laborCost: null, burdenCost: null, total: null }
  }

  if (step.capacity <= 0 || step.yield <= 0) {
    return { runtime: null, laborCost: null, burdenCost: null, total: null }
  }

  const runtime = step.manning / (step.capacity * step.yield)
  if (!Number.isFinite(runtime)) {
    return { runtime: null, laborCost: null, burdenCost: null, total: null }
  }

  const matchingRates = step.workCenterId
    ? rates.filter(candidate => normalizeKey(candidate.workCenterCode) === normalizeKey(step.workCenterId))
    : []
  const rate = matchingRates.length === 1 ? matchingRates[0] : undefined
  const laborCost = rate?.laborRate === null || rate?.laborRate === undefined
    ? null
    : runtime * rate.laborRate
  const burdenCost = rate?.burdenRate === null || rate?.burdenRate === undefined
    ? null
    : runtime * rate.burdenRate
  const total = laborCost === null || burdenCost === null ? null : laborCost + burdenCost

  return { runtime, laborCost, burdenCost, total }
}

/** Calculates routing details with rates from the matching snapshot side. */
export function calculateSnapshotRoutingDetail(
  pair: SnapshotRoutingPair,
  referenceRates: SnapshotWorkCenterRate[],
  currentRates: SnapshotWorkCenterRate[]
): SnapshotRoutingDetail {
  const reference = calculateSide(pair.reference, referenceRates)
  const current = calculateSide(pair.current, currentRates)

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
    totalGap: reference.total === null || current.total === null ? null : current.total - reference.total
  }
}
