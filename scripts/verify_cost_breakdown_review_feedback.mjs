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
    { DashboardPage },
    { parseSnapshotWorkbookData }
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
    vite.ssrLoadModule('/src/features/dashboard/DashboardPage.tsx'),
    vite.ssrLoadModule('/src/services/excel/snapshot-parser.ts')
  ])

  const blankWorkCenterWorkbook = XLSX.utils.book_new()
  const addSheet = (name, rows) => XLSX.utils.book_append_sheet(blankWorkCenterWorkbook, XLSX.utils.aoa_to_sheet(rows), name)
  addSheet('META', [
    ['MASTER DATA DATASET'],
    [],
    ['Product Name', 'UOM', 'Selling Price (THB)', 'SG&A (%)', 'Dataset Remark'],
    ['Review fixture', 'PC', null, null, '']
  ])
  addSheet('WORK_CENTER', [
    ['WC', 'Labor', 'Burden', 'Note'],
    ['WC-1', 10, 5, '']
  ])
  addSheet('BOM', [['Name', 'Usage', 'Unit', 'Price', 'Loss', 'Note']])
  addSheet('ROUTING', [['Process', 'WC', 'Manning', 'Cap', 'Yield', 'Note']])
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
      candidateName: 'Work Center WC-1',
      category: 'Processing Cost',
      sourceType: 'work-center',
      processBreakdown: {
        reference: [{ id: 'ref-a', processName: 'Process A', manning: 1, capacity: 10, yield: 1, laborCost: 1, burdenCost: 0.5, totalCost: 1.5 }],
        current: [
          { id: 'cur-a', processName: 'Process A', manning: 1, capacity: 10, yield: 1, laborCost: 1, burdenCost: 0.5, totalCost: 1.5 },
          { id: 'cur-a2', processName: 'Process A2', manning: 1, capacity: 20, yield: 1, laborCost: 0.5, burdenCost: 0.25, totalCost: 0.75 }
        ]
      }
    },
    onToggleControllable() {}
  }))
  assert.match(processCandidateMarkup, /Routing Process details \(1 Reference · 2 Current\)/)
  assert.match(processCandidateMarkup, /Process A2/)

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

  const makeDashboardSnapshot = (role, price) => ({
    id: `dashboard-${role}`,
    comparisonRole: role,
    status: 'active',
    sourceRef: `${role}.xlsx`,
    effectiveDate: '',
    product: {
      productName: 'Dashboard review fixture', productDescription: 'Dashboard review fixture',
      productCode: 'DASH-01', uom: 'PC', customer: '', effectiveDate: '',
      sellingPrice: 25, sgaPercent: 8
    },
    bom: [{ id: role === 'current' ? 'bom-current' : 'bom-reference', itemCode: 'legacy-item-code', description: 'Resin', consumption: 1, unit: 'KG', price, loss: 0.1, confidence: {} }],
    routing: [{ id: role === 'current' ? 'route-current' : 'route-reference', processName: 'Process A', workCenterId: 'WC-1', manning: 1, capacity: 1, yield: 1, confidence: {} }],
    rates: [{ id: role === 'current' ? 'rate-current' : 'rate-reference', workCenterCode: 'WC-1', description: 'Cutting', laborRate: 2, burdenRate: 1, effectiveDate: '', confidence: {} }]
  })
  const dashboardReference = makeDashboardSnapshot('reference', 9.09090909090909)
  const dashboardCurrent = makeDashboardSnapshot('current', 10)
  const dashboardCandidate = {
    candidateKey: 'mat:resin', candidateName: 'Resin', category: 'Direct Material', factor: 'Price',
    status: 'CHANGED', referenceCost: 10, currentCost: 11, costGap: 1, controllable: true,
    rank: 1, sourceType: 'bom', sourceId: 'bom-current',
    changeDetails: [{ field: 'Price', reference: 9.09090909090909, current: 10 }]
  }
  const dashboardProcessingCandidate = {
    candidateKey: 'wc:wc-1', candidateName: 'Work Center WC-1', category: 'Processing Cost',
    factor: 'Work Center Aggregation', status: 'CHANGED', referenceCost: 3, currentCost: 3,
    costGap: 0, controllable: true, rank: 2, sourceType: 'work-center', sourceId: 'rate-current',
    processBreakdown: {
      reference: [{ id: 'route-reference:0', processName: 'Process A', manning: 1, capacity: 1, yield: 1, laborCost: 2, burdenCost: 1, totalCost: 3 }],
      current: [{ id: 'route-current:0', processName: 'Process A', manning: 1, capacity: 1, yield: 1, laborCost: 2, burdenCost: 1, totalCost: 3 }]
    }
  }
  const dashboardComparison = {
    id: 'dashboard-comparison', referenceSnapshotId: dashboardReference.id, currentSnapshotId: dashboardCurrent.id,
    referenceCost: { snapshotId: dashboardReference.id, material: 10, labor: 2, burden: 1, total: 13, status: 'complete', warnings: [] },
    currentCost: { snapshotId: dashboardCurrent.id, material: 11, labor: 2, burden: 1, total: 14, status: 'complete', warnings: [] },
    totalGap: 1, elementGaps: { material: 1, labor: 0, burden: 0 },
    bomFindings: [], routingFindings: [], workCenterFindings: [], processingFindings: [], productFieldDiffs: {}, warnings: []
  }
  const dashboardDrafts = ['A', 'B', 'C'].map(letter => ({
    letter, label: letter === 'A' ? 'Higher price trial' : '',
    inputValues: letter === 'A'
      ? { '["bom","bom-current","price"]': '12' }
      : letter === 'B'
        ? { '["bom","bom-current","price"]': '8' }
        : {},
    economicsInputs: { fixedInvestment: '', variableAddedCostPerPiece: '', evaluationVolume: '' }
  }))
  const dashboardState = {
    sourceDataRevision: 0, selectedCandidateKey: 'mat:resin', trialHandoffLetter: null,
    scenarioDraftsByCandidate: { 'mat:resin': dashboardDrafts }
  }
  const dashboardProps = {
    analysisSnapshotPair: { reference: dashboardReference, current: dashboardCurrent },
    comparison: dashboardComparison,
    candidates: [dashboardCandidate, dashboardProcessingCandidate],
    selectedComparisonSelection: null, isSelectedComparisonActive: false,
    clearSelectedComparison() {}, simulationState: dashboardState, onOpenRca() {}
  }
  const dashboardMarkup = renderToStaticMarkup(React.createElement(DashboardPage, dashboardProps))
  const dashboardText = visibleText(dashboardMarkup)
  assert.ok(dashboardText.includes('Standard Cost by component'))
  assert.ok(dashboardText.includes('Reference vs Current'))
  assert.match(dashboardMarkup, /role="img" aria-label="Reference and Current stacked Standard Cost bars for Material, Labor, and Burden, with Selling Price shown as a line when available\."/)
  assert.ok(dashboardText.includes('Standard Cost / pc'))
  assert.ok(dashboardText.includes('+1.0000 THB/pc'))
  assert.ok(dashboardText.includes('Processing · Labor + Burden'))
  assert.ok(dashboardText.includes('Price: 9.0909 → 10'))
  assert.ok(dashboardText.includes('Process A'))
  assert.ok(dashboardText.includes('25.0000 THB'))
  assert.ok(dashboardText.includes('8.00%'))
  assert.doesNotMatch(dashboardMarkup, /MatVAR|LBVAR|BDVAR/)
  assert.ok(dashboardText.includes('Business metrics are not calculated — formula pending'))
  assert.ok(dashboardText.includes('16.2000'))
  assert.ok(dashboardText.includes('-2.2000'))
  assert.ok(dashboardText.includes('11.8000'))
  assert.ok(dashboardText.includes('+2.2000'))
  assert.match(dashboardMarkup, /Gross Saving · THB\/pc<\/p><p class="mt-1 font-mono text-base font-bold tabular-nums text-emerald-700">\+2\.2000/)
  assert.doesNotMatch(dashboardMarkup, /<dt[^>]*>COGS|<dt[^>]*>GP Margin|<dt[^>]*>OP Margin/)

  const dashboardWithoutCandidate = renderToStaticMarkup(React.createElement(DashboardPage, {
    ...dashboardProps,
    simulationState: { ...dashboardState, selectedCandidateKey: null }
  }))
  assert.match(dashboardWithoutCandidate, /Select a candidate in RCA &amp; Simulation/)
  assert.doesNotMatch(dashboardWithoutCandidate, /Scenario Standard Cost \/ pc/)

  const dashboardWithMissingCost = renderToStaticMarkup(React.createElement(DashboardPage, {
    ...dashboardProps,
    comparison: {
      ...dashboardComparison,
      currentCost: { ...dashboardComparison.currentCost, labor: null, total: null, status: 'missing' }
    }
  }))
  assert.ok(visibleText(dashboardWithMissingCost).includes('Unavailable'))

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
