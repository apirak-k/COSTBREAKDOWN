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

function diffFields<T extends SnapshotRow>(
  reference: T | undefined,
  current: T | undefined,
  fields: string[]
): Record<string, { reference: unknown; current: unknown }> {
  const diffs: Record<string, { reference: unknown; current: unknown }> = {}
  fields.forEach(field => {
    const referenceValue = reference ? (reference as unknown as Record<string, unknown>)[field] : undefined
    const currentValue = current ? (current as unknown as Record<string, unknown>)[field] : undefined
    if (!Object.is(referenceValue, currentValue)) {
      diffs[field] = { reference: referenceValue, current: currentValue }
    }
  })
  return diffs
}

function compareRows<T extends SnapshotRow>(
  referenceRows: T[],
  currentRows: T[],
  keyOf: (row: T) => string,
  fields: string[],
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
        confidence: combinedConfidence(references[0], currents[0])
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
      fieldDiffs: diffFields(reference, current, fields),
      confidence: combinedConfidence(reference, current)
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
    totalGap: currentCost.total - referenceCost.total,
    elementGaps: {
      material: currentCost.material - referenceCost.material,
      labor: currentCost.labor - referenceCost.labor,
      burden: currentCost.burden - referenceCost.burden
    },
    bomFindings: compareRows(reference.bom, current.bom, bomKey, ['itemCode', 'description', 'consumption', 'unit', 'price', 'loss'], bomFlags),
    routingFindings: compareRows(reference.routing, current.routing, routingKey, ['sequence', 'processName', 'workCenterId', 'manning', 'capacity', 'yield'], routingFlags),
    workCenterFindings: compareRows(reference.rates, current.rates, rateKey, ['workCenterCode', 'description', 'laborRate', 'burdenRate', 'effectiveDate'], rateFlags),
    warnings
  }
}
