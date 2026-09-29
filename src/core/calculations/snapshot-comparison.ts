import {
  ChangeFlags,
  ComparisonFinding,
  ComparisonWarning,
  ConfidenceStatus,
  ComparisonRecordCostEffect,
  CostComparison,
  CostSnapshot,
  FieldEvidence,
  SnapshotBOMItem,
  SnapshotRoutingStep,
  SnapshotWorkCenterRate,
  WorkCenterProcessingFinding
} from '../types'
import { calculateSnapshotCost } from './snapshot-cost'
import { calculateSnapshotBOMDetail } from './snapshot-bom-detail'
import { calculateSnapshotRoutingDetail } from './snapshot-routing-detail'
import { excludeGeneratedSizingPlaceholders } from '../utils/sizing'

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

const COMPARISON_METADATA_FIELDS = new Set([
  'id',
  'confidence',
  'sourceRef',
  'additionalFields',
  'note',
  // Legacy columns excluded from the neutral dataset schema.
  'effectiveDate',
  'processCode'
])

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
    if (key.trim().toLowerCase() === 'note') return
    const referenceValue = reference?.[key]
    const currentValue = current?.[key]
    if (!valuesEqual(referenceValue, currentValue)) {
      diffs[`additionalFields.${key}`] = { reference: referenceValue, current: currentValue }
    }
  })
}

function hasAdditionalFields(row: SnapshotRow | undefined): boolean {
  return Object.keys(row?.additionalFields ?? {}).some(key => key.trim().toLowerCase() !== 'note')
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
  const metadata = new Set(['additionalFields', 'note', 'effectiveDate'])
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
  section: string,
  referenceRows: T[],
  currentRows: T[],
  keyOf: (row: T) => string,
  flagsOf: (reference: T, current: T) => ChangeFlags,
  calculateRecordCostEffect?: (reference: T | undefined, current: T | undefined) => ComparisonRecordCostEffect,
  warnings: ComparisonWarning[] = []
): ComparisonFinding[] {
  const referenceMap = new Map<string, T[]>()
  const currentMap = new Map<string, T[]>()
  const findings: ComparisonFinding[] = []

  referenceRows.forEach(row => {
    const key = keyOf(row)
    if (!key) {
      warnings.push({
        code: 'MISSING_BUSINESS_KEY',
        message: `Reference ${section} row "${row.id}" has no stable business key; it was not matched.`,
        referenceId: row.id
      })
      findings.push({ referenceId: row.id, matchStatus: 'unmatched', changeFlags: {}, fieldDiffs: {}, costGap: null, confidence: confidenceOf(row), reviewRequired: true })
      return
    }
    referenceMap.set(key, [...(referenceMap.get(key) ?? []), row])
  })
  currentRows.forEach(row => {
    const key = keyOf(row)
    if (!key) {
      warnings.push({
        code: 'MISSING_BUSINESS_KEY',
        message: `Current ${section} row "${row.id}" has no stable business key; it was not matched.`,
        currentId: row.id
      })
      findings.push({ currentId: row.id, matchStatus: 'unmatched', changeFlags: {}, fieldDiffs: {}, costGap: null, confidence: confidenceOf(row), reviewRequired: true })
      return
    }
    currentMap.set(key, [...(currentMap.get(key) ?? []), row])
  })

  const keys = new Set([...referenceMap.keys(), ...currentMap.keys()])

  keys.forEach(key => {
    const references = referenceMap.get(key) ?? []
    const currents = currentMap.get(key) ?? []

    if (references.length > 1 || currents.length > 1) {
      warnings.push({
        code: 'AMBIGUOUS_KEY',
        message: `Duplicate key "${key}" found in ${references.length > 1 ? 'Reference' : ''} ${currents.length > 1 ? 'Current' : ''}`.trim()
      })
      references.forEach(row => findings.push({ referenceId: row.id, matchStatus: 'ambiguous', changeFlags: {}, fieldDiffs: {}, costGap: null, confidence: confidenceOf(row), reviewRequired: true }))
      currents.forEach(row => findings.push({ currentId: row.id, matchStatus: 'ambiguous', changeFlags: {}, fieldDiffs: {}, costGap: null, confidence: confidenceOf(row), reviewRequired: true }))
      return
    }

    if (references.length === 0 && currents.length === 1) {
      const current = currents[0]
      const costEffect = calculateRecordCostEffect?.(undefined, current)
      findings.push({
        referenceId: undefined,
        currentId: current.id,
        matchStatus: 'added',
        changeFlags: {},
        fieldDiffs: {},
        costGap: costEffect?.gap.total ?? null,
        costEffect,
        confidence: confidenceOf(current),
        reviewRequired: hasAdditionalFields(current)
      })
      return
    }

    if (references.length === 1 && currents.length === 0) {
      const reference = references[0]
      const costEffect = calculateRecordCostEffect?.(reference, undefined)
      findings.push({
        referenceId: reference.id,
        currentId: undefined,
        matchStatus: 'removed',
        changeFlags: {},
        fieldDiffs: {},
        costGap: costEffect?.gap.total ?? null,
        costEffect,
        confidence: confidenceOf(reference),
        reviewRequired: hasAdditionalFields(reference)
      })
      return
    }

    const reference = references[0]
    const current = currents[0]
    const costEffect = calculateRecordCostEffect?.(reference, current)
    findings.push({
      referenceId: reference.id,
      currentId: current.id,
      matchStatus: 'matched',
      changeFlags: flagsOf(reference, current),
      fieldDiffs: diffSupportedFields(reference, current),
      costGap: costEffect?.gap.total ?? null,
      costEffect,
      confidence: combinedConfidence(reference, current),
      reviewRequired: hasAdditionalFields(reference) || hasAdditionalFields(current)
    })
  })

  return findings
}

function bomKey(row: SnapshotBOMItem): string {
  return normalizeKey(row.itemCode)
}

function routingKey(row: SnapshotRoutingStep): string {
  return normalizeKey(row.operationCode)
}

function rateKey(row: SnapshotWorkCenterRate): string {
  return normalizeKey(row.workCenterCode)
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

function materialCostEffect(reference: SnapshotBOMItem | undefined, current: SnapshotBOMItem | undefined): ComparisonRecordCostEffect {
  const detail = calculateSnapshotBOMDetail({ reference, current })
  return {
    reference: { material: detail.referenceCost, labor: 0, burden: 0, total: detail.referenceCost },
    current: { material: detail.currentCost, labor: 0, burden: 0, total: detail.currentCost },
    gap: { material: detail.costGap, labor: 0, burden: 0, total: detail.costGap }
  }
}

function routingCostEffect(
  reference: SnapshotRoutingStep | undefined,
  current: SnapshotRoutingStep | undefined,
  referenceRates: SnapshotWorkCenterRate[],
  currentRates: SnapshotWorkCenterRate[]
): ComparisonRecordCostEffect {
  const detail = calculateSnapshotRoutingDetail({ reference, current }, referenceRates, currentRates)
  const laborGap = gap(detail.currentLaborCost, detail.referenceLaborCost)
  const burdenGap = gap(detail.currentBurdenCost, detail.referenceBurdenCost)
  return {
    reference: { material: 0, labor: detail.referenceLaborCost, burden: detail.referenceBurdenCost, total: detail.referenceTotal },
    current: { material: 0, labor: detail.currentLaborCost, burden: detail.currentBurdenCost, total: detail.currentTotal },
    gap: { material: 0, labor: laborGap, burden: burdenGap, total: detail.totalGap }
  }
}

function sumRecordEffects(findings: ComparisonFinding[], element: keyof ComparisonRecordCostEffect['gap']): number | null {
  let total = 0
  for (const finding of findings) {
    if (finding.matchStatus === 'ambiguous' || finding.matchStatus === 'unmatched') return null
    const effect = finding.costEffect?.gap[element]
    if (effect === null || effect === undefined) return null
    total += effect
  }
  return total
}

function difference(left: number | null, right: number | null): number | null {
  return left === null || right === null ? null : Math.abs(left - right)
}

function gap(current: number | null, reference: number | null): number | null {
  if (current === null || reference === null) return null
  return current - reference
}

function addCost(total: number | null, value: number | null): number | null {
  return total === null || value === null ? null : total + value
}

function routingSignature(steps: SnapshotRoutingStep[]): string {
  const signatures = steps.map(step => JSON.stringify([
    normalizeKey(step.operationCode),
    step.processName,
    step.sequence,
    normalizeKey(step.workCenterId),
    step.manning,
    step.capacity,
    step.yield
  ])).sort((left, right) => left.localeCompare(right))
  return JSON.stringify(signatures)
}

function groupRoutingByWorkCenter(steps: SnapshotRoutingStep[]): Map<string, SnapshotRoutingStep[]> {
  const groups = new Map<string, SnapshotRoutingStep[]>()
  for (const step of steps) {
    const key = normalizeKey(step.workCenterId)
    if (!key) continue
    groups.set(key, [...(groups.get(key) ?? []), step])
  }
  return groups
}

function aggregateRoutingCost(
  steps: SnapshotRoutingStep[],
  side: 'reference' | 'current',
  referenceRates: SnapshotWorkCenterRate[],
  currentRates: SnapshotWorkCenterRate[]
): { labor: number | null; burden: number | null; total: number | null } {
  let labor: number | null = 0
  let burden: number | null = 0
  for (const step of steps) {
    const detail = calculateSnapshotRoutingDetail(
      side === 'reference' ? { reference: step } : { current: step },
      referenceRates,
      currentRates
    )
    labor = addCost(labor, side === 'reference' ? detail.referenceLaborCost : detail.currentLaborCost)
    burden = addCost(burden, side === 'reference' ? detail.referenceBurdenCost : detail.currentBurdenCost)
  }
  return { labor, burden, total: addCost(labor, burden) }
}

function processingCostEffect(
  reference: { labor: number | null; burden: number | null; total: number | null },
  current: { labor: number | null; burden: number | null; total: number | null }
): ComparisonRecordCostEffect {
  return {
    reference: { material: 0, labor: reference.labor, burden: reference.burden, total: reference.total },
    current: { material: 0, labor: current.labor, burden: current.burden, total: current.total },
    gap: {
      material: 0,
      labor: gap(current.labor, reference.labor),
      burden: gap(current.burden, reference.burden),
      total: gap(current.total, reference.total)
    }
  }
}

function buildProcessingFindings(
  referenceRouting: SnapshotRoutingStep[],
  currentRouting: SnapshotRoutingStep[],
  referenceRates: SnapshotWorkCenterRate[],
  currentRates: SnapshotWorkCenterRate[],
  workCenterFindings: ComparisonFinding[]
): WorkCenterProcessingFinding[] {
  const referenceByWorkCenter = groupRoutingByWorkCenter(referenceRouting)
  const currentByWorkCenter = groupRoutingByWorkCenter(currentRouting)
  const referenceRatesById = new Map(referenceRates.map(rate => [rate.id, rate]))
  const currentRatesById = new Map(currentRates.map(rate => [rate.id, rate]))
  const changedRateWorkCenters = new Set<string>()

  for (const finding of workCenterFindings) {
    const changed = finding.matchStatus === 'added'
      || finding.matchStatus === 'removed'
      || finding.changeFlags.changedRate === true
    if (!changed) continue
    const referenceRate = finding.referenceId ? referenceRatesById.get(finding.referenceId) : undefined
    const currentRate = finding.currentId ? currentRatesById.get(finding.currentId) : undefined
    if (referenceRate) changedRateWorkCenters.add(normalizeKey(referenceRate.workCenterCode))
    if (currentRate) changedRateWorkCenters.add(normalizeKey(currentRate.workCenterCode))
  }

  const findings: WorkCenterProcessingFinding[] = []
  const keys = new Set([...referenceByWorkCenter.keys(), ...currentByWorkCenter.keys()])
  for (const workCenterKey of keys) {
    const referenceSteps = referenceByWorkCenter.get(workCenterKey) ?? []
    const currentSteps = currentByWorkCenter.get(workCenterKey) ?? []
    const referenceRate = referenceRates.find(rate => normalizeKey(rate.workCenterCode) === workCenterKey)
    const currentRate = currentRates.find(rate => normalizeKey(rate.workCenterCode) === workCenterKey)
    const hasReference = referenceSteps.length > 0
    const hasCurrent = currentSteps.length > 0
    const matchStatus = !hasReference ? 'added' : !hasCurrent ? 'removed' : 'matched'
    const changeFlags = {
      changedInputs: hasReference && hasCurrent
        && routingSignature(referenceSteps) !== routingSignature(currentSteps),
      changedRate: changedRateWorkCenters.has(workCenterKey)
    }
    const referenceCost = hasReference
      ? aggregateRoutingCost(referenceSteps, 'reference', referenceRates, currentRates)
      : { labor: 0, burden: 0, total: 0 }
    const currentCost = hasCurrent
      ? aggregateRoutingCost(currentSteps, 'current', referenceRates, currentRates)
      : { labor: 0, burden: 0, total: 0 }
    const costEffect = processingCostEffect(referenceCost, currentCost)
    const rate = currentRate ?? referenceRate
    const route = currentSteps[0] ?? referenceSteps[0]

    findings.push({
      workCenterCode: rate?.workCenterCode ?? route?.workCenterId ?? workCenterKey.toUpperCase(),
      workCenterDescription: rate?.description,
      sourceId: rate?.id ?? workCenterKey,
      sourceRef: currentRate?.sourceRef ?? route?.sourceRef ?? referenceRate?.sourceRef,
      matchStatus,
      changeFlags,
      fieldDiffs: {},
      costGap: costEffect.gap.total,
      costEffect,
      confidence: 'verified'
    })
  }

  return findings
}

/** Calculates both snapshots independently and then returns explicit comparison findings. */
export function compareSnapshots(reference: CostSnapshot, current: CostSnapshot): CostComparison {
  const referenceCost = calculateSnapshotCost(reference)
  const currentCost = calculateSnapshotCost(current)
  const referenceBom = excludeGeneratedSizingPlaceholders(reference.bom)
  const currentBom = excludeGeneratedSizingPlaceholders(current.bom)
  const referenceRouting = excludeGeneratedSizingPlaceholders(reference.routing)
  const currentRouting = excludeGeneratedSizingPlaceholders(current.routing)
  const referenceRates = excludeGeneratedSizingPlaceholders(reference.rates)
  const currentRates = excludeGeneratedSizingPlaceholders(current.rates)
  const warnings: ComparisonWarning[] = [
    ...calculationWarnings(reference.id, referenceCost.warnings),
    ...calculationWarnings(current.id, currentCost.warnings)
  ]

  const bomFindings = compareRows(
    'BOM',
    referenceBom,
    currentBom,
    bomKey,
    bomFlags,
    materialCostEffect,
    warnings
  )

  const routingFindings = compareRows(
    'Routing',
    referenceRouting,
    currentRouting,
    routingKey,
    routingFlags,
    (ref, cur) => routingCostEffect(ref, cur, referenceRates, currentRates),
    warnings
  )

  const workCenterFindings = compareRows(
    'Work Center',
    referenceRates,
    currentRates,
    rateKey,
    rateFlags,
    undefined,
    warnings
  )

  const processingFindings = buildProcessingFindings(
    referenceRouting,
    currentRouting,
    referenceRates,
    currentRates,
    workCenterFindings
  )

  const materialGap = gap(currentCost.material, referenceCost.material)
  const laborGap = gap(currentCost.labor, referenceCost.labor)
  const burdenGap = gap(currentCost.burden, referenceCost.burden)
  const totalGap = gap(currentCost.total, referenceCost.total)

  const recordEffectGaps = {
    material: sumRecordEffects(bomFindings, 'material'),
    labor: sumRecordEffects(routingFindings, 'labor'),
    burden: sumRecordEffects(routingFindings, 'burden')
  }
  const recordEffectDiscrepancies = {
    material: difference(recordEffectGaps.material, materialGap),
    labor: difference(recordEffectGaps.labor, laborGap),
    burden: difference(recordEffectGaps.burden, burdenGap)
  }

  // Reconciliation check: material + labor + burden should equal total gap.
  const sumOfElementGaps = (materialGap !== null && laborGap !== null && burdenGap !== null)
    ? materialGap + laborGap + burdenGap
    : null
  const discrepancy = (totalGap !== null && sumOfElementGaps !== null)
    ? Math.abs(totalGap - sumOfElementGaps)
    : null
  const reconciliationIssues: string[] = []
  const reconciliationChecks = [
    { label: 'Material row effects vs Material gap', difference: recordEffectDiscrepancies.material },
    { label: 'Routing labor effects vs Labor gap', difference: recordEffectDiscrepancies.labor },
    { label: 'Routing burden effects vs Burden gap', difference: recordEffectDiscrepancies.burden },
    { label: 'Cost branches vs Total gap', difference: discrepancy }
  ]
  reconciliationChecks.forEach(check => {
    if (check.difference === null) {
      const issueMsg = `Unable to verify reconciliation: ${check.label} has unavailable values.`
      reconciliationIssues.push(issueMsg)
      warnings.push({ code: 'RECONCILIATION_UNAVAILABLE', message: issueMsg })
    } else if (check.difference >= 0.0001) {
      const issueMsg = `Reconciliation mismatch: ${check.label} differs by ${check.difference.toFixed(4)}.`
      reconciliationIssues.push(issueMsg)
      warnings.push({ code: 'RECONCILIATION_MISMATCH', message: issueMsg })
    }
  })
  const reconciled = reconciliationChecks.every(check => check.difference !== null && check.difference < 0.0001)

  return {
    id: `${reference.id}::${current.id}`,
    referenceSnapshotId: reference.id,
    currentSnapshotId: current.id,
    referenceCost,
    currentCost,
    totalGap,
    elementGaps: {
      material: materialGap,
      labor: laborGap,
      burden: burdenGap
    },
    bomFindings,
    routingFindings,
    workCenterFindings,
    processingFindings,
    productFieldDiffs: diffProductFields(reference.product, current.product),
    warnings,
    reconciliation: {
      reconciled,
      recordEffectGaps,
      recordEffectDiscrepancies,
      totalGap,
      sumOfElementGaps,
      discrepancy,
      issues: reconciliationIssues
    }
  }
}
