import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const jiti = require('jiti')(fileURLToPath(import.meta.url))
let assertions = 0
const check = Object.fromEntries(['equal', 'notEqual', 'notStrictEqual', 'ok'].map(method => [method, (...args) => {
  assertions += 1
  return assert[method](...args)
}]))

const { seedSnapshotPair } = jiti('../src/state/seed-data.ts')
const { cloneCostSnapshot, cloneMasterDataDatasetState } = jiti('../src/state/master-data-datasets.ts')
const { applySnapshotPairToSession } = jiti('../src/core/migrations/snapshot-to-session.ts')
const { normalizeMasterDataSnapshot } = jiti('../src/core/utils/master-data-effective.ts')
const { compareSnapshots } = jiti('../src/core/calculations/snapshot-comparison.ts')
const { getCanonicalComparisonStatus } = jiti('../src/core/calculations/comparison-status.ts')
const { loadFromSession, saveToSession } = jiti('../src/services/storage/session-storage.ts')

const storage = new Map()
Object.defineProperty(globalThis, 'sessionStorage', {
  configurable: true,
  value: {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value))
  }
})

const reference = cloneCostSnapshot(seedSnapshotPair.reference)
reference.bom[0] = {
  ...reference.bom[0],
  consumption: 0.02542,
  price: 14.83571,
  loss: 0.101,
  exactDecimalInputs: { consumption: '0.02713', price: '14.83571', loss: '10.1' }
}
reference.routing[0] = {
  ...reference.routing[0],
  yield: 0.101,
  exactDecimalInputs: { ...(reference.routing[0].exactDecimalInputs ?? {}), yield: '10.1' }
}
reference.rates[0] = {
  ...reference.rates[0],
  laborRate: 105.29,
  burdenRate: 138.48,
  exactDecimalInputs: { laborRate: '105.29', burdenRate: '138.48' }
}

const emptyCurrent = cloneCostSnapshot(reference)
emptyCurrent.id = `${reference.id}:current`
emptyCurrent.comparisonRole = 'current'
emptyCurrent.rates = []
emptyCurrent.bom = []
emptyCurrent.routing = []

const session = {
  id: 'clone-lifecycle-regression',
  product: reference.product,
  rates: [],
  bom: [],
  routing: [],
  status: 'draft',
  snapshotPair: { reference, current: emptyCurrent },
  snapshotPairMode: 'independent',
  preparedSnapshotRoles: { reference: true, current: false },
  datasetSizing: {
    reference: { bomCount: reference.bom.length, routingCount: reference.routing.length, wcCount: reference.rates.length },
    current: {}
  },
  customDatasetSizing: {}
}

const clonedSession = cloneMasterDataDatasetState(session, 'reference', 'current', '2026-01-01T00:00:00.000Z')
check.notStrictEqual(clonedSession.snapshotPair.reference, clonedSession.snapshotPair.current,
  'cloned Reference and Current snapshots are independent objects')

saveToSession('costbreakdown_sessions', [clonedSession])
const [reloadedSession] = loadFromSession('costbreakdown_sessions', [])
check.ok(reloadedSession, 'cloned session survives the production session-storage JSON path')

const reloadedPair = {
  ...reloadedSession.snapshotPair,
  reference: normalizeMasterDataSnapshot(reloadedSession.snapshotPair.reference),
  current: normalizeMasterDataSnapshot(reloadedSession.snapshotPair.current)
}
const normalizedSession = applySnapshotPairToSession(reloadedSession, reloadedPair)
const sameComparison = compareSnapshots(normalizedSession.snapshotPair.reference, normalizedSession.snapshotPair.current)
const sameFindings = [
  ...sameComparison.bomFindings,
  ...sameComparison.routingFindings,
  ...sameComparison.workCenterFindings
]
check.equal(sameFindings.length, reference.bom.length + reference.routing.length + reference.rates.length,
  'every cloned business row participates in the comparison')
for (const finding of sameFindings) {
  check.equal(getCanonicalComparisonStatus(finding), 'UNCHANGED', `cloned finding ${finding.referenceId ?? finding.currentId} stays UNCHANGED`)
  for (const [category, gap] of Object.entries(finding.costEffect?.gap ?? {})) {
    check.equal(gap, 0, `cloned finding ${finding.referenceId ?? finding.currentId} has exact zero ${category} Gap`)
    check.equal(Object.is(gap, -0), false, `cloned finding ${finding.referenceId ?? finding.currentId} has no negative-zero ${category} Gap`)
  }
}
check.equal(sameComparison.elementGaps.material, 0, 'cloned datasets have exact zero material Gap')
check.equal(sameComparison.elementGaps.labor, 0, 'cloned datasets have exact zero labor Gap')
check.equal(sameComparison.elementGaps.burden, 0, 'cloned datasets have exact zero burden Gap')
check.equal(sameComparison.totalGap, 0, 'cloned datasets have exact zero total Gap')
check.equal(sameComparison.referenceCost.exactValues.material, sameComparison.currentCost.exactValues.material,
  'percentage and exact decimal BOM inputs survive clone and persistence unchanged')

const withoutReferencePriceSidecar = {
  ...normalizedSession.snapshotPair.reference,
  bom: normalizedSession.snapshotPair.reference.bom.map((item, index) => {
    if (index !== 0) return item
    const exactDecimalInputs = { ...item.exactDecimalInputs }
    delete exactDecimalInputs.consumption
    delete exactDecimalInputs.price
    return { ...item, exactDecimalInputs }
  })
}
const importedRoundTripCurrent = {
  ...normalizedSession.snapshotPair.current,
  bom: normalizedSession.snapshotPair.current.bom.map((item, index) => index === 0
    ? {
        ...item,
        consumption: 0.02542,
        price: 14.83571,
        exactDecimalInputs: {
          ...item.exactDecimalInputs,
          consumption: '2.5420000000000002E-2',
          price: '14.835710000000001'
        }
      }
    : item)
}
const importedRoundTripComparison = compareSnapshots(withoutReferencePriceSidecar, importedRoundTripCurrent)
const importedRoundTripFinding = importedRoundTripComparison.bomFindings.find(finding => finding.referenceId === reference.bom[0].id)
check.equal(getCanonicalComparisonStatus(importedRoundTripFinding), 'UNCHANGED',
  'an imported exact lexeme with the same Number projection as a no-sidecar value is semantically unchanged')
check.equal(importedRoundTripFinding?.fieldDiffs.price, undefined,
  'machine-equivalent imported lexeme does not create a price field diff')
check.equal(importedRoundTripFinding?.fieldDiffs.consumption, undefined,
  'machine-equivalent imported lexeme does not create a consumption field diff')
check.equal(importedRoundTripCurrent.bom[0].exactDecimalInputs?.price, '14.835710000000001',
  'comparison keeps the imported exact lexeme intact')
check.equal(importedRoundTripCurrent.bom[0].exactDecimalInputs?.consumption, '2.5420000000000002E-2',
  'comparison keeps the imported consumption lexeme intact')

const explicitExactDifferenceReference = {
  ...withoutReferencePriceSidecar,
  bom: withoutReferencePriceSidecar.bom.map((item, index) => index === 0
    ? { ...item, exactDecimalInputs: { ...item.exactDecimalInputs, price: '14.83571' } }
    : item)
}
const explicitExactDifferenceComparison = compareSnapshots(explicitExactDifferenceReference, importedRoundTripCurrent)
const explicitExactDifferenceFinding = explicitExactDifferenceComparison.bomFindings.find(finding => finding.referenceId === reference.bom[0].id)
check.equal(getCanonicalComparisonStatus(explicitExactDifferenceFinding), 'CHANGED',
  'different authoritative exact inputs remain CHANGED even when their Number projections match')

const withoutReferenceRateSidecar = {
  ...normalizedSession.snapshotPair.reference,
  rates: normalizedSession.snapshotPair.reference.rates.map((rate, index) => {
    if (index !== 0) return rate
    const exactDecimalInputs = { ...rate.exactDecimalInputs }
    delete exactDecimalInputs.burdenRate
    return { ...rate, exactDecimalInputs }
  })
}
const importedRateCurrent = {
  ...normalizedSession.snapshotPair.current,
  rates: normalizedSession.snapshotPair.current.rates.map((rate, index) => index === 0
    ? { ...rate, burdenRate: 138.48, exactDecimalInputs: { ...rate.exactDecimalInputs, burdenRate: '138.47999999999999' } }
    : rate)
}
const importedRateComparison = compareSnapshots(withoutReferenceRateSidecar, importedRateCurrent)
const cuttingRateFinding = importedRateComparison.workCenterFindings.find(finding => finding.referenceId === 'Cutting')
check.equal(getCanonicalComparisonStatus(cuttingRateFinding), 'UNCHANGED',
  'a machine-equivalent imported Work Center rate does not mark the Work Center changed')
check.equal(cuttingRateFinding?.fieldDiffs.burdenRate, undefined,
  'a machine-equivalent imported Work Center rate does not create a field diff')
const cuttingRouteFindings = importedRateComparison.routingFindings.filter(finding =>
  finding.referenceId === 'rt-1' || finding.referenceId === 'rt-2')
check.equal(cuttingRouteFindings.length, 2, 'both Routing rows using the Work Center are compared')
for (const finding of cuttingRouteFindings) {
  check.equal(getCanonicalComparisonStatus(finding), 'UNCHANGED',
    `routing finding ${finding.referenceId} stays UNCHANGED when its imported Work Center rate is machine-equivalent`)
  check.equal(finding.changeFlags.changedRate, false,
    `routing finding ${finding.referenceId} does not inherit a false changedRate flag`)
}
check.equal(importedRateCurrent.rates[0].exactDecimalInputs?.burdenRate, '138.47999999999999',
  'comparison keeps the imported Work Center rate lexeme intact')

const editedCurrent = {
  ...normalizedSession.snapshotPair.current,
  bom: normalizedSession.snapshotPair.current.bom.map((item, index) => index === 0
    ? { ...item, price: 14.83572, exactDecimalInputs: { ...item.exactDecimalInputs, price: '14.83572' } }
    : item)
}
const normalizedEdit = normalizeMasterDataSnapshot(editedCurrent, normalizedSession.snapshotPair.current)
const editedSession = applySnapshotPairToSession(normalizedSession, {
  ...normalizedSession.snapshotPair,
  current: normalizedEdit
})
const editedComparison = compareSnapshots(editedSession.snapshotPair.reference, editedSession.snapshotPair.current)
const changedBOMFindings = editedComparison.bomFindings.filter(finding => getCanonicalComparisonStatus(finding) === 'CHANGED')
check.equal(changedBOMFindings.length, 1, 'one edited BOM business value changes only its BOM finding')
check.equal(changedBOMFindings[0].referenceId, reference.bom[0].id)
check.equal(changedBOMFindings[0].currentId, reference.bom[0].id)
check.ok(editedComparison.routingFindings.every(finding => getCanonicalComparisonStatus(finding) === 'UNCHANGED'),
  'editing one BOM value does not change Routing findings')
check.ok(editedComparison.workCenterFindings.every(finding => getCanonicalComparisonStatus(finding) === 'UNCHANGED'),
  'editing one BOM value does not change Work Center findings')
check.notEqual(editedComparison.elementGaps.material, 0, 'the edited BOM value has a real material Gap')
check.equal(editedComparison.elementGaps.labor, 0, 'the BOM edit leaves labor Gap at zero')
check.equal(editedComparison.elementGaps.burden, 0, 'the BOM edit leaves burden Gap at zero')

console.log(`Clone lifecycle regression: PASS (${assertions} assertions)`)
