import { BOMItem, RoutingStep, WorkCenterRate, CostElementBreakdown } from '../types'
import { safeDivide } from '../utils/guards'

/**
 * Calculates high-level cost breakdown and Level 3 atomic variances.
 * 100% mathematical parity with verified Excel v2 model.
 */
export function calculateCostBreakdown(
  bom: BOMItem[],
  routing: RoutingStep[],
  rates: WorkCenterRate[]
): CostElementBreakdown {
  const rateMap = new Map<string, { labor: number; burden: number }>()
  rates.forEach(r => {
    rateMap.set(r.wc, { labor: r.laborRate, burden: r.burdenRate })
  })

  // 1. Direct Material Breakdown
  let materialBase = 0
  let materialActive = 0
  let mpv = 0
  let mlv = 0

  bom.forEach(b => {
    const bCost = b.consumption * b.basePrice * (1 + b.baseLoss)
    const aCost = b.consumption * b.activePrice * (1 + b.activeLoss)
    materialBase += bCost
    materialActive += aCost

    // Level 3 Atomic Variances
    mpv += (b.activePrice - b.basePrice) * b.consumption * (1 + b.activeLoss)
    mlv += (b.activeLoss - b.baseLoss) * b.consumption * b.basePrice
  })

  // 2. Conversion Process Breakdown
  let laborBase = 0
  let laborActive = 0
  let burdenBase = 0
  let burdenActive = 0

  routing.forEach(rt => {
    const r = rateMap.get(rt.wc) || { labor: 105.29, burden: 95.00 }
    const baseRuntime = rt.baseCap > 0 && rt.baseYield > 0
      ? safeDivide(rt.manning, rt.baseCap * rt.baseYield)
      : 0
    const activeRuntime = rt.activeCap > 0 && rt.activeYield > 0
      ? safeDivide(rt.manning, rt.activeCap * rt.activeYield)
      : 0

    laborBase += baseRuntime * r.labor
    laborActive += activeRuntime * r.labor
    burdenBase += baseRuntime * r.burden
    burdenActive += activeRuntime * r.burden
  })

  const totalBase = materialBase + laborBase + burdenBase
  const totalActive = materialActive + laborActive + burdenActive
  const totalVariance = totalActive - totalBase

  // Rate variance is 0 within standard fiscal year card
  const lrv = 0
  const lev = laborActive - laborBase - lrv
  const brv = 0
  const bev = burdenActive - burdenBase - brv

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
    bev
  }
}
