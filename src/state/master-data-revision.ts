export function markMasterDataChanged<T extends { masterDataRevision?: number }>(
  session: T
): T & { masterDataRevision: number } {
  return { ...session, masterDataRevision: (session.masterDataRevision ?? 0) + 1 }
}
