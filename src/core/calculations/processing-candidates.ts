import { CostComparison } from '../types'
import { getCanonicalComparisonStatus } from './comparison-status'
import { PrioritizationCandidate, PrioritizationStatus } from './material-candidates'

/**
 * Converts the Comparison layer's Work Center processing findings into candidates.
 * Candidate Prioritization must not calculate Routing costs or compare snapshots again.
 */
export function buildProcessingCandidates(
  comparison: CostComparison,
  controllabilityMap?: Record<string, boolean>
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
      confidence: finding.confidence
    })
  }

  return candidates
}
