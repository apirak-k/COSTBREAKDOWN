import { SnapshotBOMItem } from '../types'

export interface SnapshotBOMPair {
  reference?: SnapshotBOMItem
  current?: SnapshotBOMItem
}

export interface SnapshotBOMDetail {
  pair: SnapshotBOMPair
  referenceCost: number | null
  currentCost: number | null
  costGap: number | null
}

function costOf(item: SnapshotBOMItem | undefined): number | null {
  if (!item || item.consumption === null || item.price === null || item.loss === null) return null
  const cost = item.consumption * item.price * (1 + item.loss)
  return Number.isFinite(cost) ? cost : null
}

/** Calculates BOM costs with absent-side zero for added/removed records without converting missing inputs to zero. */
export function calculateSnapshotBOMDetail(pair: SnapshotBOMPair): SnapshotBOMDetail {
  // If record does not exist on reference side (ADDED), referenceCost is 0
  const referenceCost = pair.reference ? costOf(pair.reference) : 0
  // If record does not exist on current side (REMOVED), currentCost is 0
  const currentCost = pair.current ? costOf(pair.current) : 0

  return {
    pair,
    referenceCost,
    currentCost,
    costGap: referenceCost === null || currentCost === null ? null : currentCost - referenceCost
  }
}
