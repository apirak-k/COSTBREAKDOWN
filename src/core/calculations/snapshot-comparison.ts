import {
  ChangeFlags,
  ComparisonFinding,
  ComparisonWarning,
  ConfidenceStatus,
  CostComparison,
  CostSnapshot,
  FieldEvidence,
  SnapshotBOMItem,
  SnapshotRoutingStep,
  SnapshotWorkCenterRate
} from '../types'
import { calculateSnapshotCost } from './snapshot-cost'

type SnapshotRow = {
  id: string
  confidence: Record<string, FieldEvidence>
  additionalFields?: Record<string, unknown>
}

function normalizeKey(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? ''
}

function confidenceOf(row: SnapshotRow | undefined): ConfidenceStatus {
  if (!row) return 'missing'
  const statuses = Object.values(row.confidence).map(field => field.status)
  if (statuses.includes('missing')) return 'missing'
  if (statuses.includes('estimated')) return 'estimated'
  return 'verified'
}

function combinedConfidence(reference: SnapshotRow | undefined, current: SnapshotRow | undefined): ConfidenceStatus {
  const statuses = [confidenceOf(reference), confidenceOf(current)]
  if (statuses.includes('missing')) return 'missing'
  if (statuses.includes('estimated')) return 'estimated'
  return 'verified'
}

const COMPARISON_METADATA_FIELDS = new Set(['id', 'confidence', 'sourceRef', 'additionalFields'])

function valuesEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true
  if (left instanceof Date && right instanceof Date) return left.getTime() === right.getTime()
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) && Array.isArray(right)
      && left.length === right.length
      && left.every((value, index) => valuesEqual(value, right[index]))
  }
  if (left && right && typeof left === 'object' && typeof right === 'object') {
    const leftKeys = Object.keys(left).sort()
    const rightKeys = Object.keys(right).sort()
    return leftKeys.length === rightKeys.length
      && leftKeys.every((key, index) => key === rightKeys[index]
        && valuesEqual((left as Record<string, unknown>)[key], (right as Record<string, unknown>)[key]))
  }
  return false
}

function addAdditionalFieldDiffs(
  diffs: Record<string, { reference: unknown; current: unknown }>,
  reference: Record<string, unknown> | undefined,
  current: Record<string, unknown> | undefined
): void {
  const keys = new Set([...Object.keys(reference ?? {}), ...Object.keys(current ?? {})])
  keys.forEach(key => {
    const referenceValue = reference?.[key]
    const currentValue = current?.[key]
    if (!valuesEqual(referenceValue, currentValue)) {
      diffs[`additionalFields.${key}`] = { reference: referenceValue, current: currentValue }
    }
  })
}

function hasAdditionalFields(row: SnapshotRow | undefined): boolean {
  return Object.keys(row?.additionalFields ?? {}).length > 0
}

function diffSupportedFields<T extends SnapshotRow>(
  reference: T,
  current: T
): Record<string, { reference: unknown; current: unknown }> {
  const diffs: Record<string, { reference: unknown; current: unknown }> = {}
  const fields = new Set([...Object.keys(reference), ...Object.keys(current)])
  fields.forEach(field => {
    if (COMPARISON_METADATA_FIELDS.has(field)) return
    const referenceValue = (reference as unknown as Record<string, unknown>)[field]
    const currentValue = (current as unknown as Record<string, unknown>)[field]
    if (!valuesEqual(referenceValue, currentValue)) {
      diffs[field] = { reference: referenceValue, current: currentValue }
    }
  })
  addAdditionalFieldDiffs(diffs, reference.additionalFields, current.additionalFields)
  return diffs
}

function diffProductFields(reference: CostSnapshot['product'], current: CostSnapshot['product']): Record<string, { reference: unknown; current: unknown }> {
  const diffs: Record<string, { reference: unknown; current: unknown }> = {}
  const metadata = new Set(['additionalFields'])
  const fields = new Set([...Object.keys(reference), ...Object.keys(current)])
  fields.forEach(field => {
    if (metadata.has(field)) return
    const referenceValue = (reference as unknown as Record<string, unknown>)[field]
    const currentValue = (current as unknown as Record<string, unknown>)[field]
    if (!valuesEqual(referenceValue, currentValue)) diffs[field] = { reference: referenceValue, current: currentValue }
  })
  addAdditionalFieldDiffs(diffs, reference.additionalFields, current.additionalFields)
  return diffs
}

function compareRows<T extends SnapshotRow>(
  referenceRows: T[],
  currentRows: T[],
  keyOf: (row: T) => string,
  flagsOf: (reference: T, current: T) => ChangeFlags
): ComparisonFinding[] {
  const referenceMap = new Map<string, T[]>()
  const currentMap = new Map<string, T[]>()

  referenceRows.forEach(row => {
    const key = keyOf(row)
    if (!key) return
    referenceMap.set(key, [...(referenceMap.get(key) ?? []), row])
  })
  currentRows.forEach(row => {
    const key = keyOf(row)
    if (!key) return
    currentMap.set(key, [...(currentMap.get(key) ?? []), row])
  })

  const keys = new Set([...referenceMap.keys(), ...currentMap.keys()])
  const findings: ComparisonFinding[] = []

  keys.forEach(key => {
    const references = referenceMap.get(key) ?? []
    const currents = currentMap.get(key) ?? []

    if (references.length !== 1 || currents.length !== 1) {
      const matchStatus = references.length > 1 || currents.length > 1
        ? 'ambiguous'
        : references.length === 0 && currents.length === 1
          ? 'added'
          : references.length === 1 && currents.length === 0
            ? 'removed'
            : 'unmatched'
      findings.push({
        referenceId: references[0]?.id,
        currentId: currents[0]?.id,
        matchStatus,
        changeFlags: {},
        fieldDiffs: {},
        confidence: combinedConfidence(references[0], currents[0]),
        reviewRequired: hasAdditionalFields(references[0]) || hasAdditionalFields(currents[0])
      })
      return
    }

    const reference = references[0]
    const current = currents[0]
    findings.push({
      referenceId: reference.id,
      currentId: current.id,
      matchStatus: 'matched',
      changeFlags: flagsOf(reference, current),
      fieldDiffs: diffSupportedFields(reference, current),
      confidence: combinedConfidence(reference, current),
      reviewRequired: hasAdditionalFields(reference) || hasAdditionalFields(current)
    })
  })

  return findings
}

function bomKey(row: SnapshotBOMItem): string {
  return normalizeKey(row.itemCode) || `id:${row.id}`
}

function routingKey(row: SnapshotRoutingStep): string {
  return normalizeKey(row.operationCode) || normalizeKey(row.processCode) || normalizeKey(row.processName) || `id:${row.id}`
}

function rateKey(row: SnapshotWorkCenterRate): string {
  return normalizeKey(row.workCenterCode) || `id:${row.id}`
}

function bomFlags(): ChangeFlags {
  return {}
}

function routingFlags(reference: SnapshotRoutingStep, current: SnapshotRoutingStep): ChangeFlags {
  return {
    reordered: reference.sequence !== current.sequence,
    movedWorkCenter: reference.workCenterId !== current.workCenterId,
    changedInputs: reference.manning !== current.manning || reference.capacity !== current.capacity || reference.yield !== current.yield
  }
}

function rateFlags(reference: SnapshotWorkCenterRate, current: SnapshotWorkCenterRate): ChangeFlags {
  return {
    changedRate: reference.laborRate !== current.laborRate || reference.burdenRate !== current.burdenRate
  }
}

function calculationWarnings(snapshotId: string, warnings: string[]): ComparisonWarning[] {
  return warnings.map(message => ({
    code: 'CALCULATION_WARNING',
    message: `${snapshotId}: ${message}`
  }))
}

function gap(current: number | null, reference: number | null): number | null {
  if (current === null || reference === null) return null
  return current - reference
}

/** Calculates both snapshots independently and then returns explicit comparison findings. */
export function compareSnapshots(reference: CostSnapshot, current: CostSnapshot): CostComparison {
  const referenceCost = calculateSnapshotCost(reference)
  const currentCost = calculateSnapshotCost(current)
  const warnings = [
    ...calculationWarnings(reference.id, referenceCost.warnings),
    ...calculationWarnings(current.id, currentCost.warnings)
  ]

  return {
    id: `${reference.id}::${current.id}`,
    referenceSnapshotId: reference.id,
    currentSnapshotId: current.id,
    referenceCost,
    currentCost,
    totalGap: gap(currentCost.total, referenceCost.total),
    elementGaps: {
      material: gap(currentCost.material, referenceCost.material),
      labor: gap(currentCost.labor, referenceCost.labor),
      burden: gap(currentCost.burden, referenceCost.burden)
    },
    bomFindings: compareRows(reference.bom, current.bom, bomKey, bomFlags),
    routingFindings: compareRows(reference.routing, current.routing, routingKey, routingFlags),
    workCenterFindings: compareRows(reference.rates, current.rates, rateKey, rateFlags),
    productFieldDiffs: diffProductFields(reference.product, current.product),
    warnings
  }
}
