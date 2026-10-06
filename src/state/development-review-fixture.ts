import {
  applySnapshotPairToSession,
  type DatasetSizing,
  type ProductSession,
  type SnapshotPair
} from '../core'

export const DEVELOPMENT_REVIEW_FIXTURE_ID = 'ps-dev-review-fixture'

function sizingForPair(snapshot: SnapshotPair['reference']): DatasetSizing {
  return {
    wcCount: snapshot.sizing?.wcCount ?? snapshot.rates.length,
    bomCount: snapshot.sizing?.bomCount ?? snapshot.bom.length,
    routingCount: snapshot.sizing?.routingCount ?? snapshot.routing.length
  }
}

/** Reset the dedicated review session so each mock load is deterministic. */
export function resetDevelopmentReviewFixtureSession(
  source: ProductSession,
  pair: SnapshotPair,
  updatedAt = new Date().toISOString()
): ProductSession {
  const referenceSizing = sizingForPair(pair.reference)
  const currentSizing = sizingForPair(pair.current)
  const nextPair: SnapshotPair = {
    reference: { ...pair.reference, comparisonRole: 'reference', sizing: referenceSizing },
    current: { ...pair.current, comparisonRole: 'current', sizing: currentSizing }
  }

  const resetSession = applySnapshotPairToSession({
    ...source,
    updatedAt,
    savedDrivers: [],
    selectedDriverKeys: [],
    rcaRecords: {},
    candidateRcaRecords: {},
    candidateControllability: {},
    preparedSnapshotRoles: { reference: true, current: true },
    datasetSizing: { reference: referenceSizing, current: currentSizing },
    lastSavedMasterData: {},
    status: 'draft',
    versionLabel: 'Synthetic Review Fixture'
  }, nextPair)

  // Resetting the review session must also invalidate an old RCA/Scenario draft
  // when the same fixture is loaded again with identical cost inputs.
  return {
    ...resetSession,
    masterDataRevision: (source.masterDataRevision ?? 0) + 1,
    snapshotPair: nextPair,
    snapshotPairMode: 'independent'
  }
}
