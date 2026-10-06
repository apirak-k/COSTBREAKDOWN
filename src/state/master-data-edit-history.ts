import type { ComparisonRole, CostSnapshot, DatasetSizing } from '../core/types'

export interface MasterDataEditHistoryEntry {
  sessionId: string
  role: ComparisonRole
  before: CostSnapshot
  after: CostSnapshot
  beforePrepared: Record<ComparisonRole, boolean>
  afterPrepared: Record<ComparisonRole, boolean>
  beforeSizing?: Record<ComparisonRole, DatasetSizing>
  afterSizing?: Record<ComparisonRole, DatasetSizing>
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
