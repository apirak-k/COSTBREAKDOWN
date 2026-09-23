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

/** Calculates BOM costs without converting missing source values into zero. */
export function calculateSnapshotBOMDetail(pair: SnapshotBOMPair): SnapshotBOMDetail {
  const referenceCost = costOf(pair.reference)
  const currentCost = costOf(pair.current)
  return {
    pair,
    referenceCost,
    currentCost,
    costGap: referenceCost === null || currentCost === null ? null : currentCost - referenceCost
  }
}
