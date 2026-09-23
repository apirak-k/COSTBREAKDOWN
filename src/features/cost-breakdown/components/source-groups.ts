import type {
  ComparisonRole,
  CostSnapshot,
  SnapshotPair,
  SnapshotBOMItem,
  SnapshotRoutingStep,
  SnapshotWorkCenterRate
} from '../../../core'

export type SourceGroupSection = 'BOM' | 'Routing' | 'Work Center'

export interface SourceGroup {
  id: string
  role: ComparisonRole
  section: SourceGroupSection
  sourceRef: string
  recordCount: number
  locations: string[]
  missingSource: boolean
}

type SourceRow = SnapshotBOMItem | SnapshotRoutingStep | SnapshotWorkCenterRate

function sourceText(row: SourceRow): string {
  return row.sourceRef?.trim() || 'Source not recorded'
}

function sourceKey(value: string): string {
  return value.trim().toLowerCase()
}

function rowLocation(section: SourceGroupSection, row: SourceRow): string {
  if (section === 'BOM') {
    const item = row as SnapshotBOMItem
    return item.itemCode?.trim() || item.id
  }
  if (section === 'Routing') {
    const step = row as SnapshotRoutingStep
    return step.operationCode?.trim() || step.processCode?.trim() || step.processName?.trim() || step.id
  }
  const rate = row as SnapshotWorkCenterRate
  return rate.workCenterCode?.trim() || rate.id
}

function addRows(
  groups: Map<string, SourceGroup>,
  role: ComparisonRole,
  section: SourceGroupSection,
  rows: SourceRow[]
): void {
  rows.forEach(row => {
    const sourceRef = sourceText(row)
    const id = `${role}:${section}:${sourceKey(sourceRef)}`
    const group = groups.get(id)
    if (group) {
      group.recordCount += 1
      group.locations.push(rowLocation(section, row))
      return
    }

    groups.set(id, {
      id,
      role,
      section,
      sourceRef,
      recordCount: 1,
      locations: [rowLocation(section, row)],
      missingSource: !row.sourceRef?.trim()
    })
  })
}

export function buildSourceGroups(pair: SnapshotPair): SourceGroup[] {
  const groups = new Map<string, SourceGroup>()
  const snapshots: Array<[ComparisonRole, CostSnapshot]> = [
    ['reference', pair.reference],
    ['current', pair.current]
  ]

  snapshots.forEach(([role, snapshot]) => {
    addRows(groups, role, 'BOM', snapshot.bom)
    addRows(groups, role, 'Routing', snapshot.routing)
    addRows(groups, role, 'Work Center', snapshot.rates)
  })

  return [...groups.values()]
}
