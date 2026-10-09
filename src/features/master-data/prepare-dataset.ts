import type { CostSnapshot, MasterDataRole } from '../../core/types'
import { normalizeMasterDataSnapshot } from '../../core/utils/master-data-effective'

export type MasterDataWarningCategory =
  | 'generated-identity'
  | 'auto-renamed-duplicate'
  | 'missing-value'
  | 'invalid-value'
  | 'unresolved-work-center'

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

const warningCategoryOrder: MasterDataWarningCategory[] = [
  'generated-identity',
  'auto-renamed-duplicate',
  'missing-value',
  'invalid-value',
  'unresolved-work-center'
]

const warningCategoryLabels: Record<MasterDataWarningCategory, string> = {
  'generated-identity': 'Generated names',
  'auto-renamed-duplicate': 'Auto-renamed duplicates',
  'missing-value': 'Missing parameters',
  'invalid-value': 'Invalid values',
  'unresolved-work-center': 'Unavailable Work Center references'
}

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

function normalized(value: string): string {
  return value.trim().toLocaleLowerCase()
}

function getIdentity(row: IdentityRow, field: string): string {
  return String((row as unknown as Record<string, unknown>)[field] ?? '')
}

function warningItem(
  role: MasterDataRole,
  table: MasterDataWarningTable,
  rowId: string,
  field: string,
  category: MasterDataWarningCategory,
  description: string
): MasterDataWarningItem {
  const label = `${roleLabels[role]} · ${tableLabels[table]} · ${description}`
  return { id: `${role}.${table}.${rowId}.${field}.${category}`, role, table, rowId, field, category, label }
}

function addNumericWarnings(
  result: MasterDataWarningItem[],
  role: MasterDataRole,
  table: MasterDataWarningTable,
  row: IdentityRow,
  field: string,
  value: unknown,
  requirePositive = false,
  max?: number
): void {
  const isInvalid = row.confidence?.[field]?.quality === 'invalid' ||
    (value !== null && value !== undefined && value !== '' &&
      (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || (requirePositive && value <= 0) || (max !== undefined && typeof value === 'number' && value > max)))
  if (isInvalid) {
    result.push(warningItem(role, table, row.id, field, 'invalid-value', `${getIdentity(row, table === 'bom' ? 'description' : table === 'wc' ? 'workCenterCode' : 'processName')} · ${fieldLabels[field]}`))
    return
  }

  if (value === null || value === undefined || value === '') {
    result.push(warningItem(role, table, row.id, field, 'missing-value', `${getIdentity(row, table === 'bom' ? 'description' : table === 'wc' ? 'workCenterCode' : 'processName')} · ${fieldLabels[field]}`))
  }
}

export function buildMasterDataWarningItems(
  snapshots: Record<MasterDataRole, CostSnapshot>
): MasterDataWarningItem[] {
  const warnings: MasterDataWarningItem[] = []

  ;(['reference', 'current', 'custom'] as const).forEach(role => {
    const snapshot = normalizeMasterDataSnapshot(snapshots[role])

    snapshot.bom.forEach(row => {
      const identity = row.description.trim()
      if (row.isGeneratedBusinessIdentity) {
        warnings.push(warningItem(role, 'bom', row.id, 'description', 'generated-identity', identity))
      }
      if (row.autoRenamedFrom) {
        warnings.push(warningItem(role, 'bom', row.id, 'description', 'auto-renamed-duplicate', `${row.autoRenamedFrom} → ${identity}`))
      }
      addNumericWarnings(warnings, role, 'bom', row, 'consumption', row.consumption)
      addNumericWarnings(warnings, role, 'bom', row, 'price', row.price)
      addNumericWarnings(warnings, role, 'bom', row, 'loss', row.loss)
    })

    snapshot.rates.forEach(row => {
      const identity = row.workCenterCode.trim()
      if (row.isGeneratedBusinessIdentity) {
        warnings.push(warningItem(role, 'wc', row.id, 'workCenterCode', 'generated-identity', identity))
      }
      if (row.autoRenamedFrom) {
        warnings.push(warningItem(role, 'wc', row.id, 'workCenterCode', 'auto-renamed-duplicate', `${row.autoRenamedFrom} → ${identity}`))
      }
      addNumericWarnings(warnings, role, 'wc', row, 'laborRate', row.laborRate)
      addNumericWarnings(warnings, role, 'wc', row, 'burdenRate', row.burdenRate)
    })

    const workCenterIds = new Set(snapshot.rates.map(row => normalized(row.workCenterCode)))
    snapshot.routing.forEach(row => {
      const identity = row.processName.trim()
      if (row.isGeneratedBusinessIdentity) {
        warnings.push(warningItem(role, 'routing', row.id, 'processName', 'generated-identity', identity))
      }
      if (row.autoRenamedFrom) {
        warnings.push(warningItem(role, 'routing', row.id, 'processName', 'auto-renamed-duplicate', `${row.autoRenamedFrom} → ${identity}`))
      }
      addNumericWarnings(warnings, role, 'routing', row, 'manning', row.manning)
      addNumericWarnings(warnings, role, 'routing', row, 'capacity', row.capacity, true)
      addNumericWarnings(warnings, role, 'routing', row, 'yield', row.yield, true, 1)
      if (!row.workCenterId?.trim() || !workCenterIds.has(normalized(row.workCenterId))) {
        warnings.push(warningItem(role, 'routing', row.id, 'workCenterId', 'unresolved-work-center', `${identity} · ${row.workCenterId?.trim() || 'Missing Work Center'}`))
      }
    })
  })

  return warnings
}

export function groupMasterDataWarnings(items: MasterDataWarningItem[]): MasterDataWarningGroup[] {
  return warningCategoryOrder.flatMap(category => {
    const categoryItems = items.filter(item => item.category === category)
    return categoryItems.length ? [{ category, label: warningCategoryLabels[category], items: categoryItems }] : []
  })
}
