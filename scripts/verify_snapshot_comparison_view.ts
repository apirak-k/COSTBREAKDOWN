import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import type { CostComparison } from '../src/core'

const comparison = {
  referenceCost: { status: 'complete', material: 10, labor: 2, burden: 1, total: 13 },
  currentCost: { status: 'estimated', material: 11, labor: 2.5, burden: 1.5, total: 15 },
  elementGaps: { material: 1, labor: 0.5, burden: 0.5 },
  totalGap: 2,
  bomFindings: [],
  routingFindings: [],
  reconciliation: { reconciled: true, discrepancy: 0 },
  warnings: [{ code: 'MISSING_RATE', message: 'Missing rate remains reviewable' }]
} as CostComparison

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
try {
  const { SnapshotComparisonCard } = await vite.ssrLoadModule('/src/features/cost-breakdown/components/SnapshotComparisonCard.tsx')
  const markup = renderToStaticMarkup(React.createElement(SnapshotComparisonCard, { comparison }))
  assert.doesNotMatch(markup, /Data quality:/, 'the page-level Data quality summary is absent')
  assert.doesNotMatch(markup, /Review warnings|Missing rate remains reviewable/, 'comparison warnings are not displayed in the summary')
  assert.doesNotMatch(markup, /Standard Cost reconciliation/, 'Standard Cost reconciliation UI is absent')
  assert.match(markup, /Standard Cost Overview/)
  for (const row of ['Material', 'Labor', 'Burden', 'Standard Cost']) assert.match(markup, new RegExp(row))
  for (const column of ['REF', 'CUR', 'Gap']) assert.match(markup, new RegExp('>' + column + '<'))
  assert.doesNotMatch(markup, /Conversion|% Parent|%Parent|Labor \+ Burden|Balanced|Review/,
    'the overview omits Conversion subtotal, reconciliation, parent percentages, and review links')
  const selectedMarkup = renderToStaticMarkup(React.createElement(SnapshotComparisonCard, {
    comparison, selectedComparison: true
  }))
  assert.match(selectedMarkup, /Full Reference \/ Current snapshot/)
  assert.doesNotMatch(selectedMarkup, /Selected Comparison/)
} finally {
  await vite.close()
}

console.log('snapshot comparison view self-check: PASS')
