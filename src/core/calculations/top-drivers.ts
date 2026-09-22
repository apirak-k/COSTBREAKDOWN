import { BOMItem, RoutingStep, WorkCenterRate, CostDriver, buildDriverKey } from '../types'
import { safeDivide } from '../utils/guards'
import { getFieldConfidence } from '../utils/confidence'
import { createWorkCenterRateMap, resolveWorkCenterRate } from './work-center-rate'

/**
 * Evaluates all BOM and Routing candidates and ranks the Top 10 positive cost drivers.
 * Stage 1 (System Auto-Calculation): Ranked by Cost Impact (Cost Gap).
 * Stage 2 (Human RCA Checklist): Can Influence + Requirement Fit + Action Plan.
 * Includes Data Confidence warning tag if underlying inputs are estimated.
 */
export function calculateTopDrivers(
  bom: BOMItem[],
  routing: RoutingStep[],
  rates: WorkCenterRate[],
  savedDrivers: CostDriver[] = []
): CostDriver[] {
  const rateMap = createWorkCenterRateMap(rates)

  // Build maps of saved user annotations. New records use driverKey; the name map
  // is retained only to migrate annotations written before stable identity existed.
  const savedMap = new Map<string, Pick<CostDriver, 'controllability' | 'actionPlan' | 'canInfluence' | 'requirementFit'>>()
  const legacySavedMap = new Map<string, Pick<CostDriver, 'controllability' | 'actionPlan' | 'canInfluence' | 'requirementFit'>>()
  savedDrivers.forEach(d => {
    const annotations = {
      controllability: d.controllability,
      actionPlan: d.actionPlan,
      canInfluence: d.canInfluence,
      requirementFit: d.requirementFit
    }
    if (d.driverKey) savedMap.set(d.driverKey, annotations)
    legacySavedMap.set(d.driverName, annotations)
  })

  const candidates: CostDriver[] = []
  let id = 0

  const totalCandidates = Math.max(55, bom.length + routing.length)

  // 1. BOM Candidates
  bom.forEach(b => {
    id++
    const driverKey = buildDriverKey('bom', b.id)
    const baseMatCost = b.consumption * b.basePrice * (1 + b.baseLoss)
    const activeMatCost = b.consumption * b.activePrice * (1 + b.activeLoss)
    const gap = activeMatCost - baseMatCost

    let rcaParameter = ''
    let baseParam: number | null = null
    let activeParam: number | null = null

    const priceChanged = b.activePrice !== b.basePrice
    const lossChanged = b.activeLoss !== b.baseLoss

    if (priceChanged && lossChanged) {
      const direction = b.activePrice > b.basePrice ? 'Inflation' : 'Reduction'
      rcaParameter = `Unit Price ${direction} (${b.basePrice.toFixed(2)} → ${b.activePrice.toFixed(2)} THB)`
      baseParam = b.basePrice
      activeParam = b.activePrice
    } else if (priceChanged) {
      const direction = b.activePrice > b.basePrice ? 'Inflation' : 'Reduction'
      rcaParameter = `Unit Price ${direction} (${b.basePrice.toFixed(2)} → ${b.activePrice.toFixed(2)} THB)`
      baseParam = b.basePrice
      activeParam = b.activePrice
    } else if (lossChanged) {
      const direction = b.activeLoss > b.baseLoss ? 'Increase' : 'Reduction'
      rcaParameter = `Loss % ${direction} (${(b.baseLoss * 100).toFixed(1)}% → ${(b.activeLoss * 100).toFixed(1)}%)`
      baseParam = b.baseLoss
      activeParam = b.activeLoss
    }

    const tieBreaker = gap > 0 ? gap + (totalCandidates - id) * 0.00000001 : 0
    const saved = savedMap.get(driverKey) ?? legacySavedMap.get(b.description) ?? {
      controllability: '' as const,
      actionPlan: '',
      canInfluence: true,
      requirementFit: true
    }

    const driverConfidence = getFieldConfidence(b.activePrice, b.sourceRef)

    candidates.push({
      driverKey,
      sourceType: 'bom',
      sourceId: b.id,
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
      actionPlan: saved.actionPlan,
      canInfluence: saved.canInfluence ?? (saved.controllability === 'Controllable'),
      requirementFit: saved.requirementFit ?? true,
      confidence: driverConfidence,
      sourceRef: b.sourceRef
    })
  })

  // 2. Routing Candidates
  routing.forEach(rt => {
    id++
    const driverKey = buildDriverKey('routing', rt.id)

    const r = resolveWorkCenterRate(rateMap, rt.wc).rate
    const baseRuntime = rt.baseCap > 0 && rt.baseYield > 0
      ? safeDivide(rt.manning, rt.baseCap * rt.baseYield)
      : 0
    const activeRuntime = rt.activeCap > 0 && rt.activeYield > 0
      ? safeDivide(rt.manning, rt.activeCap * rt.activeYield)
      : 0

    const baseConvCost = baseRuntime * (r.labor + r.burden)
    const activeConvCost = activeRuntime * (r.labor + r.burden)
    const gap = activeConvCost - baseConvCost

    let rcaParameter = ''
    let baseParam: number | null = null
    let activeParam: number | null = null

    const capChanged = rt.activeCap !== rt.baseCap
    const yieldChanged = rt.activeYield !== rt.baseYield

    if (capChanged && yieldChanged) {
      const capDir = rt.activeCap < rt.baseCap ? 'Drop' : 'Improvement'
      const yieldDir = rt.activeYield < rt.baseYield ? 'Drop' : 'Improvement'
      rcaParameter = `Capacity ${capDir} (${rt.baseCap.toLocaleString()} → ${rt.activeCap.toLocaleString()} Unit/hr) + Yield ${yieldDir}`
      baseParam = rt.baseCap
      activeParam = rt.activeCap
    } else if (capChanged) {
      const dir = rt.activeCap < rt.baseCap ? 'Drop' : 'Improvement'
      rcaParameter = `Capacity ${dir} (${rt.baseCap.toLocaleString()} → ${rt.activeCap.toLocaleString()} Unit/hr)`
      baseParam = rt.baseCap
      activeParam = rt.activeCap
    } else if (yieldChanged) {
      const dir = rt.activeYield < rt.baseYield ? 'Drop' : 'Improvement'
      rcaParameter = `Yield ${dir} (${(rt.baseYield * 100).toFixed(1)}% → ${(rt.activeYield * 100).toFixed(1)}%)`
      baseParam = rt.baseYield
      activeParam = rt.activeYield
    }

    const category = rt.wc
    const tieBreaker = gap > 0 ? gap + (totalCandidates - id) * 0.00000001 : 0
    const saved = savedMap.get(driverKey) ?? legacySavedMap.get(rt.description) ?? {
      controllability: '' as const,
      actionPlan: '',
      canInfluence: true,
      requirementFit: true
    }

    const driverConfidence = getFieldConfidence(rt.activeYield, rt.sourceRef)

    candidates.push({
      driverKey,
      sourceType: 'routing',
      sourceId: rt.id,
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
      actionPlan: saved.actionPlan,
      canInfluence: saved.canInfluence ?? (saved.controllability === 'Controllable'),
      requirementFit: saved.requirementFit ?? true,
      confidence: driverConfidence,
      sourceRef: rt.sourceRef
    })
  })

  // Rank: Filter positive gaps only, sort by tieBreakerScore DESC, take Top 10
  const positiveDrivers = candidates.filter(d => d.costGap > 0)
  positiveDrivers.sort((a, b) => b.tieBreakerScore - a.tieBreakerScore)

  const totalPositiveGap = positiveDrivers.reduce((acc, d) => acc + d.costGap, 0)

  return positiveDrivers.slice(0, 10).map((d, idx) => ({
    ...d,
    rank: idx + 1,
    pctContribution: totalPositiveGap > 0 ? (d.costGap / totalPositiveGap) * 100 : 0
  }))
}
