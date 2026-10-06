import { BOMItem, RoutingStep, WorkCenterRate, BOMDetailedRow, RoutingDetailedRow } from '../types'
import { safeAdd, safeDivide, safeMultiply } from '../utils/guards'
import { createWorkCenterRateMap, resolveWorkCenterRate } from './work-center-rate'

function addNullable(total: number | null, value: number | null): number | null {
  return total === null || value === null ? null : safeAdd(total, value)
}

function difference(after: number | null, before: number | null): number | null {
  return after === null || before === null ? null : safeAdd(after, -before)
}

function routingRuntime(manning: number, capacity: number, yieldValue: number): number | null {
  if (![manning, capacity, yieldValue].every(Number.isFinite) || capacity <= 0 || yieldValue <= 0) return null
  const denominator = safeMultiply(capacity, yieldValue)
  return denominator === null ? null : safeDivide(manning, denominator)
}

/** Computes BOM detail while preserving invalid and non-finite rows as unavailable. */
export function calculateBOMDetailedRows(bom: BOMItem[]): {
  rows: BOMDetailedRow[]
  totalBase: number | null
  totalActive: number | null
  totalVariance: number | null
  totalMPV: number | null
  totalMLV: number | null
} {
  const rows: BOMDetailedRow[] = bom.map(item => {
    if (![item.consumption, item.basePrice, item.activePrice, item.baseLoss, item.activeLoss].every(Number.isFinite)) {
      return { ...item, baseCost: null, activeCost: null, variance: null, mpv: null, mlv: null }
    }
    const baseLossFactor = safeAdd(1, item.baseLoss)
    const activeLossFactor = safeAdd(1, item.activeLoss)
    const baseCost = baseLossFactor === null ? null : safeMultiply(item.consumption, item.basePrice, baseLossFactor)
    const activeCost = activeLossFactor === null ? null : safeMultiply(item.consumption, item.activePrice, activeLossFactor)
    const priceDelta = safeAdd(item.activePrice, -item.basePrice)
    const lossDelta = safeAdd(item.activeLoss, -item.baseLoss)
    const mpv = priceDelta === null || activeLossFactor === null
      ? null
      : safeMultiply(priceDelta, item.consumption, activeLossFactor)
    const mlv = lossDelta === null ? null : safeMultiply(lossDelta, item.consumption, item.basePrice)
    return { ...item, baseCost, activeCost, variance: difference(activeCost, baseCost), mpv, mlv }
  })

  let totalBase: number | null = bom.length ? 0 : null
  let totalActive: number | null = bom.length ? 0 : null
  let totalMPV: number | null = bom.length ? 0 : null
  let totalMLV: number | null = bom.length ? 0 : null
  for (const row of rows) {
    totalBase = addNullable(totalBase, row.baseCost)
    totalActive = addNullable(totalActive, row.activeCost)
    totalMPV = addNullable(totalMPV, row.mpv)
    totalMLV = addNullable(totalMLV, row.mlv)
  }

  return { rows, totalBase, totalActive, totalVariance: difference(totalActive, totalBase), totalMPV, totalMLV }
}

/** Computes Routing detail with absent rates, invalid factors, and overflow shown as unavailable. */
export function calculateRoutingDetailedRows(
  routing: RoutingStep[],
  rates: WorkCenterRate[]
): {
  rows: RoutingDetailedRow[]
  totalBaseLabor: number | null
  totalActiveLabor: number | null
  totalBaseBurden: number | null
  totalActiveBurden: number | null
  totalBase: number | null
  totalActive: number | null
  totalVariance: number | null
} {
  const rateMap = createWorkCenterRateMap(rates)
  const rows: RoutingDetailedRow[] = routing.map(step => {
    const resolution = resolveWorkCenterRate(rateMap, step.wc)
    const rate = resolution.rate
    const baseRuntime = routingRuntime(step.manning, step.baseCap, step.baseYield)
    const activeRuntime = routingRuntime(step.manning, step.activeCap, step.activeYield)
    const validRates = rate !== null && Number.isFinite(rate.labor) && Number.isFinite(rate.burden)
    const baseLaborCost = validRates && baseRuntime !== null ? safeMultiply(baseRuntime, rate.labor) : null
    const activeLaborCost = validRates && activeRuntime !== null ? safeMultiply(activeRuntime, rate.labor) : null
    const baseBurdenCost = validRates && baseRuntime !== null ? safeMultiply(baseRuntime, rate.burden) : null
    const activeBurdenCost = validRates && activeRuntime !== null ? safeMultiply(activeRuntime, rate.burden) : null
    const baseTotal = baseLaborCost === null || baseBurdenCost === null ? null : safeAdd(baseLaborCost, baseBurdenCost)
    const activeTotal = activeLaborCost === null || activeBurdenCost === null ? null : safeAdd(activeLaborCost, activeBurdenCost)

    return {
      ...step,
      baseRuntime,
      activeRuntime,
      baseLaborCost,
      activeLaborCost,
      baseBurdenCost,
      activeBurdenCost,
      baseTotal,
      activeTotal,
      variance: difference(activeTotal, baseTotal)
    }
  })

  let totalBaseLabor: number | null = routing.length ? 0 : null
  let totalActiveLabor: number | null = routing.length ? 0 : null
  let totalBaseBurden: number | null = routing.length ? 0 : null
  let totalActiveBurden: number | null = routing.length ? 0 : null
  for (const row of rows) {
    totalBaseLabor = addNullable(totalBaseLabor, row.baseLaborCost)
    totalActiveLabor = addNullable(totalActiveLabor, row.activeLaborCost)
    totalBaseBurden = addNullable(totalBaseBurden, row.baseBurdenCost)
    totalActiveBurden = addNullable(totalActiveBurden, row.activeBurdenCost)
  }
  const totalBase = totalBaseLabor === null || totalBaseBurden === null ? null : safeAdd(totalBaseLabor, totalBaseBurden)
  const totalActive = totalActiveLabor === null || totalActiveBurden === null ? null : safeAdd(totalActiveLabor, totalActiveBurden)

  return {
    rows,
    totalBaseLabor,
    totalActiveLabor,
    totalBaseBurden,
    totalActiveBurden,
    totalBase,
    totalActive,
    totalVariance: difference(totalActive, totalBase)
  }
}
