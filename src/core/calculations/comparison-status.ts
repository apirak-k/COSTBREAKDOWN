import { ComparisonFinding } from '../types'

export type ComparisonStatus =
  | 'Unchanged'
  | 'Modified'
  | 'Added'
  | 'Removed'
  | 'Reordered'
  | 'Moved Work Center'
  | 'Need Review'

/** Maps comparison facts to the stable vocabulary shown to users. */
export function getComparisonStatusLabels(finding: ComparisonFinding | undefined): ComparisonStatus[] {
  if (!finding) return ['Need Review']
  if (finding.matchStatus === 'added') return ['Added']
  if (finding.matchStatus === 'removed') return ['Removed']
  if (finding.matchStatus !== 'matched') return ['Need Review']

  const labels: ComparisonStatus[] = []
  if (finding.changeFlags.reordered) labels.push('Reordered')
  if (finding.changeFlags.movedWorkCenter) labels.push('Moved Work Center')
  if (finding.reviewRequired) labels.push('Need Review')
  if (Object.keys(finding.fieldDiffs).length > 0 || finding.changeFlags.changedInputs || finding.changeFlags.changedRate) {
    labels.push('Modified')
  }
  return labels.length > 0 ? labels : ['Unchanged']
}
