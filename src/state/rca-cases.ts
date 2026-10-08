import type { CandidateRcaDraft, ProductSession, RcaCaseRecord } from '../core/types/product.types'

export function createRcaCaseRecord(
  id: string,
  candidateKeys: string[],
  draft: CandidateRcaDraft,
  now = new Date().toISOString()
): RcaCaseRecord {
  const uniqueCandidateKeys = [...new Set(candidateKeys.filter(key => key.trim().length > 0))]
  if (!id.trim()) throw new RangeError('RCA Case must have a stable identity.')
  if (uniqueCandidateKeys.length === 0) throw new RangeError('RCA Case must include at least one Candidate.')
  return {
    id,
    candidateKeys: uniqueCandidateKeys,
    rootCause: draft.rootCause,
    action: draft.action,
    updatedAt: now
  }
}

export function isRcaCaseComplete(record: Pick<RcaCaseRecord, 'candidateKeys' | 'rootCause' | 'action'>): boolean {
  return record.candidateKeys.length > 0 && record.rootCause.trim().length > 0 && record.action.trim().length > 0
}

export function createRcaCaseForCandidates(
  session: ProductSession,
  eligibleCandidateKeys: string[],
  selectedCandidateKeys: string[],
  id: string,
  now = new Date().toISOString()
): ProductSession {
  const eligible = new Set(eligibleCandidateKeys)
  const candidateKeys = [...new Set(selectedCandidateKeys)]
  if (candidateKeys.some(key => !eligible.has(key))) {
    throw new RangeError('RCA Case Candidates must come from the active Candidate pool.')
  }
  if (session.rcaCases?.[id]) throw new RangeError(`RCA Case identity already exists: ${id}`)

  const record = createRcaCaseRecord(id, candidateKeys, { rootCause: '', action: '' }, now)
  return {
    ...session,
    rcaCases: { ...(session.rcaCases ?? {}), [id]: record },
    activeRcaCaseId: id
  }
}

export function saveRcaCaseRecord(
  session: ProductSession,
  id: string,
  draft: CandidateRcaDraft,
  now = new Date().toISOString()
): ProductSession {
  const record = session.rcaCases?.[id]
  if (!record) return session
  return {
    ...session,
    rcaCases: {
      ...session.rcaCases,
      [id]: { ...record, rootCause: draft.rootCause, action: draft.action, updatedAt: now }
    }
  }
}

export function migrateLegacyCandidateRcaRecords(session: ProductSession): ProductSession {
  if (session.rcaCases && Object.keys(session.rcaCases).length > 0) return session
  const legacyRecords = Object.entries(session.candidateRcaRecords ?? {})
  if (legacyRecords.length === 0) return session

  const rcaCases: Record<string, RcaCaseRecord> = {}
  for (const [legacyKey, legacyRecord] of legacyRecords) {
    const candidateKey = legacyRecord.candidateKey || legacyKey
    if (!candidateKey.trim()) continue
    const baseId = `legacy:${candidateKey}`
    const id = rcaCases[baseId] ? `${baseId}:${legacyKey}` : baseId
    rcaCases[id] = {
      id,
      candidateKeys: [candidateKey],
      rootCause: legacyRecord.rootCause,
      action: legacyRecord.action,
      updatedAt: legacyRecord.updatedAt
    }
  }
  return Object.keys(rcaCases).length > 0 ? { ...session, rcaCases } : session
}
