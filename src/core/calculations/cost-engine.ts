import { BOMItem, RoutingStep, WorkCenterRate, CostElementBreakdown } from '../types'
import { safeAdd, safeDivide, safeMultiply } from '../utils/guards'
import { createWorkCenterRateMap, resolveWorkCenterRate } from './work-center-rate'

function addNullable(total: number | null, value: number | null): number | null {
  return total === null || value === null ? null : safeAdd(total, value)
}

function difference(after: number | null, before: number | null): number | null {
  return after === null || before === null ? null : safeAdd(after, -before)
}

function sumComponents(...values: Array<number | null>): number | null {
  if (values.some(value => value === null)) return null
  return safeAdd(...values as number[])
}

function routingRuntime(manning: number, capacity: number, yieldValue: number): number | null {
  if (![manning, capacity, yieldValue].every(Number.isFinite) || capacity <= 0 || yieldValue <= 0) return null
  const denominator = safeMultiply(capacity, yieldValue)
  return denominator === null ? null : safeDivide(manning, denominator)
}

/** Calculates the legacy single-session view without replacing unavailable inputs with zero. */
export function calculateCostBreakdown(
  bom: BOMItem[],
  routing: RoutingStep[],
  rates: WorkCenterRate[]
): CostElementBreakdown {
  const rateMap = createWorkCenterRateMap(rates)
  const missingWorkCenters = new Set<string>()

  let materialBase: number | null = bom.length ? 0 : null
  let materialActive: number | null = bom.length ? 0 : null
  let mpv: number | null = bom.length ? 0 : null
  let mlv: number | null = bom.length ? 0 : null

  bom.forEach(item => {
    const valid = [item.consumption, item.basePrice, item.activePrice, item.baseLoss, item.activeLoss]
      .every(Number.isFinite)
    if (!valid) {
      materialBase = materialActive = mpv = mlv = null
      return
    }
    const baseLossFactor = safeAdd(1, item.baseLoss)
    const activeLossFactor = safeAdd(1, item.activeLoss)
    const baseCost = baseLossFactor === null ? null : safeMultiply(item.consumption, item.basePrice, baseLossFactor)
    const activeCost = activeLossFactor === null ? null : safeMultiply(item.consumption, item.activePrice, activeLossFactor)
    const priceDelta = safeAdd(item.activePrice, -item.basePrice)
    const lossDelta = safeAdd(item.activeLoss, -item.baseLoss)
    const priceVariance = priceDelta === null || activeLossFactor === null
      ? null
      : safeMultiply(priceDelta, item.consumption, activeLossFactor)
    const lossVariance = lossDelta === null ? null : safeMultiply(lossDelta, item.consumption, item.basePrice)
    materialBase = addNullable(materialBase, baseCost)
    materialActive = addNullable(materialActive, activeCost)
    mpv = addNullable(mpv, priceVariance)
    mlv = addNullable(mlv, lossVariance)
  })

  let laborBase: number | null = routing.length ? 0 : null
  let laborActive: number | null = routing.length ? 0 : null
  let burdenBase: number | null = routing.length ? 0 : null
  let burdenActive: number | null = routing.length ? 0 : null

  routing.forEach(step => {
    const resolvedRate = resolveWorkCenterRate(rateMap, step.wc)
    if (resolvedRate.missing) missingWorkCenters.add(resolvedRate.workCenterKey)
    const rate = resolvedRate.rate
    const baseRuntime = routingRuntime(step.manning, step.baseCap, step.baseYield)
    const activeRuntime = routingRuntime(step.manning, step.activeCap, step.activeYield)
    if (!rate
      || !Number.isFinite(rate.labor) || !Number.isFinite(rate.burden)
      || baseRuntime === null || activeRuntime === null) {
      laborBase = laborActive = burdenBase = burdenActive = null
      return
    }

    laborBase = addNullable(laborBase, safeMultiply(baseRuntime, rate.labor))
    laborActive = addNullable(laborActive, safeMultiply(activeRuntime, rate.labor))
    burdenBase = addNullable(burdenBase, safeMultiply(baseRuntime, rate.burden))
    burdenActive = addNullable(burdenActive, safeMultiply(activeRuntime, rate.burden))
  })

  const totalBase = sumComponents(materialBase, laborBase, burdenBase)
  const totalActive = sumComponents(materialActive, laborActive, burdenActive)
  const totalVariance = difference(totalActive, totalBase)
  const lrv = 0
  const lev = difference(difference(laborActive, laborBase), lrv)
  const brv = 0
  const bev = difference(difference(burdenActive, burdenBase), brv)

  return {
    materialBase,
    materialActive,
    laborBase,
    laborActive,
    burdenBase,
    burdenActive,
    totalBase,
    totalActive,
    totalVariance,
    mpv,
    mlv,
    lrv,
    lev,
    brv,
    bev,
    missingWorkCenters: [...missingWorkCenters]
  }
}
