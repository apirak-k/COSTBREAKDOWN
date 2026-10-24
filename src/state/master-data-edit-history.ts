import type { ComparisonRole, CostSnapshot, DatasetSizing, MasterDataRole, SnapshotPair } from '../core/types'
import { applySnapshotPairToSession, getSnapshotRoleReadiness, sessionToSnapshotPair } from '../core'
import type { ProductSession } from '../core'
import { cloneCostSnapshot, createEmptyCustomMasterData } from './master-data-datasets'
import { markMasterDataChangedForSnapshotPair } from './master-data-revision'
import { getMasterDataSnapshot } from './master-data-datasets'
import { directEditMatches } from './master-data-direct-edits'

export interface MasterDataEditHistoryEntry {
  beforeDirectEdits?: ProductSession['masterDataDirectEdits']
  afterDirectEdits?: ProductSession['masterDataDirectEdits']
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
  beforeInitialMasterDataBaseline?: ProductSession['initialMasterDataBaseline']
  afterInitialMasterDataBaseline?: ProductSession['initialMasterDataBaseline']
  /** A single undoable action that replaces both comparison Working snapshots. */
  beforePair?: SnapshotPair
  afterPair?: SnapshotPair
  /** Development fixture replacement also clears Custom Working data in the same history action. */
  beforeCustom?: CostSnapshot
  afterCustom?: CostSnapshot
}

export interface MasterDataEditHistory {
  undo: MasterDataEditHistoryEntry[]
  redo: MasterDataEditHistoryEntry[]
}

const MAX_HISTORY_ENTRIES = 100

function cloneInitialBaselines(baselines: ProductSession['initialMasterDataBaseline']) {
  return baselines
    ? Object.fromEntries(Object.entries(baselines).map(([role, baseline]) => [role, baseline ? {
      ...baseline,
      snapshot: cloneCostSnapshot(baseline.snapshot),
      sizing: { ...baseline.sizing }
    } : undefined])) as ProductSession['initialMasterDataBaseline']
    : undefined
}

function copyDatasetSizing(sizing?: ProductSession['datasetSizing']) {
  return sizing ? {
    reference: { ...(sizing.reference ?? {}) },
    current: { ...(sizing.current ?? {}) }
  } : undefined
}

export function createMasterDataPairWorkingEditEntry(
  before: ProductSession,
  after: ProductSession
): MasterDataEditHistoryEntry {
  const beforePair = before.snapshotPair ?? sessionToSnapshotPair(before)
  const afterPair = after.snapshotPair ?? sessionToSnapshotPair(after)
  return {
    beforeDirectEdits: before.masterDataDirectEdits,
    afterDirectEdits: after.masterDataDirectEdits,
    sessionId: before.id,
    role: 'current',
    before: cloneCostSnapshot(beforePair.current),
    after: cloneCostSnapshot(afterPair.current),
    beforePrepared: { ...getSnapshotRoleReadiness(before) },
    afterPrepared: { ...getSnapshotRoleReadiness(after) },
    beforeSizing: copyDatasetSizing(before.datasetSizing),
    afterSizing: copyDatasetSizing(after.datasetSizing),
    beforeInitialMasterDataBaseline: cloneInitialBaselines(before.initialMasterDataBaseline),
    afterInitialMasterDataBaseline: cloneInitialBaselines(after.initialMasterDataBaseline),
    beforePair: {
      reference: cloneCostSnapshot(beforePair.reference),
      current: cloneCostSnapshot(beforePair.current)
    },
    afterPair: {
      reference: cloneCostSnapshot(afterPair.reference),
      current: cloneCostSnapshot(afterPair.current)
    },
    beforeCustom: cloneCostSnapshot(before.customMasterData ?? createEmptyCustomMasterData(before.id)),
    afterCustom: cloneCostSnapshot(after.customMasterData ?? createEmptyCustomMasterData(after.id)),
    beforeCustomSizing: { ...(before.customDatasetSizing ?? {}) },
    afterCustomSizing: { ...(after.customDatasetSizing ?? {}) }
  }
}

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

  const withDirectEdits = (restored: ProductSession): ProductSession => {
    const restoredMarks = direction === 'undo' ? entry.beforeDirectEdits : entry.afterDirectEdits
    const marks = { ...session.masterDataDirectEdits }
    const roles: MasterDataRole[] = entry.beforePair ? ['reference', 'current', 'custom'] : [entry.role]
    roles.forEach(role => {
      if (restoredMarks?.[role]) marks[role] = restoredMarks[role]
      else delete marks[role]
    })
    return { ...restored, masterDataDirectEdits: marks }
  }
  const pair = session.snapshotPair ?? sessionToSnapshotPair(session)
  if (entry.beforePair && entry.afterPair) {
    const expectedPair = direction === 'undo' ? entry.afterPair : entry.beforePair
    if (JSON.stringify(pair) !== JSON.stringify(expectedPair)) return undefined
    const expectedCustom = direction === 'undo' ? entry.afterCustom : entry.beforeCustom
    if (expectedCustom && JSON.stringify(session.customMasterData) !== JSON.stringify(expectedCustom)) return undefined
    const nextPair = direction === 'undo' ? entry.beforePair : entry.afterPair
    const nextCustom = direction === 'undo' ? entry.beforeCustom : entry.afterCustom
    const preparedSnapshotRoles = direction === 'undo' ? entry.beforePrepared : entry.afterPrepared
    const datasetSizing = direction === 'undo' ? entry.beforeSizing : entry.afterSizing
    const customDatasetSizing = direction === 'undo' ? entry.beforeCustomSizing : entry.afterCustomSizing
    const initialMasterDataBaseline = direction === 'undo'
      ? entry.beforeInitialMasterDataBaseline
      : entry.afterInitialMasterDataBaseline
    const nextSession = applySnapshotPairToSession({
      ...session,
      ...(initialMasterDataBaseline ? { initialMasterDataBaseline } : {}),
      datasetSizing: datasetSizing ? {
        reference: { ...(datasetSizing.reference ?? {}) },
        current: { ...(datasetSizing.current ?? {}) }
      } : undefined,
      preparedSnapshotRoles: { ...preparedSnapshotRoles },
      updatedAt: new Date().toISOString()
    }, nextPair)
    const updated = markMasterDataChangedForSnapshotPair(nextSession, pair, nextPair)
    return withDirectEdits(nextCustom ? {
      ...updated,
      customMasterData: nextCustom,
      customDatasetSizing: { ...(customDatasetSizing ?? {}) }
    } : updated)
  }

  const expected = direction === 'undo' ? entry.after : entry.before
  if (JSON.stringify(getMasterDataSnapshot(session, pair, entry.role)) !== JSON.stringify(expected)) return undefined

  const snapshot = direction === 'undo' ? entry.before : entry.after
  const preparedSnapshotRoles = direction === 'undo' ? entry.beforePrepared : entry.afterPrepared
  const datasetSizing = direction === 'undo' ? entry.beforeSizing : entry.afterSizing
  const customDatasetSizing = direction === 'undo' ? entry.beforeCustomSizing : entry.afterCustomSizing
  const initialMasterDataBaseline = direction === 'undo'
    ? entry.beforeInitialMasterDataBaseline
    : entry.afterInitialMasterDataBaseline
  if (entry.role === 'custom') {
    return withDirectEdits({
      ...session,
      ...(initialMasterDataBaseline ? { initialMasterDataBaseline } : {}),
      customMasterData: snapshot,
      customDatasetSizing: customDatasetSizing ? { ...customDatasetSizing } : {},
      updatedAt: new Date().toISOString()
    })
  }
  const nextPair = {
    ...pair,
    [entry.role]: snapshot
  }
  const nextSession = applySnapshotPairToSession({
    ...session,
    ...(initialMasterDataBaseline ? { initialMasterDataBaseline } : {}),
    datasetSizing: datasetSizing ? {
      reference: { ...(datasetSizing.reference ?? {}) },
      current: { ...(datasetSizing.current ?? {}) }
    } : undefined,
    preparedSnapshotRoles: { ...preparedSnapshotRoles },
    updatedAt: new Date().toISOString()
  }, nextPair)

  return withDirectEdits(markMasterDataChangedForSnapshotPair(nextSession, pair, nextPair))
}

/** Retire only saved source values; unsaved redo values retain their provenance. */
export function clearSavedDirectEditHistory(history: MasterDataEditHistory, roles: readonly MasterDataRole[], session: ProductSession): MasterDataEditHistory {
  const clear = (marks: ProductSession['masterDataDirectEdits']) => {
    const next = { ...marks }
    const pair = session.snapshotPair ?? sessionToSnapshotPair(session)
    roles.forEach(role => {
      const saved = getMasterDataSnapshot(session, pair, role)
      next[role] = Object.fromEntries(Object.entries(next[role] ?? {}).filter(([key, edit]) => !directEditMatches(saved, key, edit.after)))
    })
    return next
  }
  const clearEntry = (entry: MasterDataEditHistoryEntry) => entry.sessionId !== session.id ? entry : ({
    ...entry, beforeDirectEdits: clear(entry.beforeDirectEdits), afterDirectEdits: clear(entry.afterDirectEdits)
  })
  return { undo: history.undo.map(clearEntry), redo: history.redo.map(clearEntry) }
}
