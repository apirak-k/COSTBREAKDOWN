import { CanonicalComparisonStatus, ComparisonFinding } from '../types'

/** The four canonical comparison statuses per Section 4 of COSTBREAKDOWN_COMPARISON_PRINCIPLES.md */
export type { CanonicalComparisonStatus } from '../types'
export type ComparisonStatus = CanonicalComparisonStatus

const NORMALIZED_IDENTITY_FIELDS = new Set([
  'description',
  'processName',
  'workCenterCode',
  'workCenterId'
])

function normalizedBusinessIdentity(value: unknown): string | null {
  return typeof value === 'string' ? value.trim().toLocaleLowerCase() : null
}

function isNormalizedIdentityOnlyDiff(
  field: string,
  diff: { reference: unknown; current: unknown } | undefined
): boolean {
  if (!diff || !NORMALIZED_IDENTITY_FIELDS.has(field)) return false
  const reference = normalizedBusinessIdentity(diff.reference)
  const current = normalizedBusinessIdentity(diff.current)
  return reference !== null && current !== null && reference === current
}

function hasBusinessFieldChanges(finding: ComparisonFinding): boolean {
  return Object.entries(finding.fieldDiffs).some(([field, diff]) => {
    if (field.startsWith('additionalFields.')) return false
    if (isNormalizedIdentityOnlyDiff(field, diff)) return false
    return true
  })
}

function hasBusinessWorkCenterMove(finding: ComparisonFinding): boolean {
  if (!finding.changeFlags.movedWorkCenter) return false
  return !isNormalizedIdentityOnlyDiff('workCenterId', finding.fieldDiffs.workCenterId)
}

/**
 * Returns the exact canonical comparison status (UNCHANGED, CHANGED, ADDED, REMOVED).
 * Structural comparison status does not depend on whether its cost Gap is available.
 * Unmatched and ambiguous identities remain unclassified and are reported as warnings.
 * Non-canonical additionalFields are retained for review but do not define business status.
 * Matched identity spelling differences that normalize to the same approved business key
 * (trim + case normalization) do not create a false business change.
 */
export function getCanonicalComparisonStatus(finding: ComparisonFinding | undefined): CanonicalComparisonStatus | null {
  if (!finding) return null
  if (finding.matchStatus === 'added') return 'ADDED'
  if (finding.matchStatus === 'removed') return 'REMOVED'
  if (finding.matchStatus === 'matched') {
    const hasFieldChanges = hasBusinessFieldChanges(finding)
    const hasFlagChanges = Boolean(
      finding.changeFlags.reordered ||
      hasBusinessWorkCenterMove(finding) ||
      finding.changeFlags.changedInputs ||
      finding.changeFlags.changedRate
    )
    return (hasFieldChanges || hasFlagChanges) ? 'CHANGED' : 'UNCHANGED'
  }
  return null
}

/** Returns only a contract status. Unmatched/ambiguous validation is reported separately. */
export function getComparisonStatusLabels(finding: ComparisonFinding | undefined): ComparisonStatus[] {
  const status = getCanonicalComparisonStatus(finding)
  return status ? [status] : []
}
