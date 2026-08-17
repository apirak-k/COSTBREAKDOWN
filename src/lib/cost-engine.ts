import { WorkCenterRate, BOMItem, RoutingStep, CostElementBreakdown, CostDriver } from './types'

export function calculateCostBreakdown(
  bom: BOMItem[],
  routing: RoutingStep[],
  rates: WorkCenterRate[]
): CostElementBreakdown {
  const rateMap = new Map<string, { labor: number; burden: number }>()
  rates.forEach(r => {
    rateMap.set(r.wc, { labor: r.laborRate, burden: r.burdenRate })
  })

  // 1. BOM Material
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

  // 2. Conversion Process
  let laborBase = 0
  let laborActive = 0
  let burdenBase = 0
  let burdenActive = 0

  routing.forEach(rt => {
    const r = rateMap.get(rt.wc) || { labor: 102.90, burden: 79.66 }
    const baseRuntime = rt.baseCap > 0 && rt.baseYield > 0 ? rt.manning / (rt.baseCap * rt.baseYield) : 0
    const activeRuntime = rt.activeCap > 0 && rt.activeYield > 0 ? rt.manning / (rt.activeCap * rt.activeYield) : 0

    laborBase += baseRuntime * r.labor
    laborActive += activeRuntime * r.labor
    burdenBase += baseRuntime * r.burden
    burdenActive += activeRuntime * r.burden
  })

  const totalBase = materialBase + laborBase + burdenBase
  const totalActive = materialActive + laborActive + burdenActive
  const totalVariance = totalActive - totalBase

  // Derive LRV/LV and BRV/BV from actual calculations (no more hardcoded values)
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

/**
 * Mirrors the _CALC_ENGINE sheet logic exactly.
 * IDs 1–(bom.length) = BOM candidates, IDs (bom.length+1)–55 = Routing candidates.
 * Tie-breaker: score = costGap + (55 - id) * 0.00000001
 * Only positive-gap drivers appear in Top 10.
 */
export function calculateTopDrivers(
  bom: BOMItem[],
  routing: RoutingStep[],
  rates: WorkCenterRate[],
  savedDrivers: CostDriver[] = []
): CostDriver[] {
  const rateMap = new Map<string, { labor: number; burden: number }>()
  rates.forEach(r => {
    rateMap.set(r.wc, { labor: r.laborRate, burden: r.burdenRate })
  })

  // Build saved map keyed by driverName for preserving human-input fields
  const savedMap = new Map<string, Pick<CostDriver, 'controllability' | 'actionPlan'>>()
  savedDrivers.forEach(d => {
    savedMap.set(d.driverName, { controllability: d.controllability, actionPlan: d.actionPlan })
  })

  const candidates: CostDriver[] = []
  let id = 0

  // ── BOM candidates (IDs 1 to bom.length) ──────────────────────────────────
  bom.forEach(b => {
    id++
    const baseMatCost  = b.consumption * b.basePrice   * (1 + b.baseLoss)
    const activeMatCost = b.consumption * b.activePrice * (1 + b.activeLoss)
    const gap = activeMatCost - baseMatCost

    let rcaParameter = ''
    let baseParam: number | null = null
    let activeParam: number | null = null

    const priceChanged  = b.activePrice !== b.basePrice
    const lossChanged   = b.activeLoss  !== b.baseLoss

    if (priceChanged && lossChanged) {
      // Double variance — report dominant one (price)
      const direction = b.activePrice > b.basePrice ? 'Inflation' : 'Reduction'
      rcaParameter = `Unit Price ${direction} (${b.basePrice.toFixed(2)} → ${b.activePrice.toFixed(2)} THB)`
      baseParam  = b.basePrice
      activeParam = b.activePrice
    } else if (priceChanged) {
      const direction = b.activePrice > b.basePrice ? 'Inflation' : 'Reduction'
      rcaParameter = `Unit Price ${direction} (${b.basePrice.toFixed(2)} → ${b.activePrice.toFixed(2)} THB)`
      baseParam  = b.basePrice
      activeParam = b.activePrice
    } else if (lossChanged) {
      const direction = b.activeLoss > b.baseLoss ? 'Increase' : 'Reduction'
      rcaParameter = `Loss % ${direction} (${(b.baseLoss * 100).toFixed(1)}% → ${(b.activeLoss * 100).toFixed(1)}%)`
      baseParam  = b.baseLoss
      activeParam = b.activeLoss
    }

    const tieBreaker = gap > 0 ? gap + (55 - id) * 0.00000001 : 0
    const saved = savedMap.get(b.description) ?? { controllability: '' as const, actionPlan: '' }

    candidates.push({
      id,
      category: 'Direct Material',
      driverName: b.description,
      rcaParameter,
      baseParameter: baseParam,
      activeParameter: activeParam,
      costGap: gap,
      tieBreakerScore: tieBreaker,
      rank: 0,
      pctContribution: 0,
      controllability: saved.controllability,
      actionPlan: saved.actionPlan
    })
  })

  // ── Routing candidates (IDs bom.length+1 to 55) ────────────────────────────
  const MAX_ID = 55
  routing.forEach(rt => {
    id++
    if (id > MAX_ID) return // stay within engine bounds

    const r = rateMap.get(rt.wc) ?? { labor: 102.90, burden: 79.66 }
    const baseRuntime   = rt.baseCap   > 0 && rt.baseYield   > 0 ? rt.manning / (rt.baseCap   * rt.baseYield)   : 0
    const activeRuntime = rt.activeCap > 0 && rt.activeYield > 0 ? rt.manning / (rt.activeCap * rt.activeYield) : 0
    const baseConvCost   = baseRuntime   * (r.labor + r.burden)
    const activeConvCost = activeRuntime * (r.labor + r.burden)
    const gap = activeConvCost - baseConvCost

    let rcaParameter = ''
    let baseParam: number | null = null
    let activeParam: number | null = null

    const capChanged   = rt.activeCap   !== rt.baseCap
    const yieldChanged = rt.activeYield !== rt.baseYield

    if (capChanged && yieldChanged) {
      // Double variance — report both
      const capDir   = rt.activeCap   < rt.baseCap   ? 'Drop' : 'Improvement'
      const yieldDir = rt.activeYield < rt.baseYield ? 'Drop' : 'Improvement'
      rcaParameter = `Capacity ${capDir} (${rt.baseCap.toLocaleString()} → ${rt.activeCap.toLocaleString()} Unit/hr) + Yield ${yieldDir}`
      baseParam  = rt.baseCap
      activeParam = rt.activeCap
    } else if (capChanged) {
      const dir = rt.activeCap < rt.baseCap ? 'Drop' : 'Improvement'
      rcaParameter = `Capacity ${dir} (${rt.baseCap.toLocaleString()} → ${rt.activeCap.toLocaleString()} Unit/hr)`
      baseParam  = rt.baseCap
      activeParam = rt.activeCap
    } else if (yieldChanged) {
      const dir = rt.activeYield < rt.baseYield ? 'Drop' : 'Improvement'
      rcaParameter = `Yield ${dir} (${(rt.baseYield * 100).toFixed(1)}% → ${(rt.activeYield * 100).toFixed(1)}%)`
      baseParam  = rt.baseYield
      activeParam = rt.activeYield
    }

    // Section label: use routing section from description prefix if available (split by ' - ')
    // Fall back to WC name
    const category = rt.wc

    const tieBreaker = gap > 0 ? gap + (MAX_ID - id) * 0.00000001 : 0
    const saved = savedMap.get(rt.description) ?? { controllability: '' as const, actionPlan: '' }

    candidates.push({
      id,
      category,
      driverName: rt.description,
      rcaParameter,
      baseParameter: baseParam,
      activeParameter: activeParam,
      costGap: gap,
      tieBreakerScore: tieBreaker,
      rank: 0,
      pctContribution: 0,
      controllability: saved.controllability,
      actionPlan: saved.actionPlan
    })
  })

  // ── Rank: filter positive gaps only, sort by tieBreakerScore desc ───────────
  const positiveDrivers = candidates.filter(d => d.costGap > 0)
  positiveDrivers.sort((a, b) => b.tieBreakerScore - a.tieBreakerScore)

  const totalPositiveGap = positiveDrivers.reduce((acc, d) => acc + d.costGap, 0)

  const top10 = positiveDrivers.slice(0, 10).map((d, idx) => ({
    ...d,
    rank: idx + 1,
    pctContribution: totalPositiveGap > 0 ? (d.costGap / totalPositiveGap) * 100 : 0
  }))

  return top10
}
