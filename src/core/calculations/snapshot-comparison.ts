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
import { areNumericValuesEquivalent, safeAdd } from '../utils/guards'
import {
  addExactDecimals,
  compareExactDecimals,
  exactDecimalInputValue,
  exactDecimalToNumber,
  exactDecimalToString,
  parseExactDecimal,
  subtractExactDecimals
} from '../utils/exact-decimal'

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
  'exactDecimalInputs',
  'sourceRef',
  'additionalFields',
  'note',
  'isGeneratedSizingPlaceholder',
  // Legacy columns excluded from the neutral dataset schema.
  'effectiveDate',
  'processCode',
  // Removed from the approved Master Data schemas; kept only by legacy adapters.
  'itemCode',
  'operationCode',
  'sequence'
])

function valuesEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true
  if (typeof left === 'number' && typeof right === 'number') return areNumericValuesEquivalent(left, right)
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

const EXACT_NUMERIC_FIELDS = new Set([
  'consumption', 'price', 'loss', 'manning', 'capacity', 'yield', 'laborRate', 'burdenRate', 'sellingPrice', 'sgaPercent'
])

function exactRowField(row: SnapshotRow, field: string) {
  const numeric = (row as unknown as Record<string, number | null | undefined>)[field]
  if (typeof numeric !== 'number') return null
  const exactInputs = (row as SnapshotRow & { exactDecimalInputs?: Record<string, string> }).exactDecimalInputs
  return exactDecimalInputValue(numeric, exactInputs?.[field], field === 'loss' || field === 'yield')
}

function equalSupportedField(field: string, reference: SnapshotRow, current: SnapshotRow): boolean {
  if (EXACT_NUMERIC_FIELDS.has(field)) {
    const referenceExact = exactRowField(reference, field)
    const currentExact = exactRowField(current, field)
    if (referenceExact && currentExact) return compareExactDecimals(referenceExact, currentExact) === 0
    return areNumericValuesEquivalent(
      (reference as unknown as Record<string, number | null>)[field],
      (current as unknown as Record<string, number | null>)[field]
    )
  }
  return valuesEqual(
    (reference as unknown as Record<string, unknown>)[field],
    (current as unknown as Record<string, unknown>)[field]
  )
}

function exactFieldDisplay(row: SnapshotRow, field: string): unknown {
  const exact = exactRowField(row, field)
  return exact ? exactDecimalToString(exact) : (row as unknown as Record<string, unknown>)[field]
}

function numericInputEqual(left: SnapshotRow, right: SnapshotRow, field: string): boolean {
  const exactLeft = exactRowField(left, field)
  const exactRight = exactRowField(right, field)
  if (exactLeft && exactRight) return compareExactDecimals(exactLeft, exactRight) === 0
  return areNumericValuesEquivalent(
    (left as unknown as Record<string, number | null>)[field],
    (right as unknown as Record<string, number | null>)[field]
  )
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
  current: T,
  ignoredFields: ReadonlySet<string> = new Set()
): Record<string, { reference: unknown; current: unknown }> {
  const diffs: Record<string, { reference: unknown; current: unknown }> = {}
  const fields = new Set([...Object.keys(reference), ...Object.keys(current)])
  fields.forEach(field => {
    if (COMPARISON_METADATA_FIELDS.has(field) || ignoredFields.has(field)) return
    const referenceValue = (reference as unknown as Record<string, unknown>)[field]
    const currentValue = (current as unknown as Record<string, unknown>)[field]
    if (!equalSupportedField(field, reference, current)) {
      diffs[field] = EXACT_NUMERIC_FIELDS.has(field)
        ? { reference: exactFieldDisplay(reference, field), current: exactFieldDisplay(current, field) }
        : { reference: referenceValue, current: currentValue }
    }
  })
  addAdditionalFieldDiffs(diffs, reference.additionalFields, current.additionalFields)
  return diffs
}

function diffProductFields(reference: CostSnapshot['product'], current: CostSnapshot['product']): Record<string, { reference: unknown; current: unknown }> {
  const diffs: Record<string, { reference: unknown; current: unknown }> = {}
  const metadata = new Set([
    'additionalFields',
    'note',
    'effectiveDate',
    // These fields are retained only by legacy Product-session adapters.
    'productCode',
    'productDescription',
    'customer'
  ])
  const fields = new Set([...Object.keys(reference), ...Object.keys(current)])
  fields.forEach(field => {
    if (metadata.has(field) || field === 'exactDecimalInputs') return
    const referenceValue = (reference as unknown as Record<string, unknown>)[field]
    const currentValue = (current as unknown as Record<string, unknown>)[field]
    if (EXACT_NUMERIC_FIELDS.has(field)) {
      const referenceExact = (reference as unknown as { exactDecimalInputs?: Record<string, string> }).exactDecimalInputs?.[field]
      const currentExact = (current as unknown as { exactDecimalInputs?: Record<string, string> }).exactDecimalInputs?.[field]
      const left = exactDecimalInputValue(referenceValue as number | null, referenceExact)
      const right = exactDecimalInputValue(currentValue as number | null, currentExact)
      const equal = left && right ? compareExactDecimals(left, right) === 0 : valuesEqual(referenceValue, currentValue)
      if (!equal) diffs[field] = {
        reference: left ? exactDecimalToString(left) : referenceValue,
        current: right ? exactDecimalToString(right) : currentValue
      }
    } else if (!valuesEqual(referenceValue, currentValue)) diffs[field] = { reference: referenceValue, current: currentValue }
  })
  addAdditionalFieldDiffs(diffs, reference.additionalFields, current.additionalFields)
  return diffs
}

function compareRows<T extends SnapshotRow>(
  section: string,
  referenceRows: T[],
  currentRows: T[],
  keyOf: (row: T) => string,
  flagsOf: (reference: T, current: T, costEffect?: ComparisonRecordCostEffect) => ChangeFlags,
  calculateRecordCostEffect?: (reference: T | undefined, current: T | undefined) => ComparisonRecordCostEffect,
  warnings: ComparisonWarning[] = [],
  ignoredFields: ReadonlySet<string> = new Set()
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
      findings.push({ referenceId: row.id, matchStatus: 'unmatched', changeFlags: {}, fieldDiffs: {}, costGap: null, confidence: 'missing', reviewRequired: true })
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
      findings.push({ currentId: row.id, matchStatus: 'unmatched', changeFlags: {}, fieldDiffs: {}, costGap: null, confidence: 'missing', reviewRequired: true })
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
      changeFlags: flagsOf(reference, current, costEffect),
      fieldDiffs: diffSupportedFields(reference, current, ignoredFields),
      costGap: costEffect?.gap.total ?? null,
      costEffect,
      confidence: combinedConfidence(reference, current),
      reviewRequired: hasAdditionalFields(reference) || hasAdditionalFields(current)
    })
  })

  return findings
}

function bomKey(row: SnapshotBOMItem): string {
  return normalizeKey(row.description)
}

function routingKey(row: SnapshotRoutingStep): string {
  return normalizeKey(row.processName)
}

function rateKey(row: SnapshotWorkCenterRate): string {
  return normalizeKey(row.workCenterCode)
}

function bomFlags(): ChangeFlags {
  return {}
}

function routingFlags(
  reference: SnapshotRoutingStep,
  current: SnapshotRoutingStep,
  costEffect?: ComparisonRecordCostEffect
): ChangeFlags {
  const movedWorkCenter = reference.workCenterId !== current.workCenterId
  const changedInputs = !numericInputEqual(reference, current, 'manning')
    || !numericInputEqual(reference, current, 'capacity')
    || !numericInputEqual(reference, current, 'yield')
  const changedRate = !movedWorkCenter && !changedInputs && [
    costEffect?.gap.labor,
    costEffect?.gap.burden,
    costEffect?.gap.total
  ].some(value => typeof value === 'number' && Number.isFinite(value) && value !== 0)

  return { movedWorkCenter, changedInputs, changedRate }
}

function rateFlags(reference: SnapshotWorkCenterRate, current: SnapshotWorkCenterRate): ChangeFlags {
  return {
    changedRate: !numericInputEqual(reference, current, 'laborRate')
      || !numericInputEqual(reference, current, 'burdenRate')
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
  const materialGap = detail.costGap
  return {
    reference: { material: detail.referenceCost, labor: 0, burden: 0, total: detail.referenceCost },
    current: { material: detail.currentCost, labor: 0, burden: 0, total: detail.currentCost },
    gap: { material: materialGap, labor: 0, burden: 0, total: materialGap }
  }
}

function routingCostEffect(
  reference: SnapshotRoutingStep | undefined,
  current: SnapshotRoutingStep | undefined,
  referenceRates: SnapshotWorkCenterRate[],
  currentRates: SnapshotWorkCenterRate[]
): ComparisonRecordCostEffect {
  const detail = calculateSnapshotRoutingDetail({ reference, current }, referenceRates, currentRates)
  const laborGap = gap(detail.currentLaborCost, detail.referenceLaborCost, detail.exactValues?.currentLaborCost, detail.exactValues?.referenceLaborCost)
  const burdenGap = gap(detail.currentBurdenCost, detail.referenceBurdenCost, detail.exactValues?.currentBurdenCost, detail.exactValues?.referenceBurdenCost)
  return {
    reference: { material: 0, labor: detail.referenceLaborCost, burden: detail.referenceBurdenCost, total: detail.referenceTotal },
    current: { material: 0, labor: detail.currentLaborCost, burden: detail.currentBurdenCost, total: detail.currentTotal },
    gap: {
      material: 0,
      labor: laborGap,
      burden: burdenGap,
      total: gap(detail.currentTotal, detail.referenceTotal, detail.exactValues?.currentTotal, detail.exactValues?.referenceTotal)
    }
  }
}

function sumRecordEffects(findings: ComparisonFinding[], element: keyof ComparisonRecordCostEffect['gap']): number | null {
  let total = 0
  for (const finding of findings) {
    if (finding.matchStatus === 'ambiguous' || finding.matchStatus === 'unmatched') return null
    const effect = finding.costEffect?.gap[element]
    if (effect === null || effect === undefined) return null
    const nextTotal = safeAdd(total, effect)
    if (nextTotal === null) return null
    total = nextTotal
  }
  return total
}

function difference(left: number | null, right: number | null): number | null {
  if (left === null || right === null) return null
  const value = safeAdd(left, -right)
  return value === null ? null : Math.abs(value)
}

function gap(current: number | null, reference: number | null, currentExact?: string | null, referenceExact?: string | null): number | null {
  if (current === null || reference === null) return null
  if (currentExact && referenceExact) {
    const exactGap = subtractExactDecimals(parseExactDecimal(currentExact)!, parseExactDecimal(referenceExact)!)
    return exactDecimalToNumber(exactGap)
  }
  return areNumericValuesEquivalent(current, reference) ? 0 : safeAdd(current, -reference)
}

function routingEquivalent(reference: SnapshotRoutingStep[], current: SnapshotRoutingStep[]): boolean {
  if (reference.length !== current.length) return false
  const remaining = [...current]
  return reference.every(referenceStep => {
    const index = remaining.findIndex(currentStep =>
      normalizeKey(referenceStep.processName) === normalizeKey(currentStep.processName)
      && normalizeKey(referenceStep.workCenterId) === normalizeKey(currentStep.workCenterId)
      && numericInputEqual(referenceStep, currentStep, 'manning')
      && numericInputEqual(referenceStep, currentStep, 'capacity')
      && numericInputEqual(referenceStep, currentStep, 'yield'))
    if (index < 0) return false
    remaining.splice(index, 1)
    return true
  })
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
): {
  labor: number | null
  burden: number | null
  total: number | null
  exactLabor: string | null
  exactBurden: string | null
  exactTotal: string | null
} {
  let exactLabor = parseExactDecimal(0)
  let exactBurden = parseExactDecimal(0)
  for (const step of steps) {
    const detail = calculateSnapshotRoutingDetail(
      side === 'reference' ? { reference: step } : { current: step },
      referenceRates,
      currentRates
    )
    const exactLaborValue = side === 'reference' ? detail.exactValues?.referenceLaborCost : detail.exactValues?.currentLaborCost
    const exactBurdenValue = side === 'reference' ? detail.exactValues?.referenceBurdenCost : detail.exactValues?.currentBurdenCost
    exactLabor = exactLabor && exactLaborValue ? addExactDecimals(exactLabor, parseExactDecimal(exactLaborValue)!) : null
    exactBurden = exactBurden && exactBurdenValue ? addExactDecimals(exactBurden, parseExactDecimal(exactBurdenValue)!) : null
  }
  const exactTotal = exactLabor && exactBurden ? addExactDecimals(exactLabor, exactBurden) : null
  return {
    labor: exactLabor ? exactDecimalToNumber(exactLabor) : null,
    burden: exactBurden ? exactDecimalToNumber(exactBurden) : null,
    total: exactTotal ? exactDecimalToNumber(exactTotal) : null,
    exactLabor: exactLabor ? exactDecimalToString(exactLabor) : null,
    exactBurden: exactBurden ? exactDecimalToString(exactBurden) : null,
    exactTotal: exactTotal ? exactDecimalToString(exactTotal) : null
  }
}

function processingCostEffect(
  reference: { labor: number | null; burden: number | null; total: number | null; exactLabor?: string | null; exactBurden?: string | null; exactTotal?: string | null },
  current: { labor: number | null; burden: number | null; total: number | null; exactLabor?: string | null; exactBurden?: string | null; exactTotal?: string | null }
): ComparisonRecordCostEffect {
  return {
    reference: { material: 0, labor: reference.labor, burden: reference.burden, total: reference.total },
    current: { material: 0, labor: current.labor, burden: current.burden, total: current.total },
    gap: {
      material: 0,
      labor: gap(current.labor, reference.labor, current.exactLabor, reference.exactLabor),
      burden: gap(current.burden, reference.burden, current.exactBurden, reference.exactBurden),
      total: gap(current.total, reference.total, current.exactTotal, reference.exactTotal)
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
        && !routingEquivalent(referenceSteps, currentSteps),
      changedRate: changedRateWorkCenters.has(workCenterKey)
    }
    const referenceCost = hasReference
      ? aggregateRoutingCost(referenceSteps, 'reference', referenceRates, currentRates)
      : { labor: 0, burden: 0, total: 0, exactLabor: '0', exactBurden: '0', exactTotal: '0' }
    const currentCost = hasCurrent
      ? aggregateRoutingCost(currentSteps, 'current', referenceRates, currentRates)
      : { labor: 0, burden: 0, total: 0, exactLabor: '0', exactBurden: '0', exactTotal: '0' }
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
      confidence: [...referenceSteps, ...currentSteps, ...(referenceRate ? [referenceRate] : []), ...(currentRate ? [currentRate] : [])]
        .some(row => confidenceOf(row) === 'missing') ? 'missing' : 'verified'
    })
  }

  return findings
}

/** Calculates both snapshots independently and then returns explicit comparison findings. */
export function compareSnapshots(reference: CostSnapshot, current: CostSnapshot): CostComparison {
  const referenceCost = calculateSnapshotCost(reference)
  const currentCost = calculateSnapshotCost(current)
  const referenceBom = reference.bom
  const currentBom = current.bom
  const referenceRouting = reference.routing
  const currentRouting = current.routing
  const referenceRates = reference.rates
  const currentRates = current.rates
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
    warnings,
    new Set(['description'])
  )

  const processingFindings = buildProcessingFindings(
    referenceRouting,
    currentRouting,
    referenceRates,
    currentRates,
    workCenterFindings
  )

  const materialGap = gap(currentCost.material, referenceCost.material, currentCost.exactValues?.material, referenceCost.exactValues?.material)
  const laborGap = gap(currentCost.labor, referenceCost.labor, currentCost.exactValues?.labor, referenceCost.exactValues?.labor)
  const burdenGap = gap(currentCost.burden, referenceCost.burden, currentCost.exactValues?.burden, referenceCost.exactValues?.burden)
  const totalGap = gap(currentCost.total, referenceCost.total, currentCost.exactValues?.total, referenceCost.exactValues?.total)

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
  const sumOfElementGaps = materialGap !== null && laborGap !== null && burdenGap !== null
    ? safeAdd(materialGap, laborGap, burdenGap)
    : null
  const discrepancyValue = totalGap !== null && sumOfElementGaps !== null
    ? safeAdd(totalGap, -sumOfElementGaps)
    : null
  const discrepancy = discrepancyValue === null ? null : Math.abs(discrepancyValue)
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
