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
import { calculateSnapshotRoutingDetail, resolveSnapshotRoutingRate } from './snapshot-routing-detail'
import { areNumericValuesEquivalent, safeAdd } from '../utils/guards'
import {
  addExactDecimals,
  exactDecimalInputValue,
  exactDecimalToNumber,
  exactDecimalToString,
  multiplyExactDecimals,
  parseExactDecimal,
  resolveExactDecimalInputPair,
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

// Business identity fields are consumed by the matcher itself and are not
// compared a second time as raw display strings after a row has matched.
export const COMPARABLE_BOM_FIELDS = ['consumption', 'unit', 'price', 'loss'] as const
export const COMPARABLE_ROUTING_FIELDS = ['workCenterId', 'manning', 'capacity', 'yield'] as const
export const COMPARABLE_WORK_CENTER_FIELDS = ['laborRate', 'burdenRate'] as const
export const COMPARABLE_PRODUCT_FIELDS = ['productName', 'uom', 'sellingPrice', 'sgaPercent'] as const

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

function exactRowValue(row: SnapshotRow, field: string) {
  const numeric = (row as unknown as Record<string, number | null | undefined>)[field]
  const exactInputs = (row as SnapshotRow & { exactDecimalInputs?: Record<string, string> }).exactDecimalInputs
  const percentageInput = field === 'loss' || field === 'yield'
  return {
    numeric,
    exact: exactDecimalInputValue(numeric, exactInputs?.[field], percentageInput)
  }
}

function exactRowsEqual(left: SnapshotRow, right: SnapshotRow, field: string): boolean {
  const leftValue = exactRowValue(left, field)
  const rightValue = exactRowValue(right, field)
  const leftExactInputs = (left as SnapshotRow & { exactDecimalInputs?: Record<string, string> }).exactDecimalInputs
  const rightExactInputs = (right as SnapshotRow & { exactDecimalInputs?: Record<string, string> }).exactDecimalInputs
  return resolveExactDecimalInputPair(
    leftValue.numeric,
    leftExactInputs?.[field],
    rightValue.numeric,
    rightExactInputs?.[field],
    field === 'loss' || field === 'yield'
  ).equivalent
}

function equalSupportedField(field: string, reference: SnapshotRow, current: SnapshotRow): boolean {
  if (EXACT_NUMERIC_FIELDS.has(field)) {
    return exactRowsEqual(reference, current, field)
  }
  if (field === 'workCenterId') {
    return normalizeKey((reference as unknown as Record<string, string | undefined>)[field])
      === normalizeKey((current as unknown as Record<string, string | undefined>)[field])
  }
  return valuesEqual(
    (reference as unknown as Record<string, unknown>)[field],
    (current as unknown as Record<string, unknown>)[field]
  )
}

function exactFieldDisplay(row: SnapshotRow, field: string): unknown {
  const exact = exactRowValue(row, field).exact
  return exact ? exactDecimalToString(exact) : (row as unknown as Record<string, unknown>)[field]
}

function numericInputEqual(left: SnapshotRow, right: SnapshotRow, field: string): boolean {
  return exactRowsEqual(left, right, field)
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
  comparableFields: ReadonlyArray<string>,
  ignoredFields: ReadonlySet<string> = new Set()
): Record<string, { reference: unknown; current: unknown }> {
  const diffs: Record<string, { reference: unknown; current: unknown }> = {}
  comparableFields.forEach(field => {
    if (ignoredFields.has(field)) return
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
  COMPARABLE_PRODUCT_FIELDS.forEach(field => {
    const referenceValue = (reference as unknown as Record<string, unknown>)[field]
    const currentValue = (current as unknown as Record<string, unknown>)[field]
    if (EXACT_NUMERIC_FIELDS.has(field)) {
      const referenceRow = reference as unknown as SnapshotRow
      const currentRow = current as unknown as SnapshotRow
      const left = exactRowValue(referenceRow, field).exact
      const right = exactRowValue(currentRow, field).exact
      const equal = exactRowsEqual(referenceRow, currentRow, field)
      if (!equal) diffs[field] = {
        reference: left ? exactDecimalToString(left) : referenceValue,
        current: right ? exactDecimalToString(right) : currentValue
      }
    } else if ((field === 'productName' || field === 'uom')
      ? normalizeKey(referenceValue as string | undefined) !== normalizeKey(currentValue as string | undefined)
      : !valuesEqual(referenceValue, currentValue)) {
      diffs[field] = { reference: referenceValue, current: currentValue }
    }
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
  calculateRecordCostEffect: ((reference: T | undefined, current: T | undefined) => ComparisonRecordCostEffect) | undefined,
  warnings: ComparisonWarning[],
  comparableFields: ReadonlyArray<string>,
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
      fieldDiffs: diffSupportedFields(reference, current, comparableFields, ignoredFields),
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

function toExactInputText(value: NonNullable<ReturnType<typeof exactDecimalInputValue>>, percentageInput: boolean): string {
  const inputValue = percentageInput
    ? multiplyExactDecimals(value, parseExactDecimal(100)!)
    : value
  return exactDecimalToString(inputValue)
}

function withExactInput<T extends SnapshotRow>(row: T, field: string, exactInput: string): T {
  const exactDecimalInputs = (row as T & { exactDecimalInputs?: Record<string, string> }).exactDecimalInputs
  return {
    ...row,
    exactDecimalInputs: { ...exactDecimalInputs, [field]: exactInput }
  } as T
}

function alignEquivalentRowInputs<T extends SnapshotRow>(
  referenceRows: T[],
  currentRows: T[],
  keyOf: (row: T) => string,
  fields: readonly string[]
): [T[], T[]] {
  const reference = referenceRows.map(row => row)
  const current = currentRows.map(row => row)
  const referenceIndexes = new Map<string, number[]>()
  const currentIndexes = new Map<string, number[]>()
  reference.forEach((row, index) => {
    const key = keyOf(row)
    if (key) referenceIndexes.set(key, [...(referenceIndexes.get(key) ?? []), index])
  })
  current.forEach((row, index) => {
    const key = keyOf(row)
    if (key) currentIndexes.set(key, [...(currentIndexes.get(key) ?? []), index])
  })

  for (const [key, referenceMatches] of referenceIndexes) {
    const currentMatches = currentIndexes.get(key)
    if (referenceMatches.length !== 1 || currentMatches?.length !== 1) continue
    const referenceIndex = referenceMatches[0]
    const currentIndex = currentMatches[0]
    for (const field of fields) {
      const left = reference[referenceIndex]
      const right = current[currentIndex]
      const leftNumber = (left as unknown as Record<string, number | null | undefined>)[field]
      const rightNumber = (right as unknown as Record<string, number | null | undefined>)[field]
      const leftInputs = (left as T & { exactDecimalInputs?: Record<string, string> }).exactDecimalInputs
      const rightInputs = (right as T & { exactDecimalInputs?: Record<string, string> }).exactDecimalInputs
      const percentageInput = field === 'loss' || field === 'yield'
      const pair = resolveExactDecimalInputPair(
        leftNumber,
        leftInputs?.[field],
        rightNumber,
        rightInputs?.[field],
        percentageInput
      )
      if (!pair.equivalent || !pair.reference || !pair.current) continue
      const sharedInput = toExactInputText(pair.reference, percentageInput)
      reference[referenceIndex] = withExactInput(left, field, sharedInput)
      current[currentIndex] = withExactInput(right, field, sharedInput)
    }
  }
  return [reference, current]
}

function alignEquivalentSnapshotInputs(reference: CostSnapshot, current: CostSnapshot): [CostSnapshot, CostSnapshot] {
  const [referenceBom, currentBom] = alignEquivalentRowInputs(
    reference.bom, current.bom, bomKey, COMPARABLE_BOM_FIELDS
  )
  const [referenceRouting, currentRouting] = alignEquivalentRowInputs(
    reference.routing, current.routing, routingKey, ['manning', 'capacity', 'yield']
  )
  const [referenceRates, currentRates] = alignEquivalentRowInputs(
    reference.rates, current.rates, rateKey, COMPARABLE_WORK_CENTER_FIELDS
  )
  return [
    { ...reference, bom: referenceBom, routing: referenceRouting, rates: referenceRates },
    { ...current, bom: currentBom, routing: currentRouting, rates: currentRates }
  ]
}

function bomFlags(): ChangeFlags {
  return {}
}

function routingFlags(
  reference: SnapshotRoutingStep,
  current: SnapshotRoutingStep,
  referenceRates: SnapshotWorkCenterRate[],
  currentRates: SnapshotWorkCenterRate[]
): ChangeFlags {
  const movedWorkCenter = normalizeKey(reference.workCenterId) !== normalizeKey(current.workCenterId)
  const changedInputs = !numericInputEqual(reference, current, 'manning')
    || !numericInputEqual(reference, current, 'capacity')
    || !numericInputEqual(reference, current, 'yield')
  const referenceRate = resolveSnapshotRoutingRate(reference, referenceRates)
  const currentRate = resolveSnapshotRoutingRate(current, currentRates)
  const changedRate = referenceRate === undefined || currentRate === undefined
    ? referenceRate !== currentRate
    : normalizeKey(referenceRate.workCenterCode) !== normalizeKey(currentRate.workCenterCode)
      || !numericInputEqual(referenceRate, currentRate, 'laborRate')
      || !numericInputEqual(referenceRate, currentRate, 'burdenRate')

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
  const pair = resolveExactDecimalInputPair(reference, referenceExact ?? undefined, current, currentExact ?? undefined)
  if (pair.equivalent) return 0
  if (pair.reference && pair.current) {
    const exactGap = subtractExactDecimals(pair.current, pair.reference)
    const num = exactDecimalToNumber(exactGap)
    return num === null || num === 0 ? 0 : num
  }
  const diff = safeAdd(current, -reference)
  return diff === 0 ? 0 : diff
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
  const [calculationReference, calculationCurrent] = alignEquivalentSnapshotInputs(reference, current)
  const referenceCost = calculateSnapshotCost(calculationReference)
  const currentCost = calculateSnapshotCost(calculationCurrent)
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
    warnings,
    COMPARABLE_BOM_FIELDS
  )

  const routingFindings = compareRows(
    'Routing',
    referenceRouting,
    currentRouting,
    routingKey,
    (referenceStep, currentStep) => routingFlags(referenceStep, currentStep, referenceRates, currentRates),
    (ref, cur) => routingCostEffect(ref, cur, referenceRates, currentRates),
    warnings,
    COMPARABLE_ROUTING_FIELDS
  )

  const workCenterFindings = compareRows(
    'Work Center',
    referenceRates,
    currentRates,
    rateKey,
    rateFlags,
    undefined,
    warnings,
    COMPARABLE_WORK_CENTER_FIELDS,
    new Set(['description'])
  )

  const processingFindings = buildProcessingFindings(
    calculationReference.routing,
    calculationCurrent.routing,
    calculationReference.rates,
    calculationCurrent.rates,
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
