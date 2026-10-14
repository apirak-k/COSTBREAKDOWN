import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createServer } from 'vite'
import type { CostSnapshot, SnapshotBOMItem, SnapshotRoutingStep, SnapshotWorkCenterRate } from '../src/core/types.ts'

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
try {
const { compareSnapshots, createSelectedSnapshotPair, getComparisonFindingKey } = await vite.ssrLoadModule('/src/core/index.ts')
const { getSelectedComparisonContribution } = await vite.ssrLoadModule('/src/features/cost-breakdown/components/comparison-view.ts')

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

const addedBomSelection = {
  bomFindingKeys: [getComparisonFindingKey('bom', comparison.bomFindings.find(finding => finding.currentId === 'cur-added')!)],
  routingFindingKeys: []
}
const addedBomPair = createSelectedSnapshotPair({ reference, current }, comparison, addedBomSelection)
const addedBomComparison = compareSnapshots(addedBomPair.reference, addedBomPair.current)
const addedBomContribution = getSelectedComparisonContribution(comparison, addedBomComparison, addedBomSelection)
assert.equal(addedBomComparison.elementGaps.material, null,
  'the existing selected snapshot comparison keeps its established missing-side behavior')
assert.deepEqual(addedBomContribution, {
  elementGaps: { material: 6, labor: 0, burden: 0 },
  totalGap: 6
}, 'Selected Comparison surfaces an Added BOM contribution and real zero for unselected conversion elements')

const removedBomSelection = {
  bomFindingKeys: [getComparisonFindingKey('bom', comparison.bomFindings.find(finding => finding.referenceId === 'ref-removed')!)],
  routingFindingKeys: []
}
const removedBomPair = createSelectedSnapshotPair({ reference, current }, comparison, removedBomSelection)
const removedBomComparison = compareSnapshots(removedBomPair.reference, removedBomPair.current)
assert.deepEqual(getSelectedComparisonContribution(comparison, removedBomComparison, removedBomSelection).elementGaps,
  { material: -4, labor: 0, burden: 0 }, 'a Removed BOM stays a signed negative Selected Material contribution')

const addedRoutingSelection = {
  bomFindingKeys: [],
  routingFindingKeys: [getComparisonFindingKey('routing', comparison.routingFindings.find(finding => finding.currentId === 'cur-process-added')!)]
}
const addedRoutingPair = createSelectedSnapshotPair({ reference, current }, comparison, addedRoutingSelection)
const addedRoutingComparison = compareSnapshots(addedRoutingPair.reference, addedRoutingPair.current)
const addedRoutingContribution = getSelectedComparisonContribution(comparison, addedRoutingComparison, addedRoutingSelection)
assert.deepEqual(addedRoutingContribution, {
  elementGaps: { material: 0, labor: 2.5, burden: 0.5 },
  totalGap: 3
}, 'selected WC processing supplies signed element contributions when the selected reference side is empty')

for (const branch of ['labor', 'burden'] as const) {
  const selectedWorkCenterGap = selectedComparison.processingFindings.reduce<number | null>(
    (sum, finding) => sum === null || finding.costEffect.gap[branch] === null
      ? null
      : sum + finding.costEffect.gap[branch]!,
    0
  )
  assert(selectedWorkCenterGap !== null && selectedComparison.elementGaps[branch] !== null
    && Math.abs(selectedWorkCenterGap - selectedComparison.elementGaps[branch]!) < 0.0001,
  `selected Work Center ${branch} contributions reconcile to Selected Comparison`)
}
const selectedWorkCenterTotal = selectedComparison.processingFindings.reduce<number | null>(
  (sum, finding) => sum === null || finding.costEffect.gap.total === null
    ? null
    : sum + finding.costEffect.gap.total,
  0
)
const selectedConversionGap = selectedComparison.elementGaps.labor === null || selectedComparison.elementGaps.burden === null
  ? null
  : selectedComparison.elementGaps.labor + selectedComparison.elementGaps.burden
assert(selectedWorkCenterTotal !== null && selectedConversionGap !== null
  && Math.abs(selectedWorkCenterTotal - selectedConversionGap) < 0.0001,
'selected Work Center total reconciles to selected Labor + Burden')

const oneRoutingSelection = {
  bomFindingKeys: [],
  routingFindingKeys: [getComparisonFindingKey('routing', comparison.routingFindings.find(finding => finding.currentId === 'cur-process-a')!)]
}
const oneRoutingPair = createSelectedSnapshotPair({ reference, current }, comparison, oneRoutingSelection)
const oneRoutingComparison = compareSnapshots(oneRoutingPair.reference, oneRoutingPair.current)
assert(oneRoutingComparison.processingFindings.some(finding => finding.workCenterCode === 'WC-1'),
  'selected routing keeps existing Work Center aggregation for the selected process')
assert(!oneRoutingComparison.processingFindings.some(finding => finding.workCenterCode === 'WC-2'),
  'an unselected Work Center has no selected processing finding and therefore a real selected net of zero')
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
    'opening Simulation ends active scope')
assert.doesNotMatch(store, /saveToSession\([^\n]*selectedComparisonScope|STORAGE_KEYS\.[^\n]*SELECTED_COMPARISON/,
  'Selected Comparison is not stored or versioned')
const storeFiles = [
  'src/features/cost-breakdown/CostBreakdownPage.tsx',
  'src/features/simulation/SimulationPage.tsx'
].map(path => readFileSync(resolve(process.cwd(), path), 'utf8')).join('\n')
assert.match(storeFiles, /clearSelectedComparison\(\)/, 'deselecting the final finding clears active scope')
assert.doesNotMatch(storeFiles, /Selected Comparison is a dataset|selected-scope dataset/i)
assert.doesNotMatch(store + storeFiles, /comparison-export|exportSelectedComparison/i,
  'Selected Comparison is not wired into export')

console.log('Selected Comparison lifecycle verification passed')
} finally {
  await vite.close()
}
