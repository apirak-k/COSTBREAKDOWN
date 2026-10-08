import type { ComparisonRole, CostSnapshot, DatasetSizing, MasterDataRole } from '../core/types'
import { applySnapshotPairToSession, sessionToSnapshotPair } from '../core'
import type { ProductSession } from '../core'
import { markMasterDataChangedForSnapshotPair } from './master-data-revision'
import { getMasterDataSnapshot } from './master-data-datasets'

export interface MasterDataEditHistoryEntry {
  sessionId: string
  role: MasterDataRole
  before: CostSnapshot
  after: CostSnapshot
  beforePrepared: Record<ComparisonRole, boolean>
  afterPrepared: Record<ComparisonRole, boolean>
  beforeSizing?: Record<ComparisonRole, DatasetSizing>
  afterSizing?: Record<ComparisonRole, DatasetSizing>
  beforeCustomSizing?: DatasetSizing
  afterCustomSizing?: DatasetSizing
}

export interface MasterDataEditHistory {
  undo: MasterDataEditHistoryEntry[]
  redo: MasterDataEditHistoryEntry[]
}

const MAX_HISTORY_ENTRIES = 100

export function createMasterDataEditHistory(): MasterDataEditHistory {
  return { undo: [], redo: [] }
}

export function recordMasterDataEdit(
  history: MasterDataEditHistory,
  entry: MasterDataEditHistoryEntry
): MasterDataEditHistory {
  return {
    undo: [...history.undo, entry].slice(-MAX_HISTORY_ENTRIES),
    redo: []
  }
}

export function undoMasterDataEdit(history: MasterDataEditHistory): {
  history: MasterDataEditHistory
  entry?: MasterDataEditHistoryEntry
} {
  const entry = history.undo[history.undo.length - 1]
  if (!entry) return { history }
  return {
    history: {
      undo: history.undo.slice(0, -1),
      redo: [...history.redo, entry]
    },
    entry
  }
}

export function redoMasterDataEdit(history: MasterDataEditHistory): {
  history: MasterDataEditHistory
  entry?: MasterDataEditHistoryEntry
} {
  const entry = history.redo[history.redo.length - 1]
  if (!entry) return { history }
  return {
    history: {
      undo: [...history.undo, entry],
      redo: history.redo.slice(0, -1)
    },
    entry
  }
}

export function applyMasterDataEditHistoryEntry(
  session: ProductSession,
  entry: MasterDataEditHistoryEntry,
  direction: 'undo' | 'redo'
): ProductSession | undefined {
  if (session.id !== entry.sessionId) return undefined

  const pair = session.snapshotPair ?? sessionToSnapshotPair(session)
  const expected = direction === 'undo' ? entry.after : entry.before
  if (JSON.stringify(getMasterDataSnapshot(session, pair, entry.role)) !== JSON.stringify(expected)) return undefined

  const snapshot = direction === 'undo' ? entry.before : entry.after
  const preparedSnapshotRoles = direction === 'undo' ? entry.beforePrepared : entry.afterPrepared
  const datasetSizing = direction === 'undo' ? entry.beforeSizing : entry.afterSizing
  const customDatasetSizing = direction === 'undo' ? entry.beforeCustomSizing : entry.afterCustomSizing
  if (entry.role === 'custom') {
    return {
      ...session,
      customMasterData: snapshot,
      customDatasetSizing: customDatasetSizing ? { ...customDatasetSizing } : {},
      updatedAt: new Date().toISOString()
    }
  }
  const nextPair = {
    ...pair,
    [entry.role]: snapshot
  }
  const nextSession = applySnapshotPairToSession({
    ...session,
    datasetSizing: datasetSizing ? {
      reference: { ...(datasetSizing.reference ?? {}) },
      current: { ...(datasetSizing.current ?? {}) }
    } : undefined,
    preparedSnapshotRoles: { ...preparedSnapshotRoles },
    updatedAt: new Date().toISOString()
  }, nextPair)

  return markMasterDataChangedForSnapshotPair(nextSession, pair, nextPair)
}
