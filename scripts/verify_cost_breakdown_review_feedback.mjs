import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'

const vite = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error'
})
const visibleText = markup => markup.replace(/<[^>]*>/g, '')

try {
  const [
    { RoutingDetailedTable },
    { BOMDetailedTable },
    { WorkCenterComparisonTable },
    { SnapshotComparisonCard },
    { formatComparisonFieldDiffs }
  ] = await Promise.all([
    vite.ssrLoadModule('/src/features/cost-breakdown/components/RoutingDetailedTable.tsx'),
    vite.ssrLoadModule('/src/features/cost-breakdown/components/BOMDetailedTable.tsx'),
    vite.ssrLoadModule('/src/features/cost-breakdown/components/WorkCenterComparisonTable.tsx'),
    vite.ssrLoadModule('/src/features/cost-breakdown/components/SnapshotComparisonCard.tsx'),
    vite.ssrLoadModule('/src/features/cost-breakdown/components/comparison-field-details.ts')
  ])

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

  console.log('Cost Breakdown review feedback component checks passed.')
} finally {
  await vite.close()
}
