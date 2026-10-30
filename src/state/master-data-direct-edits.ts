import type { CostSnapshot, MasterDataRole, ProductSession } from '../core/types'
import { exactDecimalInputValue, exactDecimalToString } from '../core/utils/exact-decimal'

export type DirectEditField = { section: string; recordId: string; field: string }
export const directEditKey = ({ section, recordId, field }: DirectEditField) => JSON.stringify([section, recordId, field])

export function directEditToken(snapshot: CostSnapshot, source: DirectEditField): string {
  const rows = snapshot[source.section as 'bom' | 'rates' | 'routing']
  const record = source.section === 'product' ? snapshot.product
    : source.section === 'dataset' ? snapshot
      : source.section === 'sizing' ? snapshot.sizing
        : Array.isArray(rows) ? rows.find(row => row.id === source.recordId) : undefined
  const value = (record as unknown as Record<string, unknown> | undefined)?.[source.field]
  if (typeof value === 'number') {
    const exact = (record as { exactDecimalInputs?: Record<string, string> })?.exactDecimalInputs?.[source.field]
    const decimal = exactDecimalInputValue(value, exact, source.field === 'loss' || source.field === 'yield')
    if (decimal) return exactDecimalToString(decimal)
  }
  return JSON.stringify(value) ?? 'undefined'
}

export function recordMasterDataDirectEdits(
  session: ProductSession, role: MasterDataRole, before: CostSnapshot, after: CostSnapshot, fields: DirectEditField[]
): ProductSession {
  const pending = { ...session.masterDataDirectEdits?.[role] }
  for (const source of fields) {
    const previous = directEditToken(before, source)
    const next = directEditToken(after, source)
    if (previous === next) continue
    const key = directEditKey(source)
    const baseline = pending[key]?.after === previous ? pending[key].before : previous
    if (baseline === next) delete pending[key]
    else pending[key] = { before: baseline, after: next }
  }
  return { ...session, masterDataDirectEdits: { ...session.masterDataDirectEdits, [role]: pending } }
}

export function clearMasterDataDirectEdits(session: ProductSession, roles: readonly MasterDataRole[]): ProductSession {
  if (!session.masterDataDirectEdits) return session
  const pending = { ...session.masterDataDirectEdits }
  roles.forEach(role => { delete pending[role] })
  return { ...session, masterDataDirectEdits: pending }
}

export function directEditMatches(snapshot: CostSnapshot, key: string, token: string): boolean {
  try {
    const source: unknown = JSON.parse(key)
    if (!Array.isArray(source) || source.length !== 3 || !source.every(part => typeof part === 'string')) return false
    const [section, recordId, field] = source
    return directEditToken(snapshot, { section, recordId, field }) === token
  } catch {
    return false
  }
}

export function pruneMasterDataDirectEdits(session: ProductSession, role: MasterDataRole, snapshot: CostSnapshot): ProductSession {
  const pending = session.masterDataDirectEdits?.[role]
  if (!pending) return session
  const retained = Object.fromEntries(Object.entries(pending).filter(([key, edit]) => directEditMatches(snapshot, key, edit.after)))
  return { ...session, masterDataDirectEdits: { ...session.masterDataDirectEdits, [role]: retained } }
}
