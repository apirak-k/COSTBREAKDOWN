import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as XLSX from 'xlsx'
import { createServer } from 'vite'

const vite = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error'
})
const visibleText = markup => markup.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

try {
  const [
    { WorkCenterComparisonTable },
    { SnapshotComparisonCard },
    { BOMTable },
    { WorkCenterRatesTable },
    { RoutingTable },
    { formatComparisonFieldDiffs },
    { parseSnapshotWorkbookData },
    { SimulationStoryGraph },
    { createScenarioStory }
  ] = await Promise.all([
    vite.ssrLoadModule('/src/features/cost-breakdown/components/WorkCenterComparisonTable.tsx'),
    vite.ssrLoadModule('/src/features/cost-breakdown/components/SnapshotComparisonCard.tsx'),
    vite.ssrLoadModule('/src/features/master-data/components/BOMTable.tsx'),
    vite.ssrLoadModule('/src/features/master-data/components/WorkCenterRatesTable.tsx'),
    vite.ssrLoadModule('/src/features/master-data/components/RoutingTable.tsx'),
    vite.ssrLoadModule('/src/features/cost-breakdown/components/comparison-field-details.ts'),
    vite.ssrLoadModule('/src/services/excel/snapshot-parser.ts'),
    vite.ssrLoadModule('/src/features/simulation/SimulationStoryGraph.tsx'),
    vite.ssrLoadModule('/src/core/calculations/scenario-story.ts')
  ])

  const storyReference = { material: 10, labor: 2, burden: 3, standardCost: 15, sgaAmountPerPiece: 2, operatingProfitPerPiece: 8, sellingPrice: 25 }
  const storyCurrent = { material: 12, labor: 1, burden: 3, standardCost: 16, sgaAmountPerPiece: 2.5, operatingProfitPerPiece: 6.5, sellingPrice: 25 }
  const storySimulated = { material: 60, labor: 20, burden: 15, standardCost: 95, sgaAmountPerPiece: 10, operatingProfitPerPiece: -5, sellingPrice: 100 }
  const finalStory = createScenarioStory(storyReference, storyCurrent, storySimulated)
  const selectedStoryMarkup = renderToStaticMarkup(React.createElement(SimulationStoryGraph, {
    story: finalStory,
    unit: 'PC',
    activeRole: 'current',
    onSelectActiveDataset() {}
  }))
  const selectedStoryText = visibleText(selectedStoryMarkup)
  const selectedStoryLegend = selectedStoryMarkup.match(/<ul aria-label="Simulation graph legend"[\s\S]*?<\/ul>/)?.[0] ?? ''
  for (const label of ['Material', 'Labor', 'Burden', 'SG&amp;A', 'Profit +', 'Profit −', 'Selling Price', 'Ruler']) {
    assert.ok(selectedStoryLegend.includes(`aria-label="${label}"`), `the final graph legend must expose ${label}`)
  }
  const graphCategoryLabels = [...selectedStoryMarkup.matchAll(/<button\b[^>]*>(Reference|Current|Custom)<\/button>|<text\b[^>]*>(GAP [12])<\/text>/g)]
    .map(match => match[1] ?? match[2])
  assert.deepEqual(graphCategoryLabels, ['Reference', 'GAP 1', 'Current', 'GAP 2', 'Custom'],
    'the finalized story preserves Reference → GAP 1 → Current → GAP 2 → Custom')
  assert.match(selectedStoryMarkup, /GAP 1 · Current − Reference · Material Gap: \+2\.00 THB\/PC/)
  assert.match(selectedStoryMarkup, /GAP 2 · Custom − Current · Material Gap: \+48\.00 THB\/PC/)
  assert.match(selectedStoryMarkup, /data-graph-standard-cost-value="reference"[^>]*>15\.00/)
  assert.match(selectedStoryMarkup, /data-graph-standard-cost-value="current"[^>]*>16\.00/)
  assert.match(selectedStoryMarkup, /data-graph-standard-cost-value="custom"[^>]*>95\.00/)
  assert.match(selectedStoryMarkup, /aria-label="Custom Operating Profit: -5\.00 THB\/PC"/)
  assert.ok(selectedStoryText.includes('Simulation Cost Structure'))
  assert.doesNotMatch(selectedStoryMarkup, /Scenario A|Scenario B|Trial/)
  assert.doesNotMatch(selectedStoryMarkup, /Simulated − Reference|Reference − Simulated|Gross Profit|GP Margin|OP Margin/)
  const blankWorkCenterWorkbook = XLSX.utils.book_new()
  const addSheet = (name, rows) => XLSX.utils.book_append_sheet(blankWorkCenterWorkbook, XLSX.utils.aoa_to_sheet(rows), name)
  addSheet('META', [
    ['META'], [],
    ['PRODUCT NAME', 'Review fixture'],
    ['UOM', 'PC'],
    ['SELLING PRICE', null],
    ['SG&A %', null],
    ['DATASET REMARK', '']
  ])
  addSheet('WORK_CENTER', [
    ['WORK CENTER'], [],
    ['WC', 'Labor', 'Burden', 'Note'],
    ['WC-1', 10, 5, '']
  ])
  addSheet('BOM', [['BOM'], [], ['Name', 'Usage', 'Unit', 'Price', 'Loss', 'Note']])
  addSheet('ROUTING', [['ROUTING'], [], ['Process', 'WC', 'Manning', 'Cap', 'Yield', 'Note']])
  const workbookBytes = XLSX.write(blankWorkCenterWorkbook, { type: 'array', bookType: 'xlsx' })
  const workbookBuffer = workbookBytes instanceof ArrayBuffer
    ? workbookBytes
    : workbookBytes.buffer.slice(workbookBytes.byteOffset, workbookBytes.byteOffset + workbookBytes.byteLength)
  const roundTripResult = parseSnapshotWorkbookData(workbookBuffer, 'current')
  assert.equal(roundTripResult.success, true)
  assert.equal(roundTripResult.snapshot.rates[0].workCenterCode, 'WC-1', 'approved Work Center identity must stay intact when imported')

  assert.deepEqual(formatComparisonFieldDiffs({
    sequence: { reference: 10, current: 20 },
    manning: { reference: 1, current: null },
    processName: { reference: 'Cut', current: 'Turn' },
    'additionalFields.Batch Size': { reference: undefined, current: 5 }
  }), [
    { field: 'sequence', label: 'Sequence', reference: '10', current: '20' },
    { field: 'manning', label: 'Manning', reference: '1', current: '—' },
    { field: 'processName', label: 'Process Name', reference: 'Cut', current: 'Turn' },
    { field: 'additionalFields.Batch Size', label: 'Batch Size', reference: '—', current: '5' }
  ])

  const referenceRate = {
    id: 'rate-ref', workCenterCode: 'WC-01', description: 'Old work center',
    laborRate: 10, burdenRate: 5, effectiveDate: '', confidence: {}
  }
  const currentRate = { ...referenceRate, id: 'rate-current', description: null }
  const workCenterMarkup = renderToStaticMarkup(React.createElement(WorkCenterComparisonTable, {
    referenceRates: [referenceRate],
    currentRates: [currentRate],
    findings: [{
      referenceId: referenceRate.id, currentId: currentRate.id, matchStatus: 'matched',
      changeFlags: {},
      fieldDiffs: { description: { reference: 'Old work center', current: null } },
      confidence: 'verified'
    }]
  }))
  const workCenterText = visibleText(workCenterMarkup)
  assert.ok(workCenterText.includes('Description: Before Old work center → After —'))
  assert.match(workCenterMarkup, /<td class="p-2\.5 font-sans text-slate-700">—<\/td>/)

  const assertMasterDataTableIsQuiet = markup => {
    assert.doesNotMatch(markup, /rows need review|Name is required|Name must be unique|Usage is missing|Unit is missing|Price is missing|Loss is missing|WC is required|Process is required|not in the WC table|Manning is missing|Cap is missing|Yield is missing/)
    assert.ok(markup.includes('aria-invalid="true"'), 'invalid cells stay exposed to assistive technology')
    assert.match(markup, /border-amber-300[^\"]*!?bg-amber-50/, 'invalid cells stay visibly marked')
    const headerRow = markup.match(/<thead[^>]*>\s*<tr>([\s\S]*?)<\/tr>/)?.[1] ?? ''
    assert.match(headerRow, /<th[^>]*class="sticky left-0[^>]*>[\s\S]*?<button[^>]*aria-label="Select all visible [^"]+ rows"[^>]*>\#[\s\S]*?<\/button>/,
      'the Select All row-number control must stay pinned at the left')
    assert.match(headerRow, /<th[^>]*>Actions<\/th>$/, 'Actions must remain the rightmost table column')
    const firstBodyRow = markup.match(/<tbody[^>]*>[\s\S]*?<tr[^>]*>([\s\S]*?)<\/tr>/)?.[1] ?? ''
    const cells = [...firstBodyRow.matchAll(/<td\b[^>]*>[\s\S]*?<\/td>/g)].map(match => match[0])
    assert.match(cells.at(-1) ?? '', /aria-label="Drag (?:BOM|Work Centers|Routing) row 1 to reorder"/,
      'accessible drag handle must be in the final row cell')
  }
  const masterDataCallbacks = {
    warningCount: 0,
    warningItems: [],
    blockerItems: [],
    onNavigateWarning() {},
    onNavigateBlocker() {},
    onWarningNavigationHandled() {},
    onUndo() {},
    onRedo() {},
    onAddBOMItem() {}, onUpdateBOMItems() {}, onDeleteBOMItems() {}, onReorderRows() {},
    onAddRate() {}, onUpdateRates() {}, onDeleteRates() {},
    onAddRoutingStep() {}, onUpdateRoutingSteps() {}, onDeleteRoutingSteps() {}
  }
  const bomTableMarkup = renderToStaticMarkup(React.createElement(BOMTable, {
    bom: [{ id: 'bom-invalid', description: '', consumption: null, unit: '', price: null, loss: null, note: '' }],
    isEditMode: true, historyScope: 'review-feedback', ...masterDataCallbacks
  }))
  assertMasterDataTableIsQuiet(bomTableMarkup)
  const workCenterTableMarkup = renderToStaticMarkup(React.createElement(WorkCenterRatesTable, {
    rates: [{ id: 'wc-invalid', workCenterCode: '', laborRate: null, burdenRate: null, note: '' }],
    isEditMode: true, historyScope: 'review-feedback', ...masterDataCallbacks
  }))
  assertMasterDataTableIsQuiet(workCenterTableMarkup)
  const routingTableMarkup = renderToStaticMarkup(React.createElement(RoutingTable, {
    routing: [{ id: 'routing-invalid', processName: '', workCenterId: 'UNKNOWN', manning: null, capacity: null, yield: null, note: '' }],
    rates: [], isEditMode: true, historyScope: 'review-feedback', ...masterDataCallbacks
  }))
  assertMasterDataTableIsQuiet(routingTableMarkup)

  const emptyCost = { material: 0, labor: 0, burden: 0, total: 0, status: 'complete' }
  const summaryMarkup = renderToStaticMarkup(React.createElement(SnapshotComparisonCard, {
    comparison: {
      referenceCost: emptyCost,
      currentCost: emptyCost,
      totalGap: 0,
      elementGaps: { material: 0, labor: 0, burden: 0 },
      bomFindings: [],
      routingFindings: [],
      processingFindings: [],
      workCenterFindings: [],
      reconciliation: { reconciled: true }
    },
    gapDirection: 'Current − Reference'
  }))
  for (const label of ['Cost Element', 'Before', 'After', 'GAP', '%GAP', 'Material', 'Labor', 'Burden', 'Standard Cost']) {
    assert.ok(summaryMarkup.includes(label), `the Cost Element summary still exposes ${label}`)
  }

  console.log('Cost Breakdown review feedback component checks passed.')
} finally {
  await vite.close()
}
