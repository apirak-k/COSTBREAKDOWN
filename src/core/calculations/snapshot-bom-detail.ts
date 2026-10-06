import { SnapshotBOMItem } from '../types'
import { safeAdd, safeMultiply } from '../utils/guards'

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
  if (!item
    || item.consumption === null || !Number.isFinite(item.consumption)
    || item.price === null || !Number.isFinite(item.price)
    || item.loss === null || !Number.isFinite(item.loss)) return null
  const lossFactor = safeAdd(1, item.loss)
  return lossFactor === null ? null : safeMultiply(item.consumption, item.price, lossFactor)
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
    costGap: referenceCost === null || currentCost === null ? null : safeAdd(currentCost, -referenceCost)
  }
}
