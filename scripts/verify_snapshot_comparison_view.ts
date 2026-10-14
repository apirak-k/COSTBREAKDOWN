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
  assert.match(markup, /aria-label="Cost comparison"/)
  assert.match(markup, /<th scope="col"[^>]*>Cost<\/th>[\s\S]*>REF<\/th>[\s\S]*>CUR<\/th>[\s\S]*>GAP<\/th>[\s\S]*>%GAP<\/th>/)
  assert.match(markup, />MAT<\/th>[\s\S]*>LB<\/th>[\s\S]*>BD<\/th>[\s\S]*>STD Cost<\/th>/)
  assert.equal([...markup.matchAll(/<tr\b/g)].length, 5, 'Cost has exactly a header, three component rows, and a footer')
  assert.match(markup, /50\.00%[\s\S]*25\.00%[\s\S]*25\.00%[\s\S]*15\.38%/,
    'component %GAP and footer %Total retain their finalized denominators')
  assert.doesNotMatch(markup, /Standard Cost Overview|Selected REF|Selected CUR|% Parent|%Parent|Balanced|Review/,
    'the compact table omits obsolete headings, selected dataset columns, and review UI')
  const selectedMarkup = renderToStaticMarkup(React.createElement(SnapshotComparisonCard, {
    comparison,
    selectedComparison: { ...comparison, elementGaps: { material: 0.5, labor: 0, burden: 0 }, totalGap: 0.5 },
    selectedActive: true
  }))
  assert.match(selectedMarkup, /GAP[\s\S]*\(Selected\)/)
  assert.match(selectedMarkup, /\(\+0\.50\)/)
  assert.match(selectedMarkup, /\(0\.00\)/)
  assert.doesNotMatch(selectedMarkup, /<th[^>]*>Selected<\/th>/, 'Selected remains secondary inside the Gap column')
} finally {
  await vite.close()
}

console.log('snapshot comparison view self-check: PASS')
