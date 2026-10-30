import type { CostSnapshot, MasterDataRole } from '../../core/types'
import type { MasterDataHandoffStatus } from '../../core/calculations/master-data-handoff'
import { normalizeMasterDataSnapshot } from '../../core/utils/master-data-effective'

export type MasterDataWarningCategory =
  | 'generated-identity'
  | 'auto-renamed-duplicate'

export type MasterDataBlockerCategory = 'missing-value'
export type MasterDataQualityCategory = MasterDataWarningCategory | MasterDataBlockerCategory

export type MasterDataWarningTable = 'bom' | 'wc' | 'routing'

export interface MasterDataQualityItem {
  id: string
  role: MasterDataRole
  table: MasterDataWarningTable
  rowId: string
  field: string
  category: MasterDataQualityCategory
  label: string
}

export type MasterDataWarningItem = MasterDataQualityItem & { category: MasterDataWarningCategory }
export type MasterDataBlockerItem = MasterDataQualityItem & { category: MasterDataBlockerCategory }

export interface MasterDataWarningGroup {
  category: MasterDataWarningCategory
  label: string
  items: MasterDataWarningItem[]
}

export interface MasterDataBlockerGroup {
  category: MasterDataBlockerCategory
  label: string
  items: MasterDataBlockerItem[]
}

export function areMasterDataDatasetsReady(
  handoff: Pick<MasterDataHandoffStatus, 'referenceReady' | 'currentReady' | 'datasetsPrepared'>,
  blockerItems: readonly MasterDataBlockerItem[]
): boolean {
  return handoff.referenceReady
    && handoff.currentReady
    && handoff.datasetsPrepared
    && !blockerItems.some(item => item.role !== 'custom')
}

export const MASTER_DATA_WARNING_CATEGORY_DEFINITIONS: ReadonlyArray<{
  category: MasterDataWarningCategory
  label: string
}> = [
  { category: 'generated-identity', label: 'Generated identity' },
  { category: 'auto-renamed-duplicate', label: 'Auto-renamed duplicate' }
]

export const MASTER_DATA_BLOCKER_CATEGORY_DEFINITIONS: ReadonlyArray<{
  category: MasterDataBlockerCategory
  label: string
}> = [{ category: 'missing-value', label: 'Missing required value' }]

const roleLabels: Record<MasterDataRole, string> = {
  reference: 'Reference',
  current: 'Current',
  custom: 'Custom'
}

const tableLabels: Record<MasterDataWarningTable, string> = {
  bom: 'Bill of Materials',
  wc: 'Work Centers',
  routing: 'Routing'
}

const fieldLabels: Record<string, string> = {
  description: 'Material',
  workCenterCode: 'Work Center',
  processName: 'Process',
  consumption: 'Usage',
  price: 'Price',
  loss: 'Loss',
  laborRate: 'Labor Rate',
  burdenRate: 'Burden Rate',
  manning: 'Manning',
  capacity: 'Capacity',
  yield: 'Yield',
  workCenterId: 'Work Center'
}

type IdentityRow = {
  id: string
  isGeneratedBusinessIdentity?: boolean
  autoRenamedFrom?: string
  confidence?: Record<string, { quality?: string }>
}

function warningItem(
  role: MasterDataRole,
  table: MasterDataWarningTable,
  rowId: string,
  field: string,
  category: MasterDataWarningCategory,
  rowNumber: number
): MasterDataWarningItem
function warningItem(
  role: MasterDataRole,
  table: MasterDataWarningTable,
  rowId: string,
  field: string,
  category: MasterDataBlockerCategory,
  rowNumber: number
): MasterDataBlockerItem
function warningItem(
  role: MasterDataRole,
  table: MasterDataWarningTable,
  rowId: string,
  field: string,
  category: MasterDataQualityCategory,
  rowNumber: number
): MasterDataQualityItem
function warningItem(
  role: MasterDataRole,
  table: MasterDataWarningTable,
  rowId: string,
  field: string,
  category: MasterDataQualityCategory,
  rowNumber: number
): MasterDataQualityItem {
  const label = `${roleLabels[role]} · ${tableLabels[table]} · Row ${rowNumber} · ${fieldLabels[field] ?? field}`
  return { id: `${role}.${table}.${rowId}.${field}.${category}`, role, table, rowId, field, category, label } as MasterDataQualityItem
}

function addNumericBlockers(
  result: MasterDataBlockerItem[],
  role: MasterDataRole,
  table: MasterDataWarningTable,
  row: IdentityRow,
  rowNumber: number,
  field: string,
  value: unknown
): void {
  if (row.confidence?.[field]?.quality === 'invalid') return
  if (value === null || value === undefined || value === '') {
    result.push(warningItem(role, table, row.id, field, 'missing-value', rowNumber) as MasterDataBlockerItem)
  }
}

export function buildMasterDataWarningItems(
  snapshots: Record<MasterDataRole, CostSnapshot>
): MasterDataWarningItem[] {
  const warnings: MasterDataWarningItem[] = []

  ;(['reference', 'current', 'custom'] as const).forEach(role => {
    const snapshot = normalizeMasterDataSnapshot(snapshots[role])

    snapshot.bom.forEach((row, index) => {
      const rowNumber = index + 1
      if (row.autoRenamedFrom) {
        warnings.push(warningItem(role, 'bom', row.id, 'description', 'auto-renamed-duplicate', rowNumber))
      } else if (row.isGeneratedBusinessIdentity) {
        warnings.push(warningItem(role, 'bom', row.id, 'description', 'generated-identity', rowNumber))
      }
    })

    snapshot.rates.forEach((row, index) => {
      const rowNumber = index + 1
      if (row.autoRenamedFrom) {
        warnings.push(warningItem(role, 'wc', row.id, 'workCenterCode', 'auto-renamed-duplicate', rowNumber))
      } else if (row.isGeneratedBusinessIdentity) {
        warnings.push(warningItem(role, 'wc', row.id, 'workCenterCode', 'generated-identity', rowNumber))
      }
    })

    snapshot.routing.forEach((row, index) => {
      const rowNumber = index + 1
      if (row.autoRenamedFrom) {
        warnings.push(warningItem(role, 'routing', row.id, 'processName', 'auto-renamed-duplicate', rowNumber))
      } else if (row.isGeneratedBusinessIdentity) {
        warnings.push(warningItem(role, 'routing', row.id, 'processName', 'generated-identity', rowNumber))
      }
    })
  })

  return warnings
}

export function buildMasterDataBlockerItems(
  snapshots: Record<MasterDataRole, CostSnapshot>
): MasterDataBlockerItem[] {
  const blockers: MasterDataBlockerItem[] = []

  ;(['reference', 'current', 'custom'] as const).forEach(role => {
    const snapshot = normalizeMasterDataSnapshot(snapshots[role])
    const knownWorkCenters = new Set(snapshot.rates.map(row => row.workCenterCode.trim().toLocaleLowerCase()).filter(Boolean))

    snapshot.bom.forEach((row, index) => {
      const rowNumber = index + 1
      addNumericBlockers(blockers, role, 'bom', row, rowNumber, 'consumption', row.consumption)
      addNumericBlockers(blockers, role, 'bom', row, rowNumber, 'price', row.price)
      addNumericBlockers(blockers, role, 'bom', row, rowNumber, 'loss', row.loss)
    })

    snapshot.rates.forEach((row, index) => {
      const rowNumber = index + 1
      addNumericBlockers(blockers, role, 'wc', row, rowNumber, 'laborRate', row.laborRate)
      addNumericBlockers(blockers, role, 'wc', row, rowNumber, 'burdenRate', row.burdenRate)
    })

    snapshot.routing.forEach((row, index) => {
      const rowNumber = index + 1
      addNumericBlockers(blockers, role, 'routing', row, rowNumber, 'manning', row.manning)
      addNumericBlockers(blockers, role, 'routing', row, rowNumber, 'capacity', row.capacity)
      addNumericBlockers(blockers, role, 'routing', row, rowNumber, 'yield', row.yield)
      const workCenterId = row.workCenterId?.trim()
      if (!workCenterId || !knownWorkCenters.has(workCenterId.toLocaleLowerCase())) {
        blockers.push(warningItem(role, 'routing', row.id, 'workCenterId', 'missing-value', rowNumber) as MasterDataBlockerItem)
      }
    })
  })

  return blockers
}

export function groupMasterDataWarnings(items: MasterDataWarningItem[]): MasterDataWarningGroup[] {
  return MASTER_DATA_WARNING_CATEGORY_DEFINITIONS.map(({ category, label }) => ({
    category,
    label,
    items: items.filter(item => item.category === category)
  }))
}

export function groupMasterDataBlockers(items: MasterDataBlockerItem[]): MasterDataBlockerGroup[] {
  return MASTER_DATA_BLOCKER_CATEGORY_DEFINITIONS.map(({ category, label }) => ({
    category,
    label,
    items: items.filter(item => item.category === category)
  }))
}

export function countMasterDataWarningsByRole(items: readonly MasterDataWarningItem[]): Record<MasterDataRole, number> {
  return items.reduce<Record<MasterDataRole, number>>((counts, item) => {
    counts[item.role] += 1
    return counts
  }, { reference: 0, current: 0, custom: 0 })
}

export function countMasterDataQualityByRole(items: readonly MasterDataQualityItem[]): Record<MasterDataRole, number> {
  return items.reduce<Record<MasterDataRole, number>>((counts, item) => {
    counts[item.role] += 1
    return counts
  }, { reference: 0, current: 0, custom: 0 })
}
