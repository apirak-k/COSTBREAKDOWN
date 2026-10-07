import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as XLSX from 'xlsx'
import { createServer } from 'vite'

const comparisonGapCandidate = {
  candidateKey: 'bom:bom-1', candidateName: 'Material price', category: 'Direct Material',
  factor: 'Price', status: 'CHANGED', referenceCost: 10, currentCost: 22, costGap: 12,
  controllable: true, rank: 1, sourceType: 'bom', sourceId: 'bom-1'
}

const vite = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
  plugins: [{
    name: 'candidate-selection-test-store',
    enforce: 'pre',
    resolveId(source, importer) {
      if (source === '../../state' && importer?.replaceAll('\\', '/').endsWith('/src/features/candidate-selection/CandidateSelectionPage.tsx')) {
        return '\0candidate-selection-test-store'
      }
      return null
    },
    load(id) {
      if (id !== '\0candidate-selection-test-store') return null
      return `export const useAppStore = () => ({ candidates: [${JSON.stringify(comparisonGapCandidate)}], snapshotComparison: { totalGap: null }, toggleCandidateControllable() {} })`
    }
  }]
})
const visibleText = markup => markup.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

try {
  const [
    { RoutingDetailedTable },
    { BOMDetailedTable },
    { WorkCenterComparisonTable },
    { SnapshotComparisonCard },
    { BOMTable },
    { WorkCenterRatesTable },
    { RoutingTable },
    { formatComparisonFieldDiffs },
    { ProblemStatementCard },
    { CandidateSelectionPage },
    { CandidatesTable },
    { CandidateRow },
    { parseSnapshotWorkbookData },
    { SimulationGrid },
    { createScenarioDrafts },
    { ScenarioOutcomeReview },
    { createScenarioStory }
  ] = await Promise.all([
    vite.ssrLoadModule('/src/features/cost-breakdown/components/RoutingDetailedTable.tsx'),
    vite.ssrLoadModule('/src/features/cost-breakdown/components/BOMDetailedTable.tsx'),
    vite.ssrLoadModule('/src/features/cost-breakdown/components/WorkCenterComparisonTable.tsx'),
    vite.ssrLoadModule('/src/features/cost-breakdown/components/SnapshotComparisonCard.tsx'),
    vite.ssrLoadModule('/src/features/master-data/components/BOMTable.tsx'),
    vite.ssrLoadModule('/src/features/master-data/components/WorkCenterRatesTable.tsx'),
    vite.ssrLoadModule('/src/features/master-data/components/RoutingTable.tsx'),
    vite.ssrLoadModule('/src/features/cost-breakdown/components/comparison-field-details.ts'),
    vite.ssrLoadModule('/src/features/rca-simulation/components/ProblemStatementCard.tsx'),
    vite.ssrLoadModule('/src/features/candidate-selection/CandidateSelectionPage.tsx'),
    vite.ssrLoadModule('/src/features/candidate-selection/components/CandidatesTable.tsx'),
    vite.ssrLoadModule('/src/features/candidate-selection/components/CandidateRow.tsx'),
    vite.ssrLoadModule('/src/services/excel/snapshot-parser.ts'),
    vite.ssrLoadModule('/src/features/rca-simulation/components/SimulationGrid.tsx'),
    vite.ssrLoadModule('/src/features/rca-simulation/scenario-draft.ts'),
    vite.ssrLoadModule('/src/features/rca-simulation/components/ScenarioOutcomeReview.tsx'),
    vite.ssrLoadModule('/src/core/calculations/scenario-story.ts')
  ])

  const simulationGridMarkup = renderToStaticMarkup(React.createElement(SimulationGrid, {
    scenarios: createScenarioDrafts(),
    inputDefinitions: [],
    results: [],
    economicsResults: [],
    businessResults: [],
    currentBusinessInputs: { sellingPrice: null, sgaPercent: null },
    inputWarningsByLetter: { A: [], B: [] },
    economicsInputWarningsByLetter: { A: [], B: [] },
    businessInputWarningsByLetter: { A: [], B: [] },
    onUpdateLabel() {},
    onUpdateInput() {},
    onUpdateEconomics() {},
    onUpdateBusinessInput() {}
  }))
  assert.match(simulationGridMarkup, /Compare two scenarios/)
  assert.match(simulationGridMarkup, /Scenario A/)
  assert.match(simulationGridMarkup, /Scenario B/)
  assert.doesNotMatch(simulationGridMarkup, /Scenario C/)
  assert.equal((simulationGridMarkup.match(/<article\b/g) ?? []).length, 2, 'the simulation renders exactly two scenario cards')

  const storyReference = { material: 10, labor: 2, burden: 3, standardCost: 15, sgaAmountPerPiece: 2, operatingProfitPerPiece: 8, sellingPrice: 25 }
  const storyCurrent = { material: 12, labor: 1, burden: 3, standardCost: 16, sgaAmountPerPiece: 2.5, operatingProfitPerPiece: 6.5, sellingPrice: 25 }
  const storySimulated = { material: 60, labor: 20, burden: 15, standardCost: 95, sgaAmountPerPiece: 10, operatingProfitPerPiece: -5, sellingPrice: 100 }
  const finalStory = createScenarioStory(storyReference, storyCurrent, storySimulated)
  const scenarioAResult = { material: 40, labor: 12, burden: 8, standardCost: 60, sgaAmountPerPiece: 8, operatingProfitPerPiece: 2, sellingPrice: 70 }
  const scenarioBResult = { material: 42, labor: 10, burden: 7, standardCost: 59, sgaAmountPerPiece: 9, operatingProfitPerPiece: -1, sellingPrice: 67 }
  const noScenarioChoiceMarkup = renderToStaticMarkup(React.createElement(ScenarioOutcomeReview, {
    scenarioA: scenarioAResult,
    scenarioB: scenarioBResult,
    selectedScenarioLetter: null,
    story: null,
    onSelectScenario() {}
  }))
  assert.match(noScenarioChoiceMarkup, /A\/B monetary outcomes · THB\/pc/)
  assert.match(noScenarioChoiceMarkup, /Selling Price/)
  assert.match(noScenarioChoiceMarkup, /aria-label="Scenario A and B per-piece comparison for MAT, LB, BD, Standard Cost, SG&amp;A, OP, and Selling Price\./)
  for (const value of ['A 40.00', 'B 42.00', 'A 12.00', 'B 10.00', 'A 8.00', 'B 7.00', 'A 60.00', 'B 59.00', 'A 70.00', 'B 67.00']) {
    assert.ok(noScenarioChoiceMarkup.includes(value), `A/B result graph must expose ${value}`)
  }
  assert.match(noScenarioChoiceMarkup, /Select Scenario A or B/)
  assert.doesNotMatch(noScenarioChoiceMarkup, /final-story-graph-heading/)

  const selectedStoryMarkup = renderToStaticMarkup(React.createElement(ScenarioOutcomeReview, {
    scenarioA: scenarioAResult,
    scenarioB: scenarioBResult,
    selectedScenarioLetter: 'A',
    story: finalStory,
    onSelectScenario() {}
  }))
  const selectedStoryText = visibleText(selectedStoryMarkup)
  for (const label of ['MAT', 'LB', 'BD', 'Standard Cost', 'OP', 'Selling Price']) {
    assert.ok(selectedStoryText.includes(label), `the final story must expose ${label}`)
  }
  assert.ok(selectedStoryMarkup.includes('SG&amp;A'), 'the final story must expose SG&A')
  for (const value of ['10.0000', '2.0000', '3.0000', '15.0000', '25.0000', '12.0000', '16.0000', '95.0000', '100.0000', '-5.0000']) {
    assert.ok(selectedStoryText.includes(value), `the final story must expose the state value ${value}`)
  }
  const scenarioAOpLabel = selectedStoryMarkup.match(/<text x="548" y="([^"]+)"[^>]*>A 2\.00<\/text>/)
  const scenarioBOpLabel = selectedStoryMarkup.match(/<text x="548" y="([^"]+)"[^>]*>B -1\.00 · Operating loss<\/text>/)
  assert.ok(scenarioAOpLabel && scenarioBOpLabel, 'the A/B graph places its Operating loss values in separate aligned rows')
  assert.notEqual(scenarioAOpLabel[1], scenarioBOpLabel[1], 'Scenario A and B value labels do not share a baseline')
  assert.match(selectedStoryMarkup, /Reference → Current → Simulated/)
  assert.match(selectedStoryMarkup, /Gap 1<br\/?>Current − Reference/)
  assert.match(selectedStoryMarkup, /Gap 2<br\/?>Simulated − Current/)
  assert.equal((selectedStoryMarkup.match(/Gap [12]<br/g) ?? []).length, 2, 'the selected story has exactly two adjacent gaps')
  assert.match(selectedStoryMarkup, /Simulated − Current/)
  assert.match(selectedStoryMarkup, /Operating loss/)
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

  const costContextMarkup = renderToStaticMarkup(React.createElement(ProblemStatementCard, {
    candidate: comparisonGapCandidate
  }))
  assert.match(costContextMarkup, /Reference cost \(THB\/pc\)<\/dt><dd[^>]*>10<\/dd>/)
  assert.match(costContextMarkup, /Current cost \(THB\/pc\)<\/dt><dd[^>]*>22<\/dd>/)

  const changedInputsMarkup = renderToStaticMarkup(React.createElement(ProblemStatementCard, {
    candidate: {
      ...comparisonGapCandidate,
      changeDetails: [
        { field: 'Price', reference: 2, current: 3 },
        { field: 'Loss', reference: 0.1, current: 0.2 }
      ]
    }
  }))
  const changedInputsText = visibleText(changedInputsMarkup)
  assert.ok(changedInputsText.includes('Changed inputs'))
  assert.ok(changedInputsText.includes('Price 2 → to 3'))
  assert.ok(changedInputsText.includes('Loss 10% → to 20%'))
  assert.doesNotMatch(changedInputsMarkup, /Price.*THB.*allocation/i)

  const candidateSummaryMarkup = renderToStaticMarkup(React.createElement(CandidateSelectionPage))
  const comparisonSummary = candidateSummaryMarkup.match(/<dt[^>]*>(?:Full|Selected) comparison gap<\/dt><dd[^>]*>([\s\S]*?)<\/dd>/i)?.[1]
  assert.equal(comparisonSummary, '—', 'the exact comparison total must remain unavailable when reconciliation has no total')
  const candidateSubtotalMarkup = renderToStaticMarkup(React.createElement(CandidatesTable, {
    candidates: [comparisonGapCandidate], onToggleControllable() {}, showVisibleGap: true
  }))
  assert.ok(candidateSubtotalMarkup.includes('Visible candidate gap'), 'candidate subtotal remains separately labeled in its table')
  assert.ok(candidateSubtotalMarkup.includes('Subtotal · selected status rows'))

  const processCandidateMarkup = renderToStaticMarkup(React.createElement(CandidateRow, {
    candidate: {
      ...comparisonGapCandidate,
      candidateName: 'Process A',
      category: 'Process / Routing',
      sourceType: 'process',
      processBreakdown: {
        reference: [{ id: 'ref-a', processName: 'Process A', manning: 1, capacity: 10, yield: 1, laborCost: 1, burdenCost: 0.5, totalCost: 1.5 }],
        current: [{ id: 'cur-a', processName: 'Process A', manning: 1, capacity: 10, yield: 1, laborCost: 1, burdenCost: 0.5, totalCost: 1.5 }]
      }
    },
    onToggleControllable() {}
  }))
  assert.match(processCandidateMarkup, /Process details \(1 Reference · 1 Current\)/)
  assert.doesNotMatch(processCandidateMarkup, /Process A2/)

  const factorCandidateMarkup = renderToStaticMarkup(React.createElement(CandidateRow, {
    candidate: {
      ...comparisonGapCandidate,
      candidateName: 'Resin',
      factor: 'Multiple input changes',
      changeDetails: [
        { field: 'Price', reference: 2, current: 3 },
        { field: 'Loss', reference: 0.1, current: 0.2 }
      ]
    },
    onToggleControllable() {}
  }))
  const factorCandidateText = visibleText(factorCandidateMarkup)
  assert.ok(factorCandidateText.includes('Price: 2.0000 → to 3.0000'))
  assert.ok(factorCandidateText.includes('Loss: 10.0% → to 20.0%'))

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

  const referenceRouting = {
    id: 'routing-ref', operationCode: 'OP-10', sequence: 10, processName: 'Cut',
    workCenterId: 'WC-01', manning: 1, capacity: 100, yield: 0.95, confidence: {}
  }
  const currentRouting = {
    ...referenceRouting, id: 'routing-current', sequence: 20, processName: 'Turn',
    workCenterId: 'WC-02', manning: null
  }
  const routingFinding = {
    referenceId: referenceRouting.id,
    currentId: currentRouting.id,
    matchStatus: 'matched',
    changeFlags: {},
    fieldDiffs: {
      sequence: { reference: 10, current: 20 },
      processName: { reference: 'Cut', current: 'Turn' },
      workCenterId: { reference: 'WC-01', current: 'WC-02' },
      manning: { reference: 1, current: null }
    },
    confidence: 'verified'
  }
  const routingMarkup = renderToStaticMarkup(React.createElement(RoutingDetailedTable, {
    referenceItems: [referenceRouting],
    currentItems: [currentRouting],
    referenceRates: [],
    currentRates: [],
    findings: [routingFinding]
  }))
  const routingText = visibleText(routingMarkup)
  const routingBody = routingMarkup.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/)?.[1] ?? ''
  for (const heading of ['Ref Sequence', 'Current Sequence', 'Ref Manning', 'Current Manning']) {
    assert.ok(routingMarkup.includes(heading), `Routing table should show ${heading}`)
  }
  assert.ok(routingText.includes('Sequence: 10 → 20'))
  assert.ok(routingText.includes('Manning: 1 → —'))
  assert.ok(routingText.includes('Process Name: Cut → Turn'))
  assert.ok(routingText.includes('Work Center Id: WC-01 → WC-02'))
  assert.match(routingBody, /<td class="p-2\.5 text-slate-500 tabular-nums">10<\/td><td class="p-2\.5 text-right font-bold text-slate-900 tabular-nums">20<\/td>/)
  assert.match(routingBody, /<td class="p-2\.5 text-right text-slate-500 tabular-nums">1\.0<\/td><td class="p-2\.5 text-right font-bold text-slate-900 tabular-nums">—<\/td>/)

  const referenceBOM = {
    id: 'bom-ref', itemCode: 'MAT-01', description: 'Old description',
    consumption: 1, unit: 'EA', price: 2, loss: 0.03, confidence: {}
  }
  const currentBOM = {
    ...referenceBOM, id: 'bom-current', description: null, unit: null
  }
  const bomMarkup = renderToStaticMarkup(React.createElement(BOMDetailedTable, {
    referenceItems: [referenceBOM],
    currentItems: [currentBOM],
    findings: [{
      referenceId: referenceBOM.id, currentId: currentBOM.id, matchStatus: 'matched',
      changeFlags: {},
      fieldDiffs: {
        description: { reference: 'Old description', current: null },
        unit: { reference: 'EA', current: null }
      },
      confidence: 'verified'
    }]
  }))
  const bomText = visibleText(bomMarkup)
  const bomBody = bomMarkup.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/)?.[1] ?? ''
  assert.ok(bomText.includes('Name: Old description → —'))
  assert.ok(bomText.includes('Unit: EA → —'))
  assert.match(bomBody, /title="—"><div class="space-y-1"><div>—<\/div>/)
  assert.match(bomBody, /class="p-2\.5 font-sans font-medium text-slate-800 whitespace-nowrap">—<\/td>/)

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
  assert.ok(workCenterText.includes('Description: Old work center → —'))
  assert.match(workCenterMarkup, /<td class="p-2\.5 font-sans text-slate-700">—<\/td>/)

  const assertMasterDataTableIsQuiet = (markup, reorderLabel) => {
    assert.doesNotMatch(markup, /rows need review|Name is required|Name must be unique|Usage is missing|Unit is missing|Price is missing|Loss is missing|WC is required|Process is required|not in the WC table|Manning is missing|Cap is missing|Yield is missing/)
    assert.ok(markup.includes('aria-invalid="true"'), 'invalid cells stay exposed to assistive technology')
    assert.ok(markup.includes('border-amber-600 bg-amber-50'), 'invalid cells stay visibly marked')
    const headerRow = markup.match(/<thead[^>]*>\s*<tr>([\s\S]*?)<\/tr>/)?.[1] ?? ''
    assert.match(headerRow, /<th[^>]*class="sticky left-0[^>]*>\#<\/th>/, 'row number must stay pinned at the left')
    assert.ok(headerRow.lastIndexOf('aria-label="Reorder rows"') > headerRow.lastIndexOf('>Actions</th>'), 'reorder column must be at the far right')
    const firstBodyRow = markup.match(/<tbody[^>]*>[\s\S]*?<tr[^>]*>([\s\S]*?)<\/tr>/)?.[1] ?? ''
    const cells = [...firstBodyRow.matchAll(/<td\b[^>]*>[\s\S]*?<\/td>/g)].map(match => match[0])
    assert.ok(cells.at(-1)?.includes(reorderLabel), 'drag handle must be the last row cell')
  }
  const masterDataCallbacks = {
    onAddBOMItem() {}, onUpdateBOMItem() {}, onDeleteBOMItem() {}, onReorderRows() {},
    onAddRate() {}, onUpdateRate() {}, onDeleteRate() {},
    onAddRoutingStep() {}, onUpdateRoutingStep() {}, onDeleteRoutingStep() {}
  }
  const bomTableMarkup = renderToStaticMarkup(React.createElement(BOMTable, {
    bom: [{ id: 'bom-invalid', description: '', consumption: null, unit: '', price: null, loss: null, note: '' }],
    isEditMode: true, historyScope: 'review-feedback', ...masterDataCallbacks
  }))
  assertMasterDataTableIsQuiet(bomTableMarkup, 'Drag to reorder BOM row 1')
  const workCenterTableMarkup = renderToStaticMarkup(React.createElement(WorkCenterRatesTable, {
    rates: [{ id: 'wc-invalid', workCenterCode: '', laborRate: null, burdenRate: null, note: '' }],
    isEditMode: true, historyScope: 'review-feedback', ...masterDataCallbacks
  }))
  assertMasterDataTableIsQuiet(workCenterTableMarkup, 'Drag to reorder WC row 1')
  const routingTableMarkup = renderToStaticMarkup(React.createElement(RoutingTable, {
    routing: [{ id: 'routing-invalid', processName: '', workCenterId: 'UNKNOWN', manning: null, capacity: null, yield: null, note: '' }],
    rates: [], isEditMode: true, historyScope: 'review-feedback', ...masterDataCallbacks
  }))
  assertMasterDataTableIsQuiet(routingTableMarkup, 'Drag to reorder Routing row 1')

  const warnings = Array.from({ length: 5 }, (_, index) => ({
    code: `WARNING-${index + 1}`,
    message: `Review warning ${index + 1}`
  }))
  const emptyCost = { material: 0, labor: 0, burden: 0, total: 0, status: 'complete' }
  const summaryMarkup = renderToStaticMarkup(React.createElement(SnapshotComparisonCard, {
    comparison: {
      referenceCost: emptyCost,
      currentCost: emptyCost,
      totalGap: 0,
      elementGaps: { material: 0, labor: 0, burden: 0 },
      bomFindings: [],
      routingFindings: [],
      workCenterFindings: [],
      warnings,
      reconciliation: { reconciled: true }
    }
  }))
  for (const warning of warnings) assert.ok(summaryMarkup.includes(warning.message))
  assert.equal((summaryMarkup.match(/<li>/g) ?? []).length, 5)
  const warningDisclosure = summaryMarkup.match(/<details>([\s\S]*?)<\/details>/)?.[0] ?? ''
  assert.match(warningDisclosure, /<summary[^>]*>Review warnings \(5\)<\/summary>[\s\S]*?<ul\b/)
  assert.ok(!/<details\b[^>]*\bopen/.test(warningDisclosure), 'warning details must be collapsed by default')

  console.log('Cost Breakdown review feedback component checks passed.')
} finally {
  await vite.close()
}
