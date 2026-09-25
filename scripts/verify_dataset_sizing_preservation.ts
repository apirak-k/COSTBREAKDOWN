import assert from 'node:assert/strict'
import {
  markSizingPlaceholderEdited,
  resizeMasterDataSnapshotForSizing
} from '../src/state/dataset-sizing.ts'
import {
  applySnapshotPairToSession,
  projectSnapshotPairToLegacySession,
  updateCurrentSnapshotFromLegacySession
} from '../src/core/migrations/snapshot-to-session.ts'
import type {
  CostSnapshot,
  FieldEvidence,
  SnapshotBOMItem,
  SnapshotRoutingStep,
  SnapshotWorkCenterRate
} from '../src/core/types/snapshot.types.ts'
import type { ProductSession } from '../src/core/types/product.types.ts'

type SizingRow = { isGeneratedSizingPlaceholder?: boolean }

function rate(id: string, changes: Partial<SnapshotWorkCenterRate & SizingRow> = {}): SnapshotWorkCenterRate & SizingRow {
  return {
    id, workCenterCode: '', description: '', laborRate: null, burdenRate: null,
    effectiveDate: '', confidence: {}, ...changes
  }
}

function bom(id: string, changes: Partial<SnapshotBOMItem & SizingRow> = {}): SnapshotBOMItem & SizingRow {
  return {
    id, itemCode: '', description: '', consumption: null, unit: 'PC',
    price: null, loss: 0, confidence: {}, ...changes
  }
}

function routing(id: string, changes: Partial<SnapshotRoutingStep & SizingRow> = {}): SnapshotRoutingStep & SizingRow {
  return {
    id, operationCode: '', processName: '', manning: null, capacity: null,
    yield: null, confidence: {}, ...changes
  }
}

function snapshot(
  rows: Pick<CostSnapshot, 'rates' | 'bom' | 'routing'>,
  productEffectiveDate = '2026-09-25'
): CostSnapshot {
  return {
    id: 'sizing-regression',
    product: { productCode: 'TEST', productDescription: '', uom: 'PC', customer: '', effectiveDate: productEffectiveDate },
    effectiveDate: '', sourceRef: 'test', status: 'draft', ...rows
  }
}

// These are the defaults written by the pre-fix sizing code in store.tsx.
// Legacy rows have sizing IDs but no explicit placeholder marker.
function directInputEvidence(value: number | null): FieldEvidence {
  return {
    status: value === null ? 'missing' : 'verified',
    quality: value === null ? 'missing' : 'valid',
    sourceRef: 'Direct Input', basis: 'Master Data working value',
    sourceValue: value, workingValue: value
  }
}

function legacyRate(index: number, changes: Partial<SnapshotWorkCenterRate & SizingRow> = {}) {
  return rate(`rate-size-legacy-${index}`, {
    effectiveDate: '2026-09-25', sourceRef: 'Direct Input',
    confidence: {
      laborRate: directInputEvidence(changes.laborRate ?? null),
      burdenRate: directInputEvidence(changes.burdenRate ?? null)
    },
    ...changes
  })
}

function legacyBom(index: number, changes: Partial<SnapshotBOMItem & SizingRow> = {}) {
  return bom(`bom-size-legacy-${index}`, {
    unit: 'PC', loss: 0, sourceRef: 'Direct Input',
    confidence: {
      consumption: directInputEvidence(changes.consumption ?? null),
      price: directInputEvidence(changes.price ?? null),
      loss: directInputEvidence(changes.loss ?? 0)
    },
    ...changes
  })
}

function legacyRouting(index: number, changes: Partial<SnapshotRoutingStep & SizingRow> = {}) {
  return routing(`routing-size-legacy-${index}`, {
    sequence: index * 10, workCenterId: undefined, sourceRef: 'Direct Input',
    confidence: {
      sequence: directInputEvidence(index * 10),
      manning: directInputEvidence(changes.manning ?? null),
      capacity: directInputEvidence(changes.capacity ?? null),
      yield: directInputEvidence(changes.yield ?? null)
    },
    ...changes
  })
}

const factories = {
  rate: (index: number) => rate(`new-rate-${index}`, { isGeneratedSizingPlaceholder: true }),
  bom: (index: number) => bom(`new-bom-${index}`, { isGeneratedSizingPlaceholder: true }),
  routing: (index: number) => routing(`new-routing-${index}`, { isGeneratedSizingPlaceholder: true })
}

// A small target must not silently discard data, including sparse edits and numeric zeroes.
const beforeShrink = snapshot({
  rates: [
    legacyRate(1),
    legacyRate(2, { laborRate: 0 }),
    legacyRate(3, { isGeneratedSizingPlaceholder: true }),
    rate('rate-edited', { workCenterCode: 'WC-1', isGeneratedSizingPlaceholder: false })
  ],
  bom: [
    legacyBom(1),
    legacyBom(2, { consumption: 0 }),
    legacyBom(3, { isGeneratedSizingPlaceholder: true }),
    bom('bom-edited', { itemCode: 'MAT-1', isGeneratedSizingPlaceholder: false })
  ],
  routing: [
    legacyRouting(1),
    legacyRouting(2, { manning: 0 }),
    legacyRouting(3, { isGeneratedSizingPlaceholder: true }),
    routing('routing-edited', { processName: 'Cutting', isGeneratedSizingPlaceholder: false })
  ]
})
const afterShrink = resizeMasterDataSnapshotForSizing(
  beforeShrink, { wcCount: 1, bomCount: 1, routingCount: 1 }, factories
)
assert.notStrictEqual(afterShrink, beforeShrink, 'sizing must return a new snapshot')
assert.deepEqual(afterShrink.rates.map(row => row.id), ['rate-size-legacy-2', 'rate-edited'])
assert.deepEqual(afterShrink.bom.map(row => row.id), ['bom-size-legacy-2', 'bom-edited'])
assert.deepEqual(afterShrink.routing.map(row => row.id), ['routing-size-legacy-2', 'routing-edited'])
assert.equal(beforeShrink.rates.length, 4, 'sizing must not mutate the original snapshot')
assert.equal(beforeShrink.bom.length, 4)
assert.equal(beforeShrink.routing.length, 4)

// Blank rows created outside sizing must survive; only sizing placeholders are removable.
const manualBlank = snapshot({
  rates: [
    rate('manual-rate', { isGeneratedSizingPlaceholder: false }),
    legacyRate(4, { isGeneratedSizingPlaceholder: true })
  ],
  bom: [
    bom('manual-bom', { isGeneratedSizingPlaceholder: false }),
    legacyBom(4, { isGeneratedSizingPlaceholder: true })
  ],
  routing: [
    routing('manual-routing', { isGeneratedSizingPlaceholder: false }),
    legacyRouting(4, { isGeneratedSizingPlaceholder: true })
  ]
})
const afterZero = resizeMasterDataSnapshotForSizing(
  manualBlank, { wcCount: 0, bomCount: 0, routingCount: 0 }, factories
)
assert.deepEqual(afterZero.rates.map(row => row.id), ['manual-rate'])
assert.deepEqual(afterZero.bom.map(row => row.id), ['manual-bom'])
assert.deepEqual(afterZero.routing.map(row => row.id), ['manual-routing'])

// Editing a generated row marks it as user-owned, even if the entered values are still blank.
const editedBlankRate = markSizingPlaceholderEdited(rate('new-rate-4', { isGeneratedSizingPlaceholder: true }))
const editedBlankBom = markSizingPlaceholderEdited(bom('new-bom-4', { isGeneratedSizingPlaceholder: true }))
const editedBlankRouting = markSizingPlaceholderEdited(routing('new-routing-4', { isGeneratedSizingPlaceholder: true }))
assert.equal(editedBlankRate.isGeneratedSizingPlaceholder, false)
assert.equal(editedBlankBom.isGeneratedSizingPlaceholder, false)
assert.equal(editedBlankRouting.isGeneratedSizingPlaceholder, false)
const afterEditingBlankPlaceholders = resizeMasterDataSnapshotForSizing(snapshot({
  rates: [editedBlankRate], bom: [editedBlankBom], routing: [editedBlankRouting]
}), { wcCount: 0, bomCount: 0, routingCount: 0 }, factories)
assert.deepEqual(afterEditingBlankPlaceholders.rates.map(row => row.id), ['new-rate-4'])
assert.deepEqual(afterEditingBlankPlaceholders.bom.map(row => row.id), ['new-bom-4'])
assert.deepEqual(afterEditingBlankPlaceholders.routing.map(row => row.id), ['new-routing-4'])

const linkedRoutingPlaceholder = snapshot({
  rates: [rate('configured-rate', { workCenterCode: 'WC-DEFAULT' })],
  bom: [],
  routing: [legacyRouting(1, { workCenterId: 'WC-DEFAULT' })]
})
const afterLinkedRoutingShrink = resizeMasterDataSnapshotForSizing(
  linkedRoutingPlaceholder, { routingCount: 0 }, factories
)
assert.deepEqual(afterLinkedRoutingShrink.routing, [], 'generated workCenterId must not make a legacy blank route populated')
assert.deepEqual(afterLinkedRoutingShrink.rates.map(row => row.id), ['configured-rate'])

// A generated rate defaults to today's date when its Product has no effective date.
// That generated date must not make an untouched Work Center slot survive shrink.
const generatedAt = Date.now()
const generatedRateDate = new Date(generatedAt).toISOString().split('T')[0]
const noProductDateSnapshot = snapshot({
  rates: [rate(`rate-size-${generatedAt}-1`, {
    effectiveDate: generatedRateDate,
    sourceRef: 'Direct Input',
    isGeneratedSizingPlaceholder: true,
    confidence: {
      laborRate: directInputEvidence(null),
      burdenRate: directInputEvidence(null)
    }
  })],
  bom: [],
  routing: []
}, '')
const afterNoProductDateShrink = resizeMasterDataSnapshotForSizing(
  noProductDateSnapshot, { wcCount: 0 }, factories
)
assert.deepEqual(afterNoProductDateShrink.rates, [], 'the generated effective date is still a default when Product date is unset')

const staleGeneratedRate = rate(`rate-size-${generatedAt}-2`, {
  effectiveDate: '2026-09-01',
  sourceRef: 'Direct Input',
  isGeneratedSizingPlaceholder: true,
  confidence: {
    laborRate: directInputEvidence(null),
    burdenRate: directInputEvidence(null)
  }
})
const afterProductDateChangeShrink = resizeMasterDataSnapshotForSizing(
  snapshot({ rates: [staleGeneratedRate], bom: [], routing: [] }, '2026-09-25'),
  { wcCount: 0 }, factories
)
assert.deepEqual(afterProductDateChangeShrink.rates, [], 'changing Product effective date does not populate an untouched generated rate')

// The session compatibility projection must preserve placeholder identity across reload hydration.
const persistedGeneratedAt = Date.now()
const persistedDate = new Date(persistedGeneratedAt).toISOString().split('T')[0]
const sizingPair = {
  reference: snapshot({ rates: [], bom: [], routing: [] }, ''),
  current: snapshot({
    rates: [rate(`rate-size-${persistedGeneratedAt}-1`, {
      effectiveDate: persistedDate, sourceRef: 'Direct Input', isGeneratedSizingPlaceholder: true,
      confidence: { laborRate: directInputEvidence(null), burdenRate: directInputEvidence(null) }
    })],
    bom: [legacyBom(1, { id: 'bom-size-persisted-1', isGeneratedSizingPlaceholder: true })],
    routing: [legacyRouting(1, { id: `routing-size-${persistedGeneratedAt}-1`, isGeneratedSizingPlaceholder: true })]
  }, '')
}
const projectedSessionRows = projectSnapshotPairToLegacySession(sizingPair)
assert.equal(projectedSessionRows.rates[0].isGeneratedSizingPlaceholder, true)
assert.equal(projectedSessionRows.bom[0].itemCode, '', 'generated BOM placeholders must not gain display-only item codes')
assert.equal(projectedSessionRows.bom[0].isGeneratedSizingPlaceholder, true)
assert.equal(projectedSessionRows.routing[0].isGeneratedSizingPlaceholder, true)
const manuallyRetainedBlankPair = {
  reference: snapshot({ rates: [], bom: [], routing: [] }, ''),
  current: snapshot({ rates: [], bom: [bom('manual-blank-bom', { isGeneratedSizingPlaceholder: false })], routing: [] }, '')
}
const manuallyRetainedBlankRows = projectSnapshotPairToLegacySession(manuallyRetainedBlankPair)
assert.equal(manuallyRetainedBlankRows.bom[0].itemCode, '', 'an explicitly retained blank BOM row must stay blank through projection')
assert.equal(manuallyRetainedBlankRows.bom[0].isGeneratedSizingPlaceholder, false)
const manuallyRetainedBlankSession = {
  id: 'manual-blank-projection',
  product: manuallyRetainedBlankPair.current.product,
  ...manuallyRetainedBlankRows,
  savedDrivers: [],
  status: 'draft',
  createdAt: '',
  updatedAt: ''
} as ProductSession
const afterManualBlankHydration = updateCurrentSnapshotFromLegacySession(
  manuallyRetainedBlankSession, manuallyRetainedBlankPair
)
assert.deepEqual(resizeMasterDataSnapshotForSizing(afterManualBlankHydration, { bomCount: 0 }, factories).bom.map(row => row.id), ['manual-blank-bom'])
const persistedSession = {
  id: 'sizing-projection-roundtrip',
  product: sizingPair.current.product,
  ...projectedSessionRows,
  savedDrivers: [],
  status: 'draft',
  createdAt: '',
  updatedAt: ''
} as ProductSession
const hydratedCurrent = updateCurrentSnapshotFromLegacySession(persistedSession, sizingPair)
const afterHydratedShrink = resizeMasterDataSnapshotForSizing(hydratedCurrent, {
  wcCount: 0, bomCount: 0, routingCount: 0
}, factories)
assert.deepEqual(afterHydratedShrink.rates, [], 'rehydrated generated rates should remain removable')
assert.deepEqual(afterHydratedShrink.bom, [], 'rehydrated generated BOM rows should remain removable')
assert.deepEqual(afterHydratedShrink.routing, [], 'rehydrated generated routing rows should remain removable')
const projectedAfterShrink = applySnapshotPairToSession(persistedSession, {
  reference: sizingPair.reference,
  current: afterHydratedShrink
})
assert.equal(projectedAfterShrink.rates.length, 0, 'legacy session projection should reflect removed rate placeholders')
assert.equal(projectedAfterShrink.bom.length, 0, 'legacy session projection should reflect removed BOM placeholders')
assert.equal(projectedAfterShrink.routing.length, 0, 'legacy session projection should reflect removed routing placeholders')

// Growth adds only the missing rows, with one-based indexes and removable markers.
const beforeGrowth = snapshot({
  rates: [rate('retained-rate', { workCenterCode: 'WC-2' })],
  bom: [bom('retained-bom', { itemCode: 'MAT-2' })],
  routing: [routing('retained-routing', { processName: 'Assembly' })]
})
const afterGrowth = resizeMasterDataSnapshotForSizing(
  beforeGrowth, { wcCount: 3, bomCount: 3, routingCount: 3 }, factories
)
assert.deepEqual(afterGrowth.rates.map(row => row.id), ['retained-rate', 'new-rate-2', 'new-rate-3'])
assert.deepEqual(afterGrowth.bom.map(row => row.id), ['retained-bom', 'new-bom-2', 'new-bom-3'])
assert.deepEqual(afterGrowth.routing.map(row => row.id), ['retained-routing', 'new-routing-2', 'new-routing-3'])
for (const row of [...afterGrowth.rates.slice(1), ...afterGrowth.bom.slice(1), ...afterGrowth.routing.slice(1)]) {
  assert.equal((row as SizingRow).isGeneratedSizingPlaceholder, true)
}
assert.equal(beforeGrowth.rates.length, 1)
assert.equal(beforeGrowth.bom.length, 1)
assert.equal(beforeGrowth.routing.length, 1)

console.log('Master Data sizing preservation self-check: PASS')
