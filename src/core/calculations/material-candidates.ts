import {
  CostSnapshot,
  CostComparison,
  SnapshotBOMItem,
  DataConfidence
} from '../types'
import { getCanonicalComparisonStatus } from './comparison-status'

export type PrioritizationStatus = 'CHANGED' | 'ADDED' | 'REMOVED'

export interface CandidateChangeDetail {
  field: string
  reference: unknown
  current: unknown
}

export interface CandidateProcessDetail {
  id: string
  processName: string
  manning: number | null
  capacity: number | null
  yield: number | null
  laborCost: number | null
  burdenCost: number | null
  totalCost: number | null
}

export interface CandidateProcessBreakdown {
  reference: CandidateProcessDetail[]
  current: CandidateProcessDetail[]
}

export interface PrioritizationCandidate {
  candidateKey: string
  candidateName: string
  category: string
  factor?: string
  status: PrioritizationStatus
  referenceCost: number | null
  currentCost: number | null
  costGap: number | null
  controllable: boolean
  rank: number
  sourceType: 'bom' | 'work-center'
  sourceId: string
  sourceRef?: string
  confidence?: DataConfidence
  changeDetails?: CandidateChangeDetail[]
  processBreakdown?: CandidateProcessBreakdown
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase()
}

function candidateFieldLabel(field: string): string {
  if (field === 'consumption') return 'Usage'
  if (field === 'price') return 'Price'
  if (field === 'loss') return 'Loss'
  return field
    .replace(/^additionalFields\./, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/^./, character => character.toUpperCase())
}

/**
 * Builds Material Candidates from Cost Comparison findings.
 * Section 4 of CANDIDATE_PRIORITIZATION_SPEC.md:
 * - Material candidates come from meaningful material changes identified by the comparison layer.
 * - Price, Loss, and Usage changes can appear as separate factor candidates or distinct material candidates.
 * - Added and Removed material findings retain their structural status and Reference/Current costs.
 * - Unchanged material rows do not become candidates.
 * - Gap = Current - Reference.
 */
export function buildMaterialCandidates(
  comparison: CostComparison,
  referenceSnapshot: CostSnapshot,
  currentSnapshot: CostSnapshot,
  controllabilityMap?: Record<string, boolean>
): PrioritizationCandidate[] {
  const refBomById = new Map<string, SnapshotBOMItem>(
    referenceSnapshot.bom.map(item => [item.id, item])
  )
  const curBomById = new Map<string, SnapshotBOMItem>(
    currentSnapshot.bom.map(item => [item.id, item])
  )

  const candidates: PrioritizationCandidate[] = []

  for (const finding of comparison.bomFindings) {
    const canonicalStatus = getCanonicalComparisonStatus(finding)
    // Section 6: UNCHANGED does not belong on Candidate Prioritization page
    if (canonicalStatus === null || canonicalStatus === 'UNCHANGED') continue

    const status: PrioritizationStatus = canonicalStatus // CHANGED | ADDED | REMOVED
    const refItem = finding.referenceId ? refBomById.get(finding.referenceId) : undefined
    const curItem = finding.currentId ? curBomById.get(finding.currentId) : undefined
    const materialName = curItem?.description.trim() || refItem?.description.trim() || ''
    if (!materialName) continue

    const referenceCost = finding.costEffect?.reference.material ?? null
    const currentCost = finding.costEffect?.current.material ?? null
    const materialGap = finding.costEffect?.gap.material ?? null

    const baseKey = `mat:${normalizeKey(materialName)}`
    const controllable = controllabilityMap?.[baseKey] ?? true
    const changeDetails = Object.entries(finding.fieldDiffs).map(([field, values]) => ({
      field: candidateFieldLabel(field),
      reference: values.reference,
      current: values.current
    }))

    if (status === 'ADDED') {
      candidates.push({
        candidateKey: baseKey,
        candidateName: materialName,
        category: 'Direct Material',
        factor: 'Item Added',
        status: 'ADDED',
        referenceCost: 0,
        currentCost,
        costGap: materialGap,
        controllable,
        rank: 0,
        sourceType: 'bom',
        sourceId: curItem?.id || finding.currentId || baseKey,
        sourceRef: curItem?.sourceRef || currentSnapshot.sourceRef,
        confidence: curItem?.confidence ? 'verified' : 'estimated'
      })
      continue
    }

    if (status === 'REMOVED') {
      candidates.push({
        candidateKey: baseKey,
        candidateName: materialName,
        category: 'Direct Material',
        factor: 'Item Removed',
        status: 'REMOVED',
        referenceCost,
        currentCost: 0,
        costGap: materialGap,
        controllable,
        rank: 0,
        sourceType: 'bom',
        sourceId: refItem?.id || finding.referenceId || baseKey,
        sourceRef: refItem?.sourceRef || referenceSnapshot.sourceRef,
        confidence: refItem?.confidence ? 'verified' : 'estimated'
      })
      continue
    }

    candidates.push({
      candidateKey: baseKey,
      candidateName: materialName,
      category: 'Direct Material',
      factor: 'Record cost',
      status: 'CHANGED',
      referenceCost,
      currentCost,
      costGap: materialGap,
      controllable,
      rank: 0,
      sourceType: 'bom',
      sourceId: curItem?.id || finding.currentId || finding.referenceId || baseKey,
      sourceRef: curItem?.sourceRef || currentSnapshot.sourceRef,
      confidence: 'verified',
      changeDetails
    })
  }

  return candidates
}
