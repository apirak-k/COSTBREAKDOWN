import type { CostBreakdownComparisonPair, CostSnapshot, MasterDataRole, SnapshotPair } from '../core/types'

export const DEFAULT_CBD_COMPARISON_BEFORE: MasterDataRole = 'reference'
export const DEFAULT_CBD_COMPARISON_AFTER: MasterDataRole = 'current'

/** Build the CBD view pair from the latest Master Data Working snapshots. */
export function createCostBreakdownComparisonPair(
  snapshots: Record<MasterDataRole, CostSnapshot>,
  beforeRole: MasterDataRole,
  afterRole: MasterDataRole
): CostBreakdownComparisonPair {
  const before = snapshots[beforeRole]
  const after = snapshots[afterRole]
  return {
    beforeRole,
    afterRole,
    before,
    after,
    // Include the selected roles as well as their source values so selecting
    // another role invalidates analysis state even when its data is identical.
    fingerprint: JSON.stringify([beforeRole, afterRole, before, after])
  }
}

/** The generic engine's first/second arguments are CBD Before/After. */
export function toSnapshotPair(pair: CostBreakdownComparisonPair): SnapshotPair {
  return { reference: pair.before, current: pair.after }
}
