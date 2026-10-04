import { ComparisonFinding, CostComparison, SelectedComparisonSelection, SnapshotPair } from '../types'
import { getCanonicalComparisonStatus } from './comparison-status'

export type SelectableComparisonSection = 'bom' | 'routing'

export function getComparisonFindingKey(section: SelectableComparisonSection, finding: ComparisonFinding): string {
  return JSON.stringify([section, finding.referenceId ?? null, finding.currentId ?? null])
}

function selectedFindingIds(
  findings: ComparisonFinding[],
  selectedKeys: string[],
  section: SelectableComparisonSection
): Set<string> {
  const selected = new Set(selectedKeys)
  const rowIds = new Set<string>()
  findings.forEach(finding => {
    if (!getCanonicalComparisonStatus(finding) || !selected.has(getComparisonFindingKey(section, finding))) return
    if (finding.referenceId) rowIds.add(finding.referenceId)
    if (finding.currentId) rowIds.add(finding.currentId)
  })
  return rowIds
}

/** Filters only selected BOM and Routing findings while retaining every WC rate as calculation context. */
export function createSelectedSnapshotPair(
  pair: SnapshotPair,
  comparison: CostComparison,
  selection: SelectedComparisonSelection
): SnapshotPair {
  const selectedBomIds = selectedFindingIds(comparison.bomFindings, selection.bomFindingKeys, 'bom')
  const selectedRoutingIds = selectedFindingIds(comparison.routingFindings, selection.routingFindingKeys, 'routing')

  return {
    reference: {
      ...pair.reference,
      bom: pair.reference.bom.filter(item => selectedBomIds.has(item.id)),
      routing: pair.reference.routing.filter(step => selectedRoutingIds.has(step.id))
    },
    current: {
      ...pair.current,
      bom: pair.current.bom.filter(item => selectedBomIds.has(item.id)),
      routing: pair.current.routing.filter(step => selectedRoutingIds.has(step.id))
    }
  }
}
