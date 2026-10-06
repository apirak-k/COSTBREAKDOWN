import { CostSnapshot, ScenarioCostDraft, ScenarioCostResult } from '../types'
import { calculateSnapshotCost } from './snapshot-cost'

type NumericPatch<T, K extends keyof T> = Partial<Record<K, number>>

interface AppliedOverrides<T> {
  records: T[]
  warnings: string[]
}

function applyRecordOverrides<T extends { id: string }, K extends keyof T>(
  records: T[],
  overrides: Record<string, NumericPatch<T, K>> | undefined,
  allowedFields: readonly K[],
  collectionLabel: string
): AppliedOverrides<T> {
  const nextRecords = [...records]
  const warnings: string[] = []

  for (const [recordId, patch] of Object.entries(overrides ?? {})) {
    const matches = records.reduce<number[]>((indices, record, index) => {
      if (record.id === recordId) indices.push(index)
      return indices
    }, [])

    if (matches.length !== 1) {
      const reason = matches.length === 0
        ? 'no matching record'
        : `ambiguous record ID (${matches.length} matches)`
      warnings.push(`Scenario override skipped: ${collectionLabel} ${recordId} has ${reason}.`)
      continue
    }

    const safePatch: Partial<T> = {}
    for (const [fieldName, value] of Object.entries(patch ?? {})) {
      if (!allowedFields.includes(fieldName as K)) {
        warnings.push(`Scenario override skipped: ${collectionLabel} ${recordId} field ${fieldName} is not supported.`)
        continue
      }
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        warnings.push(`Scenario override skipped: ${collectionLabel} ${recordId} field ${fieldName} is not a finite number.`)
        continue
      }
      ;(safePatch as Record<string, unknown>)[fieldName] = value
    }

    const recordIndex = matches[0]
    const source = nextRecords[recordIndex]
    if (source) nextRecords[recordIndex] = { ...source, ...safePatch }
  }

  return { records: nextRecords, warnings }
}

function applyScenarioOverrides(
  current: CostSnapshot,
  draft: ScenarioCostDraft
): { snapshot: CostSnapshot; warnings: string[] } {
  const bom = applyRecordOverrides(
    current.bom,
    draft.overrides.bom,
    ['price', 'loss', 'consumption'],
    'BOM record'
  )
  const routing = applyRecordOverrides(
    current.routing,
    draft.overrides.routing,
    ['manning', 'capacity', 'yield'],
    'Routing record'
  )
  const rates = applyRecordOverrides(
    current.rates,
    draft.overrides.rates,
    ['laborRate', 'burdenRate'],
    'Work Center rate'
  )

  return {
    snapshot: { ...current, bom: bom.records, routing: routing.records, rates: rates.records },
    warnings: [...bom.warnings, ...routing.warnings, ...rates.warnings]
  }
}

/** Recalculates independent A/B drafts from the same Current snapshot using the canonical Standard Cost engine. */
export function calculateScenarioCosts(
  currentSnapshot: CostSnapshot,
  drafts: ScenarioCostDraft[]
): ScenarioCostResult[] {
  const currentCost = calculateSnapshotCost(currentSnapshot)

  return drafts.map(draft => {
    const applied = applyScenarioOverrides(currentSnapshot, draft)
    return {
      letter: draft.letter,
      label: draft.label,
      currentCost,
      scenarioCost: calculateSnapshotCost(applied.snapshot),
      overrideWarnings: applied.warnings
    }
  })
}
