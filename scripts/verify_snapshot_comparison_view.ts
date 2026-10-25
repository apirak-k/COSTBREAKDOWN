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
  const { SelectedValueProvider } = await vite.ssrLoadModule('/src/shared/ui/selected-value.tsx')
  const renderCard = (props: React.ComponentProps<typeof SnapshotComparisonCard>) => renderToStaticMarkup(
    React.createElement(SelectedValueProvider, { scopeKey: 'snapshot-comparison-verification' },
      React.createElement(SnapshotComparisonCard, props))
  )
  const textContent = (html: string) => html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
  const markup = renderCard({ comparison, gapDirection: 'Current − Reference' })
  assert.doesNotMatch(markup, /Data quality:/, 'the page-level Data quality summary is absent')
  assert.doesNotMatch(markup, /Review warnings|Missing rate remains reviewable/, 'comparison warnings are not displayed in the summary')
  assert.doesNotMatch(markup, /Standard Cost reconciliation/, 'Standard Cost reconciliation UI is absent')
  assert.match(markup, /aria-label="Cost Element"/)
  const headers = [...markup.matchAll(/<th scope="col"[^>]*>([\s\S]*?)<\/th>/g)].map(match => textContent(match[1]))
  assert.deepEqual(headers, ['Cost Element', 'Before', 'After', 'GAPSelected', '%GAP'], 'the five headers preserve Before/After and secondary Selected inside GAP')
  assert.match(markup, />Material<\/th>[\s\S]*>Labor<\/th>[\s\S]*>Burden<\/th>[\s\S]*>Standard Cost<\/th>/)
  assert.equal([...markup.matchAll(/<tr\b/g)].length, 5, 'Cost has exactly a header, three component rows, and a footer')
  assert.match(textContent(markup), /50\.00%[\s\S]*25\.00%[\s\S]*25\.00%[\s\S]*15\.38%/,
    'component %GAP and footer %Total retain their finalized denominators')
  assert.doesNotMatch(markup, /Standard Cost Overview|Selected REF|Selected CUR|% Parent|%Parent|Balanced|Review/,
    'the compact table omits obsolete headings, selected dataset columns, and review UI')
  const selectedMarkup = renderCard({
    comparison,
    gapDirection: 'Current − Reference',
    selectedComparison: { ...comparison, elementGaps: { material: 0.5, labor: 0, burden: 0 }, totalGap: 0.5 },
    selectedActive: true
  })
  assert.match(selectedMarkup, /data-gap-header-slot="selected"[^>]*>Selected<\/span>/)
  const selectedValues = [...selectedMarkup.matchAll(/<button\b[^>]*data-gap-slot="selected"[^>]*>([\s\S]*?)<\/button>/g)]
    .map(match => textContent(match[1]))
  assert.deepEqual(selectedValues, ['+0.50', '0.00', '0.00', '+0.50'], 'Selected Material/Labor/Burden and Total retain their values inside selectable numeric slots')
  assert.doesNotMatch(selectedMarkup, /\(Selected\)|>\(\+0\.50\)<|>\(0\.00\)</)
  assert.doesNotMatch(selectedMarkup, /<th[^>]*>Selected<\/th>/, 'Selected remains secondary inside the Gap column')
} finally {
  await vite.close()
}

console.log('snapshot comparison view self-check: PASS')
