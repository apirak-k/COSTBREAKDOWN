import {
  CostSnapshot,
  CostComparison,
  buildMaterialCandidates,
  buildProcessingCandidates,
  PrioritizationCandidate,
  PrioritizationStatus
} from '../index'

export interface CandidatePrioritizationResult {
  candidates: PrioritizationCandidate[]
  totalCandidateGap: number
}

/**
 * Builds all candidates (Material and Processing by Work Center) from comparison findings.
 * Section 11 & 14 of CANDIDATE_PRIORITIZATION_SPEC.md:
 * - Material: material-level changed findings
 * - Processing: Routing cost aggregated by Work Center
 * - Candidate statuses: CHANGED, ADDED, REMOVED
 * - Controllable starts explicitly true
 * - Sorted by Gap descending by default (+Gap -> -Gap)
 * - Negative and zero Gap candidates remain visible
 */
export function buildPrioritizationCandidates(
  comparison: CostComparison,
  referenceSnapshot: CostSnapshot,
  currentSnapshot: CostSnapshot,
  controllabilityMap?: Record<string, boolean>
): PrioritizationCandidate[] {
  const materialCandidates = buildMaterialCandidates(
    comparison,
    referenceSnapshot,
    currentSnapshot,
    controllabilityMap
  )

  const processingCandidates = buildProcessingCandidates(
    comparison,
    referenceSnapshot,
    currentSnapshot,
    controllabilityMap
  )

  const all = [...materialCandidates, ...processingCandidates]

  // Default sorting: Highest Gap -> Lowest Gap (Gap descending)
  all.sort((a, b) => {
    const gapDiff = (b.costGap ?? Number.NEGATIVE_INFINITY) - (a.costGap ?? Number.NEGATIVE_INFINITY)
    if (Math.abs(gapDiff) > 0.00001) return gapDiff
    return a.candidateKey.localeCompare(b.candidateKey)
  })

  // Assign 1-based ranks
  return all.map((c, index) => ({
    ...c,
    rank: index + 1
  }))
}

export type CandidateStatusFilter = readonly PrioritizationStatus[]

export function filterPrioritizationCandidates(
  candidates: PrioritizationCandidate[],
  statusFilter: CandidateStatusFilter
): PrioritizationCandidate[] {
  return candidates.filter(candidate => statusFilter.includes(candidate.status))
}
