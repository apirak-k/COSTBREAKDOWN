import type { CostSnapshot, MasterDataRole } from '../../core/types'
import type { MasterDataHandoffStatus } from '../../core/calculations/master-data-handoff'
import { normalizeMasterDataSnapshot } from '../../core/utils/master-data-effective'

export type MasterDataWarningCategory =
  | 'generated-identity'
  | 'auto-renamed-duplicate'
  | 'missing-value'

export type MasterDataWarningTable = 'bom' | 'wc' | 'routing'

export interface MasterDataWarningItem {
  id: string
  role: MasterDataRole
  table: MasterDataWarningTable
  rowId: string
  field: string
  category: MasterDataWarningCategory
  label: string
}

export interface MasterDataWarningGroup {
  category: MasterDataWarningCategory
  label: string
  items: MasterDataWarningItem[]
}

export function areMasterDataDatasetsReady(
  handoff: Pick<MasterDataHandoffStatus, 'referenceReady' | 'currentReady' | 'datasetsPrepared'>,
  warningItems: readonly MasterDataWarningItem[]
): boolean {
  return handoff.referenceReady
    && handoff.currentReady
    && handoff.datasetsPrepared
    && !warningItems.some(item => item.category === 'missing-value' && item.role !== 'custom')
}

export const MASTER_DATA_WARNING_CATEGORY_DEFINITIONS: ReadonlyArray<{
  category: MasterDataWarningCategory
  label: string
}> = [
  { category: 'generated-identity', label: 'Generated identity' },
  { category: 'missing-value', label: 'Missing required value' },
  { category: 'auto-renamed-duplicate', label: 'Auto-renamed duplicate' }
]

const roleLabels: Record<MasterDataRole, string> = {
  reference: 'Reference',
  current: 'Current',
  custom: 'Custom'
}

const tableLabels: Record<MasterDataWarningTable, string> = {
  bom: 'BOM',
  wc: 'Work Centers',
  routing: 'Routing'
}

const fieldLabels: Record<string, string> = {
  description: 'Name',
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
): MasterDataWarningItem {
  const label = `${roleLabels[role]} · ${tableLabels[table]} · Row ${rowNumber} · ${fieldLabels[field] ?? field}`
  return { id: `${role}.${table}.${rowId}.${field}.${category}`, role, table, rowId, field, category, label }
}

function addNumericWarnings(
  result: MasterDataWarningItem[],
  role: MasterDataRole,
  table: MasterDataWarningTable,
  row: IdentityRow,
  rowNumber: number,
  field: string,
  value: unknown
): void {
  if (row.confidence?.[field]?.quality === 'invalid') return
  if (value === null || value === undefined || value === '') {
    result.push(warningItem(role, table, row.id, field, 'missing-value', rowNumber))
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
      if (row.isGeneratedBusinessIdentity) {
        warnings.push(warningItem(role, 'bom', row.id, 'description', 'generated-identity', rowNumber))
      }
      if (row.autoRenamedFrom) {
        warnings.push(warningItem(role, 'bom', row.id, 'description', 'auto-renamed-duplicate', rowNumber))
      }
      addNumericWarnings(warnings, role, 'bom', row, rowNumber, 'consumption', row.consumption)
      addNumericWarnings(warnings, role, 'bom', row, rowNumber, 'price', row.price)
      addNumericWarnings(warnings, role, 'bom', row, rowNumber, 'loss', row.loss)
    })

    snapshot.rates.forEach((row, index) => {
      const rowNumber = index + 1
      if (row.isGeneratedBusinessIdentity) {
        warnings.push(warningItem(role, 'wc', row.id, 'workCenterCode', 'generated-identity', rowNumber))
      }
      if (row.autoRenamedFrom) {
        warnings.push(warningItem(role, 'wc', row.id, 'workCenterCode', 'auto-renamed-duplicate', rowNumber))
      }
      addNumericWarnings(warnings, role, 'wc', row, rowNumber, 'laborRate', row.laborRate)
      addNumericWarnings(warnings, role, 'wc', row, rowNumber, 'burdenRate', row.burdenRate)
    })

    snapshot.routing.forEach((row, index) => {
      const rowNumber = index + 1
      if (row.isGeneratedBusinessIdentity) {
        warnings.push(warningItem(role, 'routing', row.id, 'processName', 'generated-identity', rowNumber))
      }
      if (row.autoRenamedFrom) {
        warnings.push(warningItem(role, 'routing', row.id, 'processName', 'auto-renamed-duplicate', rowNumber))
      }
      addNumericWarnings(warnings, role, 'routing', row, rowNumber, 'manning', row.manning)
      addNumericWarnings(warnings, role, 'routing', row, rowNumber, 'capacity', row.capacity)
      addNumericWarnings(warnings, role, 'routing', row, rowNumber, 'yield', row.yield)
      const workCenterId = row.workCenterId?.trim()
      if (!workCenterId) {
        warnings.push(warningItem(role, 'routing', row.id, 'workCenterId', 'missing-value', rowNumber))
      }
    })
  })

  return warnings
}

export function groupMasterDataWarnings(items: MasterDataWarningItem[]): MasterDataWarningGroup[] {
  return MASTER_DATA_WARNING_CATEGORY_DEFINITIONS.map(({ category, label }) => ({
    category,
    label,
    items: items.filter(item => item.category === category)
  }))
}

export function countMasterDataWarningsByRole(items: MasterDataWarningItem[]): Record<MasterDataRole, number> {
  return items.reduce<Record<MasterDataRole, number>>((counts, item) => {
    counts[item.role] += 1
    return counts
  }, { reference: 0, current: 0, custom: 0 })
}
