import { BOMItem, RoutingStep, WorkCenterRate, BOMDetailedRow, RoutingDetailedRow } from '../types'
import { safeDivide } from '../utils/guards'

/**
 * Computes row-by-row BOM material breakdown metrics.
 */
export function calculateBOMDetailedRows(bom: BOMItem[]): {
  rows: BOMDetailedRow[]
  totalBase: number
  totalActive: number
  totalVariance: number
  totalMPV: number
  totalMLV: number
} {
  let totalBase = 0
  let totalActive = 0
  let totalMPV = 0
  let totalMLV = 0

  const rows: BOMDetailedRow[] = bom.map(b => {
    const baseCost = b.consumption * b.basePrice * (1 + b.baseLoss)
    const activeCost = b.consumption * b.activePrice * (1 + b.activeLoss)
    const variance = activeCost - baseCost
    const mpv = (b.activePrice - b.basePrice) * b.consumption * (1 + b.activeLoss)
    const mlv = (b.activeLoss - b.baseLoss) * b.consumption * b.basePrice

    totalBase += baseCost
    totalActive += activeCost
    totalMPV += mpv
    totalMLV += mlv

    return {
      ...b,
      baseCost,
      activeCost,
      variance,
      mpv,
      mlv
    }
  })

  return {
    rows,
    totalBase,
    totalActive,
    totalVariance: totalActive - totalBase,
    totalMPV,
    totalMLV
  }
}

/**
 * Computes row-by-row Routing conversion breakdown metrics.
 */
export function calculateRoutingDetailedRows(
  routing: RoutingStep[],
  rates: WorkCenterRate[]
): {
  rows: RoutingDetailedRow[]
  totalBaseLabor: number
  totalActiveLabor: number
  totalBaseBurden: number
  totalActiveBurden: number
  totalBase: number
  totalActive: number
  totalVariance: number
} {
  const rateMap = new Map<string, { labor: number; burden: number }>()
  rates.forEach(r => rateMap.set(r.wc, { labor: r.laborRate, burden: r.burdenRate }))

  let totalBaseLabor = 0
  let totalActiveLabor = 0
  let totalBaseBurden = 0
  let totalActiveBurden = 0

  const rows: RoutingDetailedRow[] = routing.map(rt => {
    const r = rateMap.get(rt.wc) || { labor: 105.29, burden: 95.00 }
    const baseRuntime = rt.baseCap > 0 && rt.baseYield > 0
      ? safeDivide(rt.manning, rt.baseCap * rt.baseYield)
      : 0
    const activeRuntime = rt.activeCap > 0 && rt.activeYield > 0
      ? safeDivide(rt.manning, rt.activeCap * rt.activeYield)
      : 0

    const baseLaborCost = baseRuntime * r.labor
    const activeLaborCost = activeRuntime * r.labor
    const baseBurdenCost = baseRuntime * r.burden
    const activeBurdenCost = activeRuntime * r.burden

    const baseTotal = baseLaborCost + baseBurdenCost
    const activeTotal = activeLaborCost + activeBurdenCost
    const variance = activeTotal - baseTotal

    totalBaseLabor += baseLaborCost
    totalActiveLabor += activeLaborCost
    totalBaseBurden += baseBurdenCost
    totalActiveBurden += activeBurdenCost

    return {
      ...rt,
      baseRuntime,
      activeRuntime,
      baseLaborCost,
      activeLaborCost,
      baseBurdenCost,
      activeBurdenCost,
      baseTotal,
      activeTotal,
      variance
    }
  })

  const totalBase = totalBaseLabor + totalBaseBurden
  const totalActive = totalActiveLabor + totalActiveBurden

  return {
    rows,
    totalBaseLabor,
    totalActiveLabor,
    totalBaseBurden,
    totalActiveBurden,
    totalBase,
    totalActive,
    totalVariance: totalActive - totalBase
  }
}
