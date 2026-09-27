import {
  CostSnapshot,
  CostComparison,
  SnapshotBOMItem,
  DataConfidence
} from '../types'
import { getCanonicalComparisonStatus } from './comparison-status'
import { calculateSnapshotBOMDetail } from './snapshot-bom-detail'

export type PrioritizationStatus = 'CHANGED' | 'ADDED' | 'REMOVED'

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
  // Optional drill-down info
  referenceParam?: number | null
  currentParam?: number | null
  paramLabel?: string
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
    const detail = calculateSnapshotBOMDetail({ reference: refItem, current: curItem })

    const itemCode = curItem?.itemCode || refItem?.itemCode || finding.currentId || finding.referenceId || 'UNKNOWN'
    const itemDesc = curItem?.description || refItem?.description || itemCode

    const referenceCost = detail.referenceCost
    const currentCost = detail.currentCost
    const netGap = currentCost === null || referenceCost === null ? null : currentCost - referenceCost

    const baseKey = `mat:${itemCode}`
    const controllable = controllabilityMap?.[baseKey] ?? true

    if (status === 'ADDED') {
      candidates.push({
        candidateKey: baseKey,
        candidateName: `${itemCode} — ${itemDesc}`,
        category: 'Direct Material',
        factor: 'Item Added',
        status: 'ADDED',
        referenceCost: 0,
        currentCost,
        costGap: currentCost,
        controllable,
        rank: 0,
        sourceType: 'bom',
        sourceId: curItem?.id || finding.currentId || itemCode,
        sourceRef: curItem?.sourceRef || currentSnapshot.sourceRef,
        confidence: curItem?.confidence ? 'verified' : 'estimated'
      })
      continue
    }

    if (status === 'REMOVED') {
      candidates.push({
        candidateKey: baseKey,
        candidateName: `${itemCode} — ${itemDesc}`,
        category: 'Direct Material',
        factor: 'Item Removed',
        status: 'REMOVED',
        referenceCost,
        currentCost: 0,
        costGap: referenceCost === null ? null : -referenceCost,
        controllable,
        rank: 0,
        sourceType: 'bom',
        sourceId: refItem?.id || finding.referenceId || itemCode,
        sourceRef: refItem?.sourceRef || referenceSnapshot.sourceRef,
        confidence: refItem?.confidence ? 'verified' : 'estimated'
      })
      continue
    }

    // status === 'CHANGED'
    // Check individual factors: Price, Loss, Usage
    const priceChanged = refItem?.price !== null && refItem?.price !== undefined && curItem?.price !== null && curItem?.price !== undefined && refItem.price !== curItem.price
    const lossChanged = refItem?.loss !== null && refItem?.loss !== undefined && curItem?.loss !== null && curItem?.loss !== undefined && refItem.loss !== curItem.loss
    const usageChanged = refItem?.consumption !== null && refItem?.consumption !== undefined && curItem?.consumption !== null && curItem?.consumption !== undefined && refItem.consumption !== curItem.consumption

    let factorCount = (priceChanged ? 1 : 0) + (lossChanged ? 1 : 0) + (usageChanged ? 1 : 0)

    // If multiple factors changed, provide factor candidates or a unified candidate with factor details
    if (factorCount > 1 && refItem && curItem) {
      if (priceChanged && refItem.price !== null && curItem.price !== null && curItem.consumption !== null && curItem.loss !== null) {
        const factorKey = `${baseKey}:price`
        const priceVariance = (curItem.price - refItem.price) * curItem.consumption * (1 + curItem.loss)
        candidates.push({
          candidateKey: factorKey,
          candidateName: `${itemCode} — ${itemDesc} (Price Change)`,
          category: 'Direct Material',
          factor: 'Price',
          status: 'CHANGED',
          referenceCost: refItem.price,
          currentCost: curItem.price,
          costGap: priceVariance,
          controllable: controllabilityMap?.[factorKey] ?? true,
          rank: 0,
          sourceType: 'bom',
          sourceId: curItem.id,
          sourceRef: curItem.sourceRef,
          confidence: 'verified',
          paramLabel: 'Price (THB)',
          referenceParam: refItem.price,
          currentParam: curItem.price
        })
      }
      if (lossChanged && refItem.loss !== null && curItem.loss !== null && refItem.price !== null && curItem.consumption !== null) {
        const factorKey = `${baseKey}:loss`
        const lossVariance = refItem.price * curItem.consumption * (curItem.loss - refItem.loss)
        candidates.push({
          candidateKey: factorKey,
          candidateName: `${itemCode} — ${itemDesc} (Loss % Change)`,
          category: 'Direct Material',
          factor: 'Loss %',
          status: 'CHANGED',
          referenceCost: refItem.loss,
          currentCost: curItem.loss,
          costGap: lossVariance,
          controllable: controllabilityMap?.[factorKey] ?? true,
          rank: 0,
          sourceType: 'bom',
          sourceId: curItem.id,
          sourceRef: curItem.sourceRef,
          confidence: 'verified',
          paramLabel: 'Loss (%)',
          referenceParam: refItem.loss,
          currentParam: curItem.loss
        })
      }
      if (usageChanged && refItem.consumption !== null && curItem.consumption !== null && refItem.price !== null && refItem.loss !== null) {
        const factorKey = `${baseKey}:usage`
        const usageVariance = (curItem.consumption - refItem.consumption) * refItem.price * (1 + refItem.loss)
        candidates.push({
          candidateKey: factorKey,
          candidateName: `${itemCode} — ${itemDesc} (Usage Change)`,
          category: 'Direct Material',
          factor: 'Usage',
          status: 'CHANGED',
          referenceCost: refItem.consumption,
          currentCost: curItem.consumption,
          costGap: usageVariance,
          controllable: controllabilityMap?.[factorKey] ?? true,
          rank: 0,
          sourceType: 'bom',
          sourceId: curItem.id,
          sourceRef: curItem.sourceRef,
          confidence: 'verified',
          paramLabel: 'Usage (Qty)',
          referenceParam: refItem.consumption,
          currentParam: curItem.consumption
        })
      }
    } else {
      let factorName = 'Material Cost'
      if (priceChanged) factorName = 'Price'
      else if (lossChanged) factorName = 'Loss %'
      else if (usageChanged) factorName = 'Usage'

      candidates.push({
        candidateKey: baseKey,
        candidateName: `${itemCode} — ${itemDesc}`,
        category: 'Direct Material',
        factor: factorName,
        status: 'CHANGED',
        referenceCost,
        currentCost,
        costGap: netGap,
        controllable,
        rank: 0,
        sourceType: 'bom',
        sourceId: curItem?.id || finding.currentId || finding.referenceId || itemCode,
        sourceRef: curItem?.sourceRef || currentSnapshot.sourceRef,
        confidence: 'verified'
      })
    }
  }

  return candidates
}
