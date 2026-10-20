import type { ProductSession, RcaCaseRecord } from '../core/types/product.types'

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
