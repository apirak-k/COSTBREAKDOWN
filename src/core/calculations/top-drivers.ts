import { BOMItem, RoutingStep, WorkCenterRate, CostDriver, buildDriverKey, getCostDriverImpact } from '../types'
import { safeAdd, safeDivide, safeMultiply } from '../utils/guards'
import { getFieldConfidence } from '../utils/confidence'
import { createWorkCenterRateMap, resolveWorkCenterRate } from './work-center-rate'

/**
 * Evaluates all valid BOM and Routing candidates and ranks them by cost impact.
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

  // 1. BOM Candidates
  bom.forEach(b => {
    const validInputs = [b.consumption, b.basePrice, b.activePrice, b.baseLoss, b.activeLoss]
      .every(value => Number.isFinite(value))
      && b.consumption >= 0
      && b.basePrice >= 0
      && b.activePrice >= 0
      && b.baseLoss >= -1
      && b.activeLoss >= -1
    if (!validInputs) return

    id++
    const driverKey = buildDriverKey('bom', b.id)
    const baseMatCost = safeMultiply(b.consumption, b.basePrice, 1 + b.baseLoss)
    const activeMatCost = safeMultiply(b.consumption, b.activePrice, 1 + b.activeLoss)
    const gap = baseMatCost === null || activeMatCost === null ? null : safeAdd(activeMatCost, -baseMatCost)
    if (gap === null) return

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

    const tieBreaker = gap
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
      impact: getCostDriverImpact(gap),
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
    const resolvedRate = resolveWorkCenterRate(rateMap, rt.wc)
    const r = resolvedRate.rate
    if (!r) return
    const validRate = Number.isFinite(r.labor) && Number.isFinite(r.burden) && r.labor >= 0 && r.burden >= 0
    if (resolvedRate.missing || !validRate) return

    id++
    const driverKey = buildDriverKey('routing', rt.id)

    if (![rt.manning, rt.baseCap, rt.activeCap, rt.baseYield, rt.activeYield].every(Number.isFinite)
      || rt.baseCap <= 0 || rt.activeCap <= 0 || rt.baseYield <= 0 || rt.activeYield <= 0) return
    const baseDenominator = safeMultiply(rt.baseCap, rt.baseYield)
    const activeDenominator = safeMultiply(rt.activeCap, rt.activeYield)
    const baseRuntime = baseDenominator === null ? null : safeDivide(rt.manning, baseDenominator)
    const activeRuntime = activeDenominator === null ? null : safeDivide(rt.manning, activeDenominator)
    const conversionRate = safeAdd(r.labor, r.burden)
    if (baseRuntime === null || activeRuntime === null || conversionRate === null) return

    const baseConvCost = safeMultiply(baseRuntime, conversionRate)
    const activeConvCost = safeMultiply(activeRuntime, conversionRate)
    const gap = baseConvCost === null || activeConvCost === null
      ? null
      : safeAdd(activeConvCost, -baseConvCost)
    if (gap === null) return

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
    const tieBreaker = gap
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
      impact: getCostDriverImpact(gap),
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

  // Rank every valid finding. Positive gaps lead the default view, but neutral
  // and favorable findings stay available for explicit user inspection.
  candidates.sort((a, b) => {
    const impactOrder = b.costGap - a.costGap
    return impactOrder !== 0 ? impactOrder : a.driverKey.localeCompare(b.driverKey)
  })

  const totalPositiveGap = candidates
    .filter(d => d.costGap > 0)
    .reduce((acc, d) => acc + d.costGap, 0)

  return candidates.map((d, idx) => ({
    ...d,
    impact: getCostDriverImpact(d.costGap),
    rank: idx + 1,
    pctContribution: d.costGap > 0 && totalPositiveGap > 0 ? (d.costGap / totalPositiveGap) * 100 : 0
  }))
}
