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
const visibleText = markup => markup.replace(/<[^>]*>/g, '')

try {
  const [
    { RoutingDetailedTable },
    { BOMDetailedTable },
    { WorkCenterComparisonTable },
    { SnapshotComparisonCard },
    { formatComparisonFieldDiffs },
    { ProblemStatementCard },
    { CandidateSelectionPage },
    { parseSnapshotWorkbookData }
  ] = await Promise.all([
    vite.ssrLoadModule('/src/features/cost-breakdown/components/RoutingDetailedTable.tsx'),
    vite.ssrLoadModule('/src/features/cost-breakdown/components/BOMDetailedTable.tsx'),
    vite.ssrLoadModule('/src/features/cost-breakdown/components/WorkCenterComparisonTable.tsx'),
    vite.ssrLoadModule('/src/features/cost-breakdown/components/SnapshotComparisonCard.tsx'),
    vite.ssrLoadModule('/src/features/cost-breakdown/components/comparison-field-details.ts'),
    vite.ssrLoadModule('/src/features/rca-simulation/components/ProblemStatementCard.tsx'),
    vite.ssrLoadModule('/src/features/candidate-selection/CandidateSelectionPage.tsx'),
    vite.ssrLoadModule('/src/services/excel/snapshot-parser.ts')
  ])

  const blankWorkCenterWorkbook = XLSX.utils.book_new()
  const addSheet = (name, rows) => XLSX.utils.book_append_sheet(blankWorkCenterWorkbook, XLSX.utils.aoa_to_sheet(rows), name)
  addSheet('META', [['Remark'], ['']])
  addSheet('PRODUCT', [['Product Code', 'Product Name', 'UOM', 'Note'], ['P-1', 'Part', 'PC', '']])
  addSheet('WORK_CENTER', [
    ['Work Center Code', 'Work Center Name', 'Labor Rate', 'Burden Rate', 'Note'],
    ['WC-1', '', 10, 5, '']
  ])
  addSheet('BOM', [['Item Code', 'Description', 'Consumption', 'Unit', 'Price', 'Loss', 'Note']])
  addSheet('ROUTING', [['Operation Code', 'Sequence', 'Process Name', 'Work Center Code', 'Manning', 'Capacity', 'Yield', 'Note']])
  const workbookBytes = XLSX.write(blankWorkCenterWorkbook, { type: 'array', bookType: 'xlsx' })
  const workbookBuffer = workbookBytes instanceof ArrayBuffer
    ? workbookBytes
    : workbookBytes.buffer.slice(workbookBytes.byteOffset, workbookBytes.byteOffset + workbookBytes.byteLength)
  const roundTripResult = parseSnapshotWorkbookData(workbookBuffer, 'current')
  assert.equal(roundTripResult.success, true)
  assert.equal(roundTripResult.snapshot.rates[0].description, '', 'blank Work Center Name must stay blank when imported')

  const lossMarkup = renderToStaticMarkup(React.createElement(ProblemStatementCard, {
    candidate: {
      ...comparisonGapCandidate, paramLabel: 'Loss (%)', referenceParam: 0.1, currentParam: 0.2
    }
  }))
  assert.match(lossMarkup, /Reference Loss \(%\)<\/dt><dd[^>]*>10<\/dd>/)
  assert.match(lossMarkup, /Current Loss \(%\)<\/dt><dd[^>]*>20<\/dd>/)

  const candidateSummaryMarkup = renderToStaticMarkup(React.createElement(CandidateSelectionPage))
  const comparisonSummary = candidateSummaryMarkup.match(/<dt[^>]*>Net comparison gap<\/dt><dd[^>]*>([\s\S]*?)<\/dd>/)?.[1]
  assert.equal(comparisonSummary, '—', 'the exact comparison total must remain unavailable when reconciliation has no total')
  assert.ok(candidateSummaryMarkup.includes('Net candidate gap:'), 'candidate subtotal remains separately labeled in its table')

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
  assert.ok(bomText.includes('Description: Old description → —'))
  assert.ok(bomText.includes('Unit: EA → —'))
  assert.match(bomBody, /title="—">—<\/td>/)
  assert.match(bomBody, /class="p-2\.5 font-sans text-slate-600 whitespace-nowrap">—<\/td>/)

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
  assert.ok(!summaryMarkup.includes('more warnings in detailed comparison'))
  const warningBlockStart = summaryMarkup.lastIndexOf(
    'border-t border-amber-200 bg-amber-50/70',
    summaryMarkup.indexOf('Review warnings (5)')
  )
  const warningBlock = summaryMarkup.slice(warningBlockStart, summaryMarkup.indexOf('</section>', warningBlockStart))
  assert.match(warningBlock, /<p\b[^>]*\brole="status"[^>]*>Review warnings \(5\)<\/p><ul\b/)
  assert.equal((warningBlock.match(/role="status"/g) ?? []).length, 1)

  console.log('Cost Breakdown review feedback component checks passed.')
} finally {
  await vite.close()
}
