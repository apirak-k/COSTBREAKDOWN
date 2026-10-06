import { CostComparison, CostSnapshot, SnapshotRoutingStep } from '../types'
import { getCanonicalComparisonStatus } from './comparison-status'
import { PrioritizationCandidate, PrioritizationStatus } from './material-candidates'
import { calculateSnapshotRoutingDetail } from './snapshot-routing-detail'

interface CandidateSnapshots {
  reference: CostSnapshot
  current: CostSnapshot
}

function normalizeKey(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? ''
}

function processDetailsForSide(
  snapshot: CostSnapshot,
  workCenterCode: string,
  side: 'reference' | 'current'
): NonNullable<PrioritizationCandidate['processBreakdown']>['reference'] {
  return snapshot.routing
    .filter(step => step.isGeneratedSizingPlaceholder !== true
      && normalizeKey(step.workCenterId) === normalizeKey(workCenterCode))
    .map((step: SnapshotRoutingStep, index) => {
      const detail = calculateSnapshotRoutingDetail(
        side === 'reference' ? { reference: step } : { current: step },
        snapshot.rates,
        snapshot.rates
      )
      const laborCost = side === 'reference' ? detail.referenceLaborCost : detail.currentLaborCost
      const burdenCost = side === 'reference' ? detail.referenceBurdenCost : detail.currentBurdenCost
      const totalCost = side === 'reference' ? detail.referenceTotal : detail.currentTotal

      return {
        id: `${step.id}:${index}`,
        processName: step.processName.trim() || 'Unnamed Process',
        manning: step.manning,
        capacity: step.capacity,
        yield: step.yield,
        laborCost,
        burdenCost,
        totalCost
      }
    })
}

/**
 * Converts the Comparison layer's Work Center processing findings into candidates.
 * Candidate Prioritization must not calculate Routing costs or compare snapshots again.
 */
export function buildProcessingCandidates(
  comparison: CostComparison,
  controllabilityMap?: Record<string, boolean>,
  snapshots?: CandidateSnapshots
): PrioritizationCandidate[] {
  const candidates: PrioritizationCandidate[] = []

  for (const finding of comparison.processingFindings ?? []) {
    const comparisonStatus = getCanonicalComparisonStatus(finding)
    if (!comparisonStatus || comparisonStatus === 'UNCHANGED') continue

    const status: PrioritizationStatus = comparisonStatus
    const candidateKey = `wc:${finding.workCenterCode.trim().toLowerCase()}`
    const workCenterDescription = finding.workCenterDescription
      ? ` (${finding.workCenterDescription})`
      : ''

    candidates.push({
      candidateKey,
      candidateName: `Work Center ${finding.workCenterCode}${workCenterDescription}`,
      category: 'Processing Cost',
      factor: 'Work Center Aggregation',
      status,
      referenceCost: finding.costEffect.reference.total,
      currentCost: finding.costEffect.current.total,
      costGap: finding.costEffect.gap.total,
      controllable: controllabilityMap?.[candidateKey] ?? true,
      rank: 0,
      sourceType: 'work-center',
      sourceId: finding.sourceId,
      sourceRef: finding.sourceRef,
      confidence: finding.confidence,
      processBreakdown: snapshots ? {
        reference: processDetailsForSide(snapshots.reference, finding.workCenterCode, 'reference'),
        current: processDetailsForSide(snapshots.current, finding.workCenterCode, 'current')
      } : undefined
    })
  }

  return candidates
}
