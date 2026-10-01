import type { SnapshotPair } from '../core/types/snapshot.types'

export function markMasterDataChanged<T extends { masterDataRevision?: number }>(
  session: T
): T & { masterDataRevision: number } {
  return { ...session, masterDataRevision: (session.masterDataRevision ?? 0) + 1 }
}

function normalizeBusinessValue(value: unknown, arrayItem = false): unknown {
  if (value === null) return ['null']

  if (Array.isArray(value)) {
    return ['array', value.map(item => normalizeBusinessValue(item, true))]
  }

  switch (typeof value) {
    case 'number':
      return ['number', Number.isFinite(value) ? value : String(value)]
    case 'string':
      return ['string', value]
    case 'boolean':
      return ['boolean', value]
    case 'undefined':
    case 'function':
    case 'symbol':
      return arrayItem ? ['null'] : undefined
    case 'object': {
      const entries = Object.entries(value as Record<string, unknown>)
        .filter(([key, fieldValue]) =>
          !['note', 'remark'].includes(key.trim().toLowerCase()) &&
          fieldValue !== undefined && typeof fieldValue !== 'function' && typeof fieldValue !== 'symbol'
        )
        .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
        .map(([key, fieldValue]) => [key, normalizeBusinessValue(fieldValue)])
      return ['object', entries]
    }
    default:
      return undefined
  }
}

function haveSameBusinessValues(left: unknown, right: unknown): boolean {
  return JSON.stringify(normalizeBusinessValue(left)) === JSON.stringify(normalizeBusinessValue(right))
}

export function markMasterDataChangedForSnapshotPair<T extends { masterDataRevision?: number }>(
  session: T,
  previous: SnapshotPair,
  next: SnapshotPair
): T {
  if (haveSameBusinessValues(previous, next)) return session
  return markMasterDataChanged(session)
}
