import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'

async function main() {
const vite = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
  plugins: [{
    name: 'cbd-summary-test-store',
    enforce: 'pre',
    resolveId(source, importer) {
      if (source === '../../state'
        && importer?.replaceAll('\\', '/').endsWith('/src/features/cost-breakdown/CostBreakdownPage.tsx')) {
        return '\0cbd-summary-test-store'
      }
      return null
    },
    load(id) {
      return id === '\0cbd-summary-test-store'
        ? 'export const useAppStore = () => globalThis.__CBD_SUMMARY_TEST_STATE__'
        : null
    }
  }]
})

const visibleText = (markup: string): string => markup.replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()

function assertClose(actual: number, expected: number, message: string): void {
  assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) < 1e-8, message + ': got ' + actual + ', expected ' + expected)
}

function costSnapshot(id: string, materialPrice: number, laborRate: number, burdenRate: number) {
  return {
    id,
    comparisonRole: id === 'reference' ? 'reference' : 'current',
    status: 'draft',
    sourceRef: id,
    effectiveDate: '',
    product: {
      productCode: 'CBD-SUMMARY-TEST',
      productDescription: 'Summary fixture',
      uom: 'PC',
      customer: '',
      effectiveDate: ''
    },
    bom: [{
      id: 'material-' + id,
      itemCode: 'MAT-001',
      description: 'Synthetic material',
      consumption: 1,
      unit: 'EA',
      price: materialPrice,
      loss: 0,
      confidence: {}
    }],
    routing: [{
      id: 'routing-' + id,
      processName: 'Cutting',
      operationCode: 'CUT',
      sequence: 10,
      workCenterId: 'WC-CUT',
      manning: 1,
      capacity: 10,
      yield: 1,
      confidence: {}
    }],
    rates: [{
      id: 'rate-' + id,
      workCenterCode: 'WC-CUT',
      description: 'WC-CUT · Cutting synthetic work center',
      laborRate,
      burdenRate,
      effectiveDate: '',
      confidence: {}
    }],
    warnings: []
  }
}

function chartGroup(markup: string, element: string): string {
  const match = markup.match(new RegExp('<g\\b[^>]*data-gap-element="' + element + '"[^>]*>[\\s\\S]*?<\\/g>'))
  assert.ok(match, 'expected SVG group for ' + element)
  return match[0]
}

function attrNumber(markup: string, attribute: string): number {
  const match = markup.match(new RegExp('\\b' + attribute + '="([^"]+)"'))
  assert.ok(match, 'expected ' + attribute + ' attribute')
  const value = Number(match[1])
  assert.ok(Number.isFinite(value), 'expected numeric ' + attribute)
  return value
}

function titleText(group: string): string {
  const match = group.match(/<title>([\s\S]*?)<\/title>/)
  assert.ok(match, 'expected an accessible SVG title')
  return match[1].replace(/\r/g, '')
}

function tableRows(markup: string): string[] {
  return [...markup.matchAll(/<tr\b[\s\S]*?<\/tr>/g)].map(match => match[0])
}

function rowHeader(row: string): string | null {
  const match = row.match(/<th scope="row"[^>]*>([\s\S]*?)<\/th>/)
  return match ? visibleText(match[1]) : null
}

function tableCells(row: string): string[] {
  return [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)].map(match => visibleText(match[1]))
}

function rowFor(markup: string, label: string): string {
  const row = tableRows(markup).find(candidate => rowHeader(candidate) === label)
  assert.ok(row, 'expected table row ' + label)
  return row
}

function gapSlot(row: string, kind: 'full' | 'selected') {
  const match = row.match(new RegExp('<span data-gap-slot="' + kind + '"(?: aria-hidden="(true|false)")? class="([^"]*)">([\\s\\S]*?)<\\/span>'))
  assert.ok(match, 'expected ' + kind + ' gap slot')
  return { ariaHidden: match[1] ?? null, className: match[2], text: visibleText(match[3]) }
}

function tableHeaderLabels(markup: string): string[] {
  const header = markup.match(/<thead\b[\s\S]*?<\/thead>/)?.[0]
  assert.ok(header, 'expected table header')
  return [...header.matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/g)].map(match => visibleText(match[1]))
}

try {
  const [page, snapshotView, wcView, comparisonCore, selectedCore, comparisonView, formatters, guards, palette] = await Promise.all([
    vite.ssrLoadModule('/src/features/cost-breakdown/CostBreakdownPage.tsx'),
    vite.ssrLoadModule('/src/features/cost-breakdown/components/SnapshotComparisonCard.tsx'),
    vite.ssrLoadModule('/src/features/cost-breakdown/components/WorkCenterProcessingTable.tsx'),
    vite.ssrLoadModule('/src/core/calculations/snapshot-comparison.ts'),
    vite.ssrLoadModule('/src/core/calculations/selected-comparison.ts'),
    vite.ssrLoadModule('/src/features/cost-breakdown/components/comparison-view.ts'),
    vite.ssrLoadModule('/src/core/utils/formatters.ts'),
    vite.ssrLoadModule('/src/core/utils/guards.ts'),
    vite.ssrLoadModule('/src/features/cost-breakdown/components/cost-element-colors.ts')
  ])

  assert.deepEqual(palette.COST_ELEMENT_COLORS, {
    material: '#4F7CAC', labor: '#D89B45', burden: '#8067B7', standardCost: '#334155'
  }, 'CBD charts, legend, and Standard Cost use one shared element palette')
  const fullSegments = [
    { key: 'material', label: 'Material', full: 9.31, selected: null, color: palette.COST_ELEMENT_COLORS.material },
    { key: 'labor', label: 'Labor', full: 4.42, selected: null, color: palette.COST_ELEMENT_COLORS.labor },
    { key: 'burden', label: 'Burden', full: 2.32, selected: null, color: palette.COST_ELEMENT_COLORS.burden }
  ]
  const fullChart = renderToStaticMarkup(React.createElement(page.GapContributionChart, {
    segments: fullSegments,
    fullTotal: 16.05,
    selectedTotal: null,
    selectedActive: false
  }))
  const fullSvg = fullChart.match(/<svg\b[\s\S]*?<\/svg>/)?.[0]
  assert.ok(fullSvg, 'expected the Full Gap bar SVG')
  assert.doesNotMatch(fullSvg, /<text(?:\s|>)/, 'MAT/LB/BD identifiers must stay outside the bar')
  for (const segment of fullSegments) {
    const group = chartGroup(fullSvg, segment.key)
    assert.equal(titleText(group), segment.label + ' Gap ' + formatters.formatVariance(segment.full, 2))
    assert.equal(titleText(group).split('\n').length, 1, 'Full tooltip must be one line')
    const fullRect = group.match(/<rect\b[^>]*data-full-gap-segment="true"[^>]*>/)
    assert.ok(fullRect, 'expected a Full fill for ' + segment.key)
    const opacity = attrNumber(fullRect[0], 'fill-opacity')
    assert.ok(opacity > 0.42 && opacity > 0.32, 'Full fill should be stronger than the previous faint treatment')
  }

  const selectedSegments = [
    { key: 'material', label: 'Material', full: 9.31, selected: 4.20, color: palette.COST_ELEMENT_COLORS.material },
    { key: 'labor', label: 'Labor', full: 4.42, selected: -1.20, color: palette.COST_ELEMENT_COLORS.labor },
    { key: 'burden', label: 'Burden', full: 2.32, selected: 0, color: palette.COST_ELEMENT_COLORS.burden }
  ]
  const selectedChart = renderToStaticMarkup(React.createElement(page.GapContributionChart, {
    segments: selectedSegments,
    fullTotal: 16.05,
    selectedTotal: 3,
    selectedActive: true
  }))
  const selectedSvg = selectedChart.match(/<svg\b[\s\S]*?<\/svg>/)?.[0]
  assert.ok(selectedSvg, 'expected the Selected Gap bar SVG')
  assert.doesNotMatch(selectedSvg, /<text(?:\s|>)/, 'Selected mode must not add labels inside the bar')

  const materialGroup = chartGroup(selectedSvg, 'material')
  const materialFullWidth = attrNumber(materialGroup, 'data-segment-width')
  const materialSelectedWidth = attrNumber(materialGroup, 'data-selected-width')
  assert.equal(materialGroup.match(/data-selected-state="([^"]+)"/)?.[1], 'highlight')
  assert.ok(materialSelectedWidth > 0 && materialSelectedWidth < materialFullWidth, 'positive Selected overlay must occupy a bounded portion of its owning MAT segment')
  assertClose(
    materialSelectedWidth,
    Math.min(materialFullWidth, Math.max(1, materialFullWidth * Math.min(1, 4.2 / 9.31))),
    'MAT overlay width must follow the bounded Selected-to-Full ratio'
  )
  const materialOverlay = materialGroup.match(/<rect\b[^>]*data-selected-overlay="highlight"[^>]*>/)
  assert.ok(materialOverlay, 'positive MAT Selected contribution must have a highlight overlay')
  assert.equal(attrNumber(materialOverlay[0], 'fill-opacity'), 0.98)
  assert.equal(titleText(materialGroup), 'Material Gap +9.31\nSelected +4.20')
  assert.equal(titleText(materialGroup).split('\n').length, 2, 'Selected tooltip must be two lines')

  const laborGroup = chartGroup(selectedSvg, 'labor')
  assert.equal(laborGroup.match(/data-selected-state="([^"]+)"/)?.[1], 'remove')
  const laborOverlay = laborGroup.match(/<rect\b[^>]*data-selected-overlay="remove"[^>]*>/)
  assert.ok(laborOverlay, 'negative Labor Selected contribution must have a remove overlay')
  assert.equal(titleText(laborGroup), 'Labor Gap +4.42\nSelected -1.20')
  const laborFullRect = laborGroup.match(/<rect\b[^>]*data-full-gap-segment="true"[^>]*>/)
  assert.ok(laborFullRect, 'expected the Full Labor segment rectangle')
  const laborX = attrNumber(laborFullRect[0], 'x')
  const laborWidth = attrNumber(laborGroup, 'data-segment-width')
  const removeX = attrNumber(laborOverlay[0], 'x')
  const removeWidth = attrNumber(laborOverlay[0], 'width')
  assert.ok(removeX >= laborX - 1e-8 && removeX + removeWidth <= laborX + laborWidth + 1e-8, 'remove treatment must stay inside its owning Labor segment')
  assert.ok(Math.abs(removeX - laborX) < 1e-8, 'negative Selected value over positive Full Labor gap must remain anchored to the Labor segment start')
  assert.doesNotMatch(materialGroup, /data-selected-overlay="remove"/, 'Labor removal must not appear in MAT')
  assert.doesNotMatch(chartGroup(selectedSvg, 'burden'), /data-selected-overlay="remove"/, 'Labor removal must not appear in BD')

  const burdenGroup = chartGroup(selectedSvg, 'burden')
  assert.equal(burdenGroup.match(/data-selected-state="([^"]+)"/)?.[1], 'normal', 'zero Selected net must remain Normal')
  assert.equal(attrNumber(burdenGroup, 'data-selected-width'), 0)
  assert.doesNotMatch(burdenGroup, /data-selected-overlay=/, 'zero Selected net must not draw an overlay')
  assert.equal(titleText(burdenGroup), 'Burden Gap +2.32\nSelected 0.00')
  assert.equal(titleText(burdenGroup).split('\n').length, 2, 'active zero Selected tooltip must retain the two-line Selected form')
  assert.match(selectedChart, /aria-label="[^"]*Full Material Gap \+9\.31[^"]*Selected Material Gap \+4\.20[^"]*Selected Labor Gap -1\.20[^"]*Selected Burden Gap 0\.00/)

  const reference = costSnapshot('reference', 50.52, 44.2, 23.2)
  const current = costSnapshot('current', 59.83, 88.4, 46.4)
  const fullComparison = comparisonCore.compareSnapshots(reference, current)
  assert.equal(fullComparison.referenceCost.material, 50.52)
  assert.equal(fullComparison.currentCost.material, 59.83)
  assertClose(fullComparison.elementGaps.material, 9.31, 'Material gap must remain CUR minus REF')
  assertClose(fullComparison.elementGaps.labor, 4.42, 'Labor gap must remain CUR minus REF')
  assertClose(fullComparison.elementGaps.burden, 2.32, 'Burden gap must remain CUR minus REF')
  assertClose(fullComparison.totalGap, 16.05, 'Standard Cost gap must reconcile to MAT + LB + BD')
  assert.equal(fullComparison.reconciliation?.reconciled, true, 'fixture comparison must reconcile through the real calculation')

  const bomFinding = fullComparison.bomFindings[0]
  assert.ok(bomFinding, 'expected one selectable BOM finding')
  const selection = {
    bomFindingKeys: [selectedCore.getComparisonFindingKey('bom', bomFinding)],
    routingFindingKeys: []
  }
  const selectedPair = selectedCore.createSelectedSnapshotPair({ reference, current }, fullComparison, selection)
  const selectedRawComparison = comparisonCore.compareSnapshots(selectedPair.reference, selectedPair.current)
  const selectedContribution = comparisonView.getSelectedComparisonContribution(fullComparison, selectedRawComparison, selection)
  assertClose(selectedContribution.elementGaps.material, 9.31, 'selected MAT contribution must come from its finding calculation')
  assert.equal(selectedContribution.elementGaps.labor, 0, 'empty selected Routing branch is a real zero')
  assert.equal(selectedContribution.elementGaps.burden, 0, 'empty selected Routing branch is a real zero')
  assertClose(
    selectedContribution.totalGap,
    selectedContribution.elementGaps.material + selectedContribution.elementGaps.labor + selectedContribution.elementGaps.burden,
    'Selected Standard Cost Gap must reconcile to selected MAT + LB + BD'
  )
  const selectedDisplayComparison = {
    ...selectedRawComparison,
    elementGaps: selectedContribution.elementGaps,
    totalGap: selectedContribution.totalGap
  }

  const costFullMarkup = renderToStaticMarkup(React.createElement(snapshotView.SnapshotComparisonCard, {
    comparison: fullComparison
  }))
  const costSelectedMarkup = renderToStaticMarkup(React.createElement(snapshotView.SnapshotComparisonCard, {
    comparison: fullComparison,
    selectedComparison: selectedDisplayComparison,
    selectedActive: true
  }))
  const costFullTable = costFullMarkup.match(/<table\b[\s\S]*?<\/table>/)?.[0]
  const costSelectedTable = costSelectedMarkup.match(/<table\b[\s\S]*?<\/table>/)?.[0]
  assert.ok(costFullTable && costSelectedTable, 'expected Cost comparison tables in Full and Selected mode')
  const costFullHeaders = tableHeaderLabels(costFullTable)
  const costSelectedHeaders = tableHeaderLabels(costSelectedTable)
  assert.deepEqual(costFullHeaders, ['Cost Element', 'REF', 'CUR', 'GAP Selected', '%GAP'])
  assert.deepEqual(costSelectedHeaders, ['Cost Element', 'REF', 'CUR', 'GAP Selected', '%GAP'])
  assert.match(costFullMarkup, /<section aria-label="Cost Element"[\s\S]*?<caption class="sr-only">Cost Element/,
    'the summary table uses the Cost Element name for its accessible section and caption')
  for (const label of ['REF', 'CUR', '%GAP']) {
    assert.match(costFullTable, new RegExp(`<th scope="col" class="px-2 py-1\\.5 text-right">${label}</th>`),
      `Cost ${label} header must share the right edge used by its numeric values`)
  }
  assert.match(costFullTable, /<span data-gap-header-slot="full" class="text-right text-\[11px\]">GAP<\/span>/,
    'Cost GAP header must align to the Full Gap value slot')
  assert.equal(costSelectedHeaders.length, 5, 'Selected must not become a standalone Cost column')
  assert.equal(tableRows(costFullTable).length, 5, 'Cost must have one header, three element rows, and one footer row')
  assert.equal(tableRows(costSelectedTable).length, 5, 'Selected mode must preserve the same five-row Cost structure')
  assert.deepEqual(tableRows(costSelectedTable).map(rowHeader).filter(Boolean), ['Material', 'Labor', 'Burden', 'Standard Cost'])
  assert.doesNotMatch(costSelectedTable, /Cost element color legend/i, 'Cost must not repeat the Subheader legend')
  const costFullGapHeader = costFullTable.match(/<span data-gap-header-slot="full"[^>]*>/)?.[0]
  const costSelectedGapHeader = costSelectedTable.match(/<span data-gap-header-slot="full"[^>]*>/)?.[0]
  assert.ok(costFullGapHeader && costSelectedGapHeader)
  assert.equal(costFullGapHeader, costSelectedGapHeader, 'GAP header remains aligned to the fixed Full Gap slot')
  const selectedHeaderSlot = costSelectedTable.match(/<span data-gap-header-slot="selected" class="([^"]*)">Selected<\/span>/)?.[1]
  const fullSelectedHeaderSlot = costFullTable.match(/<span data-gap-header-slot="selected" class="([^"]*)">Selected<\/span>/)?.[1]
  assert.ok(selectedHeaderSlot && fullSelectedHeaderSlot, 'Selected header remains present in both modes')
  assert.equal(selectedHeaderSlot, fullSelectedHeaderSlot, 'Selected header width and alignment remain fixed when selection toggles')
  assert.match(selectedHeaderSlot, /w-\[9ch\].*text-right.*font-normal.*text-slate-300/,
    'Selected header uses a fixed-width, right-aligned, secondary neutral style')
  assert.doesNotMatch(selectedHeaderSlot, /text-(rose|red|green|emerald)-|font-(bold|semibold)/,
    'Selected header does not use sign colors or bold emphasis')
  assert.equal((costFullTable.match(/grid-cols-\[minmax\(0,1fr\)_9ch\]/g) ?? []).length, 5, 'Cost header and all four GAP cells share fixed Full/Selected slots')
  assert.equal((costSelectedTable.match(/grid-cols-\[minmax\(0,1fr\)_9ch\]/g) ?? []).length, 5, 'Selected mode preserves the shared GAP slot grid')
  assert.match(costFullTable, /data-gap-header-slot="selected"[^>]*>Selected<\/span>/)
  assert.match(costSelectedTable, /data-gap-header-slot="selected"[^>]*>Selected<\/span>/)
  assert.match(costFullTable, /data-gap-header-slot="selected"[^>]*>Selected<\/span>/,
    'Selected header uses the plain label without parentheses')
  assert.doesNotMatch(costSelectedTable, /\(Selected\)|Selected \([+-]?\d/,
    'Selected values are never parenthesized')

  for (const label of ['Material', 'Labor', 'Burden', 'Standard Cost']) {
    const fullRow = rowFor(costFullTable, label)
    const selectedRow = rowFor(costSelectedTable, label)
    const fullSlot = gapSlot(fullRow, 'selected')
    const selectedSlot = gapSlot(selectedRow, 'selected')
    assert.equal(fullSlot.ariaHidden, 'true', 'Full mode Selected slot must be visually hidden for ' + label)
    assert.equal(fullSlot.text, '0.00', 'stable Full-mode Selected slot reserves the plain zero display')
    assert.equal(selectedSlot.ariaHidden, 'false', 'Selected mode slot must be exposed for ' + label)
    assert.equal(
      selectedSlot.className.split(/\s+/).filter(Boolean).filter(token => token !== 'invisible').sort().join(' '),
      fullSlot.className.split(/\s+/).filter(Boolean).filter(token => token !== 'invisible').sort().join(' '),
      'Selected slot layout classes must remain stable for ' + label
    )
    assert.match(selectedSlot.className, /w-\[9ch\].*text-right.*text-\[10px\].*font-normal.*text-slate-500.*tabular-nums/,
      'Selected uses a stable, right-aligned, secondary neutral slot for ' + label)
    assert.doesNotMatch(selectedSlot.className, /text-(rose|red|green|emerald)-|font-(bold|semibold)/,
      'Selected stays neutral and subordinate for ' + label)
  }

  const expectedCostRows = [
    ['Material', fullComparison.elementGaps.material, selectedContribution.elementGaps.material],
    ['Labor', fullComparison.elementGaps.labor, selectedContribution.elementGaps.labor],
    ['Burden', fullComparison.elementGaps.burden, selectedContribution.elementGaps.burden]
  ] as const
  for (const [label, fullGap, selectedGap] of expectedCostRows) {
    const fullRow = rowFor(costFullTable, label)
    const selectedRow = rowFor(costSelectedTable, label)
    const fullValues = tableCells(fullRow)
    assert.equal(fullValues[3], fullGap === null ? '—' : formatters.formatPercent(guards.safeDivide(fullGap, fullComparison.totalGap)!, 2), label + ' %GAP must be its share of Standard Cost Gap')
    assert.equal(gapSlot(selectedRow, 'full').text, formatters.formatVariance(fullGap!, 2), label + ' Full Gap remains primary')
    assert.equal(gapSlot(selectedRow, 'selected').text, formatters.formatVariance(selectedGap!, 2), label + ' Selected value is plain numeric text in its stable secondary slot')
  }

  const fullTotalRow = rowFor(costFullTable, 'Standard Cost')
  const selectedTotalRow = rowFor(costSelectedTable, 'Standard Cost')
  const fullTotalValues = tableCells(fullTotalRow)
  assert.equal(fullTotalValues[3], formatters.formatPercent(guards.safeDivide(fullComparison.totalGap!, fullComparison.referenceCost.total!)!, 2) + ' Total', 'STD Cost %Total must be Gap divided by REF Standard Cost')
  const expectedSelectedTotal = selectedContribution.elementGaps.material! + selectedContribution.elementGaps.labor! + selectedContribution.elementGaps.burden!
  assert.equal(gapSlot(selectedTotalRow, 'selected').text, formatters.formatVariance(expectedSelectedTotal, 2), 'STD Cost Selected Gap must equal Selected MAT + LB + BD')
  assert.match(selectedTotalRow, />Total<\/span>/, 'Cost footer percentage must visibly identify Total')

  const wcMarkup = renderToStaticMarkup(React.createElement(wcView.WorkCenterProcessingTable, {
    comparison: fullComparison,
    selectedComparison: selectedDisplayComparison,
    selectedActive: true
  } as never))
  assert.doesNotMatch(wcMarkup, /Selected/i, 'Work Center output must not expose Selected text in visible text, titles, or aria attributes')
  const wcTables = [...wcMarkup.matchAll(/<table\b[\s\S]*?<\/table>/g)].map(match => match[0])
  assert.equal(wcTables.length, 1, 'Work Center header, scroll body, and footer share one table grid')
  assert.deepEqual(tableHeaderLabels(wcTables[0]), ['Work Center', 'REF', 'CUR', 'GAP', '%GAP'])
  for (const label of ['REF', 'CUR', 'GAP', '%GAP']) {
    assert.match(wcTables[0], new RegExp(`<th scope="col" class="px-2 py-1\\.5 text-right">${label}</th>`),
      `Work Center ${label} header must share the right edge used by its numeric values`)
  }
  assert.doesNotMatch(wcTables[0], /GAP \(Selected\)/)
  const wcRow = rowFor(wcTables[0], 'WC-CUT')
  assert.deepEqual(tableCells(wcRow), [
    formatters.formatNumber(fullComparison.processingFindings[0].costEffect.reference.total!, 2),
    formatters.formatNumber(fullComparison.processingFindings[0].costEffect.current.total!, 2),
    formatters.formatVariance(fullComparison.processingFindings[0].costEffect.gap.total!, 2),
    formatters.formatPercent(guards.safeDivide(
      fullComparison.processingFindings[0].costEffect.gap.total!,
      guards.safeAdd(fullComparison.elementGaps.labor!, fullComparison.elementGaps.burden!)!
    )!, 2)
  ], 'WC row must use the existing Conversion Cost values and % of total WC Gap')
  assert.doesNotMatch(wcMarkup, /Cutting synthetic work center/, 'WC table must not repeat the verbose synthetic description')

  const wcSection = wcMarkup.match(/<section\b[^>]*aria-label="Work Center"[^>]*>/)?.[0]
  const costSection = costFullMarkup.match(/<section\b[^>]*aria-label="Cost Element"[^>]*>/)?.[0]
  assert.ok(wcSection && costSection, 'expected Cost and Work Center sections')
  assert.match(costSection, /lg:h-full/, 'Cost Element fills the bounded overview height')
  assert.match(wcSection, /lg:flex lg:h-full lg:min-h-0 lg:flex-col/,
    'Work Center shares the bounded Cost Element height and owns an internal flex column')
  assert.match(wcMarkup, /data-wc-scroll-body="true"[^>]*class="[^"]*overflow-x-auto[^"]*lg:min-h-0[^"]*lg:flex-1[^"]*lg:overflow-y-auto/,
    'Work Center rows own bounded internal vertical scrolling on desktop')
  assert.match(wcMarkup, /<thead class="sticky top-0 z-10">[\s\S]*?Work Center[\s\S]*?REF[\s\S]*?CUR[\s\S]*?GAP[\s\S]*?%GAP/,
    'WC header stays sticky on the shared table grid')
  assert.match(wcMarkup, /<tfoot class="sticky bottom-0 z-10[\s\S]*?<th scope="row"[^>]*>Total/,
    'WC Total stays sticky on the shared table grid')
  const wcFooterRow = rowFor(wcTables[0], 'Total')
  const wcFooterValues = tableCells(wcFooterRow)
  const totalWcReference = guards.safeAdd(fullComparison.referenceCost.labor!, fullComparison.referenceCost.burden!)!
  const totalWcCurrent = guards.safeAdd(fullComparison.currentCost.labor!, fullComparison.currentCost.burden!)!
  const totalWcGap = guards.safeAdd(fullComparison.elementGaps.labor!, fullComparison.elementGaps.burden!)!
  assertClose(totalWcGap, fullComparison.totalGap! - fullComparison.elementGaps.material!, 'Total WC Gap must reconcile to Labor + Burden')
  assertClose(totalWcCurrent - totalWcReference, totalWcGap, 'Total WC CUR minus REF must equal Labor Gap + Burden Gap')
  assert.equal(wcFooterValues[0], formatters.formatNumber(totalWcReference, 2))
  assert.equal(wcFooterValues[1], formatters.formatNumber(totalWcCurrent, 2))
  assert.equal(wcFooterValues[2], formatters.formatVariance(totalWcGap, 2))
  assert.equal(wcFooterValues[3], formatters.formatPercent(guards.safeDivide(totalWcGap, totalWcReference)!, 2) + ' Total')
  assert.match(wcFooterRow, />Total<\/span>/, 'WC footer percentage must visibly identify Total')

  const pageSource = readFileSync(new URL('../src/features/cost-breakdown/CostBreakdownPage.tsx', import.meta.url), 'utf8')
  const candidateTableSource = readFileSync(new URL('../src/features/cost-breakdown/components/CandidateFindingsTable.tsx', import.meta.url), 'utf8')
  const pageRootClass = pageSource.match(/return \(\s*<div className="([^"]+)"/s)?.[1]
  const overviewClass = pageSource.match(/<div id="cost-breakdown-overview-panels" className=\{isOverviewExpanded \? '([^']+)'/)?.[1]
  const candidateRegionClass = pageSource.match(/<div role="region" aria-label="Candidate workspace" tabIndex=\{0\} className="([^"]+)"/)?.[1]
  assert.ok(pageRootClass && overviewClass && candidateRegionClass,
    'expected CBD workspace, bounded overview, and Candidate scroll ownership classes')
  assert.match(pageRootClass, /lg:h-full[\s\S]*lg:min-h-0[\s\S]*lg:overflow-hidden/,
    'CBD workspace is constrained to the available desktop shell height and clips its overflow')
  assert.doesNotMatch(pageRootClass, /lg:overflow-y-auto|lg:overflow-auto/,
    'CBD root does not become a competing page-level vertical scroll owner')
  assert.match(overviewClass, /lg:h-44[\s\S]*lg:shrink-0[\s\S]*lg:grid-cols-2/,
    'Cost Element and Work Center use one bounded, side-by-side desktop overview height')
  assert.match(candidateRegionClass, /lg:min-h-0[\s\S]*lg:flex-1[\s\S]*lg:overflow-y-auto/,
    'Candidate workspace receives and internally scrolls the remaining desktop height')
  assert.doesNotMatch(candidateRegionClass, /overflow-x-auto/, 'Candidate region owns vertical scroll without forcing horizontal scrolling')
  assert.match(pageRootClass, /overflow-x-clip/, 'CBD clips narrow responsive overflow at its page workspace')
  assert.match(candidateTableSource, /<div className="overflow-x-auto border border-slate-200">[\s\S]*<table className=\{`w-full \$\{isBOM \? 'min-w-\[1040px\]' : 'min-w-\[1260px\]'\} table-fixed/,
    'narrow Candidate tables keep their own local horizontal fallback and enough width to avoid column collisions')

  console.log('PASS: CBD summary UX verifier (Gap Bar, Cost, Work Center)')
  console.log('PASS: proportional Selected overlay, per-element Normal/Highlight/Remove, accessible titles')
  console.log('PASS: Cost row/slot structure and MAT/LB/BD plus STD Cost formulas')
  console.log('PASS: Cost Element uses stable neutral Selected slots without parentheses')
  console.log('PASS: Work Center is bounded with internal row scrolling and sticky header/footer')
  console.log('PASS: CBD Candidate owns desktop vertical scrolling; summary calculations reconcile')
} finally {
  await vite.close()
}
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
