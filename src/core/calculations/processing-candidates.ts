import {
  CostSnapshot,
  CostComparison,
  SnapshotRoutingStep,
  SnapshotWorkCenterRate
} from '../types'
import { calculateSnapshotRoutingDetail } from './snapshot-routing-detail'
import { PrioritizationCandidate, PrioritizationStatus } from './material-candidates'

function normalizeKey(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? ''
}

function addCost(total: number | null, value: number | null): number | null {
  return total === null || value === null ? null : total + value
}

function routingSignature(steps: SnapshotRoutingStep[]): string {
  const signatures = steps.map(step => JSON.stringify([
    normalizeKey(step.operationCode),
    normalizeKey(step.processCode),
    step.processName,
    step.sequence,
    normalizeKey(step.workCenterId),
    step.manning,
    step.capacity,
    step.yield
  ])).sort((left, right) => left.localeCompare(right))
  return JSON.stringify(signatures)
}

/**
 * Builds Processing Candidates aggregated by Work Center.
 * Section 5 of CANDIDATE_PRIORITIZATION_SPEC.md:
 * - Routing cost -> Work Center reference/rates -> Aggregate by Work Center -> Compare Reference vs Current by Work Center.
 * - Does not require 1-to-1 Routing matching or manual split/merge mapping.
 * - Reference and Current processing costs aggregate by Work Center and use Current - Reference.
 * - Different Routing structures can still produce one Work Center candidate.
 * - Candidate statuses: CHANGED, ADDED, REMOVED.
 */
export function buildProcessingCandidates(
  _comparison: CostComparison,
  referenceSnapshot: CostSnapshot,
  currentSnapshot: CostSnapshot,
  controllabilityMap?: Record<string, boolean>
): PrioritizationCandidate[] {
  // Aggregate Routing costs by Work Center for Reference
  const refWcCosts = new Map<string, { labor: number | null; burden: number | null; total: number | null; steps: SnapshotRoutingStep[] }>()
  for (const step of referenceSnapshot.routing) {
    const wcKey = normalizeKey(step.workCenterId)
    if (!wcKey) continue
    const detail = calculateSnapshotRoutingDetail(
      { reference: step },
      referenceSnapshot.rates,
      currentSnapshot.rates
    )
    const labor = detail.referenceLaborCost
    const burden = detail.referenceBurdenCost
    const total = detail.referenceTotal

    const currentAggr = refWcCosts.get(wcKey) ?? { labor: 0, burden: 0, total: 0, steps: [] }
    currentAggr.labor = addCost(currentAggr.labor, labor)
    currentAggr.burden = addCost(currentAggr.burden, burden)
    currentAggr.total = addCost(currentAggr.total, total)
    currentAggr.steps.push(step)
    refWcCosts.set(wcKey, currentAggr)
  }

  // Aggregate Routing costs by Work Center for Current
  const curWcCosts = new Map<string, { labor: number | null; burden: number | null; total: number | null; steps: SnapshotRoutingStep[] }>()
  for (const step of currentSnapshot.routing) {
    const wcKey = normalizeKey(step.workCenterId)
    if (!wcKey) continue
    const detail = calculateSnapshotRoutingDetail(
      { current: step },
      referenceSnapshot.rates,
      currentSnapshot.rates
    )
    const labor = detail.currentLaborCost
    const burden = detail.currentBurdenCost
    const total = detail.currentTotal

    const currentAggr = curWcCosts.get(wcKey) ?? { labor: 0, burden: 0, total: 0, steps: [] }
    currentAggr.labor = addCost(currentAggr.labor, labor)
    currentAggr.burden = addCost(currentAggr.burden, burden)
    currentAggr.total = addCost(currentAggr.total, total)
    currentAggr.steps.push(step)
    curWcCosts.set(wcKey, currentAggr)
  }

  // Work Center Rate lookup to get descriptive codes / descriptions
  const refRateMap = new Map<string, SnapshotWorkCenterRate>(
    referenceSnapshot.rates.map(r => [normalizeKey(r.workCenterCode), r])
  )
  const curRateMap = new Map<string, SnapshotWorkCenterRate>(
    currentSnapshot.rates.map(r => [normalizeKey(r.workCenterCode), r])
  )

  // Collect all unique Work Center keys
  const allWcKeys = new Set<string>([...refWcCosts.keys(), ...curWcCosts.keys()])
  const candidates: PrioritizationCandidate[] = []

  for (const wcKey of allWcKeys) {
    const refData = refWcCosts.get(wcKey)
    const curData = curWcCosts.get(wcKey)

    const hasRef = refData !== undefined && refData.steps.length > 0
    const hasCur = curData !== undefined && curData.steps.length > 0

    let status: PrioritizationStatus
    let referenceCost: number | null
    let currentCost: number | null

    if (hasCur && !hasRef) {
      status = 'ADDED'
      referenceCost = 0
      currentCost = curData!.total
    } else if (hasRef && !hasCur) {
      status = 'REMOVED'
      referenceCost = refData!.total
      currentCost = 0
    } else if (hasRef && hasCur) {
      referenceCost = refData!.total
      currentCost = curData!.total
      const costGap = currentCost === null || referenceCost === null ? null : currentCost - referenceCost
      const sameRoutingData = routingSignature(refData!.steps) === routingSignature(curData!.steps)
      const referenceRate = refRateMap.get(wcKey)
      const currentRate = curRateMap.get(wcKey)
      const sameRate = Boolean(referenceRate) === Boolean(currentRate)
        && (!referenceRate || !currentRate || (
          referenceRate.laborRate === currentRate.laborRate
          && referenceRate.burdenRate === currentRate.burdenRate
        ))
      if (sameRoutingData && sameRate && (costGap === null || Math.abs(costGap) < 0.0001)) continue
      status = 'CHANGED'
    } else {
      continue
    }

    const costGap = currentCost === null || referenceCost === null ? null : currentCost - referenceCost
    const candidateKey = `wc:${wcKey}`
    const rateInfo = curRateMap.get(wcKey) || refRateMap.get(wcKey)
    const wcCode = rateInfo?.workCenterCode || wcKey.toUpperCase()
    const wcDesc = rateInfo?.description ? ` (${rateInfo.description})` : ''

    const controllable = controllabilityMap?.[candidateKey] ?? true

    candidates.push({
      candidateKey,
      candidateName: `Work Center ${wcCode}${wcDesc}`,
      category: 'Processing Cost',
      factor: 'Work Center Aggregation',
      status,
      referenceCost,
      currentCost,
      costGap,
      controllable,
      rank: 0,
      sourceType: 'work-center',
      sourceId: rateInfo?.id || wcKey,
      sourceRef: rateInfo?.sourceRef || currentSnapshot.sourceRef || referenceSnapshot.sourceRef,
      confidence: 'verified'
    })
  }

  return candidates
}
