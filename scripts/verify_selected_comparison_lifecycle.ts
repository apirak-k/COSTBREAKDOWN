import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  compareSnapshots,
  createSelectedSnapshotPair,
  getComparisonFindingKey,
  type CostSnapshot,
  type SnapshotBOMItem,
  type SnapshotRoutingStep,
  type SnapshotWorkCenterRate
} from '../src/core'

const product = { productCode: 'SELECTED-SCOPE', productDescription: 'Fixture', uom: 'PC', customer: '', effectiveDate: '' }
const bom = (id: string, name: string, price: number): SnapshotBOMItem => ({
  id, itemCode: `CODE-${name}`, description: name, consumption: 1, unit: 'PC', price, loss: 0, confidence: {}
})
const routing = (id: string, processName: string, wc: string, manning: number): SnapshotRoutingStep => ({
  id, processName, workCenterId: wc, manning, capacity: 10, yield: 1, confidence: {}
})
const rate = (id: string, wc: string, laborRate: number): SnapshotWorkCenterRate => ({
  id, workCenterCode: wc, description: wc, laborRate, burdenRate: 5, effectiveDate: '', confidence: {}
})
function snapshot(id: string, rows: {
  bom: SnapshotBOMItem[]
  routing: SnapshotRoutingStep[]
  rates: SnapshotWorkCenterRate[]
}): CostSnapshot {
  return { id, product, sourceRef: id, status: 'draft', effectiveDate: '', ...rows }
}

const reference = snapshot('reference', {
  bom: [bom('ref-a', 'Material A', 10), bom('ref-removed', 'Material Removed', 4), bom('ref-b', 'Material B', 100)],
  routing: [routing('ref-process-a', 'Process A', 'WC-1', 1), routing('ref-process-removed', 'Process Removed', 'WC-2', 1)],
  rates: [rate('ref-wc1', 'WC-1', 10), rate('ref-wc2', 'WC-2', 20)]
})
const current = snapshot('current', {
  bom: [bom('cur-a', 'Material A', 12), bom('cur-added', 'Material Added', 6), bom('cur-b', 'Material B', 101)],
  routing: [routing('cur-process-a', 'Process A', 'WC-1', 2), routing('cur-process-added', 'Process Added', 'WC-2', 1)],
  rates: [rate('cur-wc1', 'WC-1', 15), rate('cur-wc2', 'WC-2', 25)]
})
const comparison = compareSnapshots(reference, current)
const selection = {
  bomFindingKeys: [
    getComparisonFindingKey('bom', comparison.bomFindings.find(finding => finding.currentId === 'cur-a')!),
    getComparisonFindingKey('bom', comparison.bomFindings.find(finding => finding.currentId === 'cur-added')!),
    getComparisonFindingKey('bom', comparison.bomFindings.find(finding => finding.referenceId === 'ref-removed')!)
  ],
  routingFindingKeys: [
    getComparisonFindingKey('routing', comparison.routingFindings.find(finding => finding.currentId === 'cur-process-a')!),
    getComparisonFindingKey('routing', comparison.routingFindings.find(finding => finding.currentId === 'cur-process-added')!),
    getComparisonFindingKey('routing', comparison.routingFindings.find(finding => finding.referenceId === 'ref-process-removed')!)
  ]
}
const originalReference = structuredClone(reference)
const originalCurrent = structuredClone(current)
const selectedPair = createSelectedSnapshotPair({ reference, current }, comparison, selection)

assert.deepEqual(selectedPair.reference.bom.map(row => row.id), ['ref-a', 'ref-removed'],
  'a matched finding selects the Reference side and a Removed finding can be selected independently')
assert.deepEqual(selectedPair.current.bom.map(row => row.id), ['cur-a', 'cur-added'],
  'a matched finding selects the Current side and an Added finding can be selected independently')
assert.deepEqual(selectedPair.reference.routing.map(row => row.id), ['ref-process-a', 'ref-process-removed'])
assert.deepEqual(selectedPair.current.routing.map(row => row.id), ['cur-process-a', 'cur-process-added'])
assert.deepEqual(selectedPair.reference.rates, reference.rates, 'every Reference Work Center rate remains calculation context')
assert.deepEqual(selectedPair.current.rates, current.rates, 'every Current Work Center rate remains calculation context')
assert.deepEqual(reference, originalReference, 'selected-scope creation does not mutate Reference')
assert.deepEqual(current, originalCurrent, 'selected-scope creation does not mutate Current')

const selectedComparison = compareSnapshots(selectedPair.reference, selectedPair.current)
assert.equal(selectedComparison.totalGap, selectedComparison.currentCost.total! - selectedComparison.referenceCost.total!)
assert.notEqual(selectedComparison.totalGap, comparison.totalGap,
  'selected scope reports its own Gap while Full Comparison remains independently available')
const emptySelection = createSelectedSnapshotPair({ reference, current }, comparison, { bomFindingKeys: [], routingFindingKeys: [] })
assert.deepEqual(emptySelection.reference.bom, [])
assert.deepEqual(emptySelection.current.routing, [])
assert.deepEqual(emptySelection.reference.rates, reference.rates)

const store = readFileSync(resolve(process.cwd(), 'src/state/store.tsx'), 'utf8')
assert.match(store, /useState<StoredSelectedComparison \| null>\(null\)/,
  'Selected Comparison starts as temporary in-memory scope with Full Comparison as default')
assert.match(store, /selectedComparisonScope\?\.sourceFingerprint === snapshotSourceFingerprint/,
  'a Ref/Cur Working source change makes Selected Comparison inactive')
assert.match(store, /tab === 'simulation'\) setSelectedComparisonScope\(null\)/,
  'entering Simulation ends active scope')
assert.doesNotMatch(store, /saveToSession\([^\n]*selectedComparisonScope|STORAGE_KEYS\.[^\n]*SELECTED_COMPARISON/,
  'Selected Comparison is not stored or versioned')
const storeFiles = [
  'src/features/cost-breakdown/CostBreakdownPage.tsx',
  'src/features/candidate-selection/CandidateSelectionPage.tsx',
  'src/features/simulation/SimulationPage.tsx'
].map(path => readFileSync(resolve(process.cwd(), path), 'utf8')).join('\n')
assert.match(storeFiles, /clearSelectedComparison\(\)/, 'RCA entry clears active scope while preserving selected Candidate identities')
assert.doesNotMatch(storeFiles, /Selected Comparison is a dataset|selected-scope dataset/i)
assert.doesNotMatch(store + storeFiles, /comparison-export|exportSelectedComparison/i,
  'Selected Comparison is not wired into export')

console.log('Selected Comparison lifecycle verification passed')
