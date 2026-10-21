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

function extractElement(markup: string, start: number, tag: string): string {
  const tokens = new RegExp(`<${tag}\\b[^>]*>|<\\/${tag}>`, 'g')
  tokens.lastIndex = start
  let depth = 0
  let match: RegExpExecArray | null
  while ((match = tokens.exec(markup))) {
    if (match[0].startsWith(`</${tag}`)) depth -= 1
    else depth += 1
    if (depth === 0) return markup.slice(start, tokens.lastIndex)
  }
  assert.fail('expected a complete ' + tag + ' element')
}

function roleRows(markup: string): string[] {
  const rows: string[] = []
  const starts = /<div role="row"(?:\s|>)/g
  let match: RegExpExecArray | null
  while ((match = starts.exec(markup))) {
    const row = extractElement(markup, match.index, 'div')
    rows.push(row)
    starts.lastIndex = match.index + row.length
  }
  return rows
}

function roleRowHeader(row: string): string | null {
  const match = row.match(/<div role="rowheader"[^>]*>([\s\S]*?)<\/div>/)
  return match ? visibleText(match[1]) : null
}

function roleRowCells(row: string): string[] {
  const cells: string[] = []
  const starts = /<div role="cell"/g
  let match: RegExpExecArray | null
  while ((match = starts.exec(row))) {
    const cell = extractElement(row, match.index, 'div')
    cells.push(visibleText(cell.replace(/^<div[^>]*>|<\/div>$/g, '')))
    starts.lastIndex = match.index + cell.length
  }
  return cells
}

function roleRowHeaders(row: string): string[] {
  const cells: string[] = []
  const starts = /<div role="columnheader"/g
  let match: RegExpExecArray | null
  while ((match = starts.exec(row))) {
    const cell = extractElement(row, match.index, 'div')
    cells.push(visibleText(cell.replace(/^<div[^>]*>|<\/div>$/g, '')))
    starts.lastIndex = match.index + cell.length
  }
  return cells
}

function rowFor(markup: string, label: string): string {
  const row = tableRows(markup).find(candidate => rowHeader(candidate) === label)
  assert.ok(row, 'expected table row ' + label)
  return row
}

function gapSlot(row: string, kind: 'full' | 'selected') {
  const match = row.match(new RegExp('<(span|button)\\b(?=[^>]*\\bdata-gap-slot="' + kind + '")([^>]*)>([\\s\\S]*?)<\\/\\1>'))
  assert.ok(match, 'expected ' + kind + ' gap slot')
  const attributes = match[2]
  return {
    tag: match[1],
    ariaHidden: attributes.match(/\baria-hidden="(true|false)"/)?.[1] ?? null,
    ariaLabel: attributes.match(/\baria-label="([^"]+)"/)?.[1] ?? null,
    className: attributes.match(/\bclass="([^"]*)"/)?.[1] ?? '',
    text: visibleText(match[3])
  }
}

function tableHeaderLabels(markup: string): string[] {
  const header = markup.match(/<thead\b[\s\S]*?<\/thead>/)?.[0]
  assert.ok(header, 'expected table header')
  return [...header.matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/g)].map(match => visibleText(match[1]))
}

function importedSummaryStyleNames(source: string): Set<string> {
  const imported = source.match(/import\s*\{([^}]*)\}\s*from\s*['"]\.\/summary-table-styles['"]/)
  assert.ok(imported, 'each summary must import its visual contract from summary-table-styles')
  return new Set(imported[1].split(',').map(binding => binding.trim().split(/\s+as\s+/)[0]).filter(Boolean))
}

function emittedClassNames(markup: string): Set<string> {
  return new Set([...markup.matchAll(/\bclass="([^"]*)"/g)].flatMap(([, value]) => value.split(/\s+/).filter(Boolean)))
}

function assertSharedSummaryStyleContract(
  styles: Record<string, unknown>,
  costSource: string,
  wcSource: string,
  costMarkup: string,
  wcMarkup: string
): void {
  const styleNames = Object.keys(styles).filter(name => /(?:HEADER|BODY|FOOTER)/.test(name) && /CLASS$/.test(name))
  for (const section of ['HEADER', 'BODY', 'FOOTER']) {
    assert.ok(styleNames.some(name => name.includes(section)), `shared summary contract exports ${section.toLowerCase()} styles`)
  }

  const costImports = importedSummaryStyleNames(costSource)
  const wcImports = importedSummaryStyleNames(wcSource)
  const costCode = costSource.replace(/import\s*\{[^}]*\}\s*from\s*['"]\.\/summary-table-styles['"];?/, '')
  const wcCode = wcSource.replace(/import\s*\{[^}]*\}\s*from\s*['"]\.\/summary-table-styles['"];?/, '')
  const costClasses = emittedClassNames(costMarkup)
  const wcClasses = emittedClassNames(wcMarkup)

  for (const name of styleNames) {
    assert.ok(costImports.has(name) && wcImports.has(name), `${name} is imported by both summary consumers`)
    assert.match(costCode, new RegExp(`\\b${name}\\b`), `${name} is used by Cost Element`)
    assert.match(wcCode, new RegExp(`\\b${name}\\b`), `${name} is used by Work Center`)
    for (const token of String(styles[name]).split(/\s+/).filter(Boolean)) {
      assert.ok(costClasses.has(token), `Cost Element emits shared ${name} class ${token}`)
      assert.ok(wcClasses.has(token), `Work Center emits shared ${name} class ${token}`)
    }
  }
}

try {
  const [page, snapshotView, wcView, comparisonCore, selectedCore, comparisonView, formatters, guards, palette, summaryStyles, selectedValueCore] = await Promise.all([
    vite.ssrLoadModule('/src/features/cost-breakdown/CostBreakdownPage.tsx'),
    vite.ssrLoadModule('/src/features/cost-breakdown/components/SnapshotComparisonCard.tsx'),
    vite.ssrLoadModule('/src/features/cost-breakdown/components/WorkCenterProcessingTable.tsx'),
    vite.ssrLoadModule('/src/core/calculations/snapshot-comparison.ts'),
    vite.ssrLoadModule('/src/core/calculations/selected-comparison.ts'),
    vite.ssrLoadModule('/src/features/cost-breakdown/components/comparison-view.ts'),
    vite.ssrLoadModule('/src/core/utils/formatters.ts'),
    vite.ssrLoadModule('/src/core/utils/guards.ts'),
    vite.ssrLoadModule('/src/features/cost-breakdown/components/cost-element-colors.ts'),
    vite.ssrLoadModule('/src/features/cost-breakdown/components/summary-table-styles.ts'),
    vite.ssrLoadModule('/src/shared/ui/selected-value.tsx')
  ])

  const renderWithSelectedValueProvider = (element: React.ReactNode): string => renderToStaticMarkup(
    React.createElement(selectedValueCore.SelectedValueProvider, { scopeKey: 'cbd-summary-verifier' }, element)
  )

  assert.deepEqual(palette.COST_ELEMENT_COLORS, {
    material: '#6f99c6', labor: '#e5b46a', burden: '#9a82c6', standardCost: '#334155'
  }, 'CBD charts, legend, and Standard Cost use one shared element palette')
  const fullSegments = [
    { key: 'material', label: 'Material', full: 9.31, selected: null, color: palette.COST_ELEMENT_COLORS.material },
    { key: 'labor', label: 'Labor', full: 4.42, selected: null, color: palette.COST_ELEMENT_COLORS.labor },
    { key: 'burden', label: 'Burden', full: 2.32, selected: null, color: palette.COST_ELEMENT_COLORS.burden }
  ]
  const fullChart = renderWithSelectedValueProvider(React.createElement(page.GapContributionChart, {
    segments: fullSegments,
    fullTotal: 16.05,
    selectedTotal: null,
    selectedActive: false,
    directionLabel: 'Current − Reference'
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
  const selectedChart = renderWithSelectedValueProvider(React.createElement(page.GapContributionChart, {
    segments: selectedSegments,
    fullTotal: 16.05,
    selectedTotal: 3,
    selectedActive: true,
    directionLabel: 'Current − Reference'
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
  assertClose(fullComparison.elementGaps.material, 9.31, 'Material gap must remain After minus Before')
  assertClose(fullComparison.elementGaps.labor, 4.42, 'Labor gap must remain After minus Before')
  assertClose(fullComparison.elementGaps.burden, 2.32, 'Burden gap must remain After minus Before')
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

  const costFullMarkup = renderWithSelectedValueProvider(React.createElement(snapshotView.SnapshotComparisonCard, {
    comparison: fullComparison,
    gapDirection: 'Current − Reference'
  }))
  const costSelectedMarkup = renderWithSelectedValueProvider(React.createElement(snapshotView.SnapshotComparisonCard, {
    comparison: fullComparison,
    selectedComparison: selectedDisplayComparison,
    selectedActive: true,
    gapDirection: 'Current − Reference'
  }))
  const costFullTable = costFullMarkup.match(/<table\b[\s\S]*?<\/table>/)?.[0]
  const costSelectedTable = costSelectedMarkup.match(/<table\b[\s\S]*?<\/table>/)?.[0]
  assert.ok(costFullTable && costSelectedTable, 'expected Cost comparison tables in Full and Selected mode')
  const costFullHeaders = tableHeaderLabels(costFullTable)
  const costSelectedHeaders = tableHeaderLabels(costSelectedTable)
  assert.deepEqual(costFullHeaders, ['Cost Element', 'Before', 'After', 'GAP Selected', '%GAP'])
  assert.deepEqual(costSelectedHeaders, ['Cost Element', 'Before', 'After', 'GAP Selected', '%GAP'])
  assert.match(costFullMarkup, /<section aria-label="Cost Element"[\s\S]*?<caption class="sr-only">Cost Element/,
    'the summary table uses the Cost Element name for its accessible section and caption')
  assert.deepEqual(costFullHeaders, ['Cost Element', 'Before', 'After', 'GAP Selected', '%GAP'],
    'Cost keeps the finalized column order and Selected remains within GAP')
  assert.match(costFullTable, /<span data-gap-header-slot="full"[^>]*>GAP<\/span>/,
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
  const selectedHeaderSlot = costSelectedTable.match(/<span data-gap-header-slot="selected" aria-hidden="false" class="([^"]*)">Selected<\/span>/)?.[1]
  const fullSelectedHeader = costFullTable.match(/<span data-gap-header-slot="selected" aria-hidden="true" class="([^"]*)">Selected<\/span>/)
  const activeSelectedHeader = costSelectedTable.match(/<span data-gap-header-slot="selected" aria-hidden="false" class="([^"]*)">Selected<\/span>/)
  assert.ok(selectedHeaderSlot && fullSelectedHeader && activeSelectedHeader, 'Selected header keeps a stable sub-slot in both modes')
  const fullSelectedHeaderSlot = fullSelectedHeader[1]
  assert.equal(
    selectedHeaderSlot.split(/\s+/).filter(token => token !== 'invisible').join(' '),
    activeSelectedHeader[1].split(/\s+/).filter(token => token !== 'invisible').join(' '),
    'Selected header width and alignment remain fixed when selection toggles'
  )
  assert.match(fullSelectedHeaderSlot, /invisible/, 'inactive Selected header is not visibly rendered')
  assert.doesNotMatch(activeSelectedHeader[1], /invisible/, 'active Selected header is visible')
  assert.match(selectedHeaderSlot, /w-\[9ch\].*text-right.*font-normal.*text-slate-300/,
    'Selected header uses a fixed-width, right-aligned, secondary neutral style')
  assert.match(selectedHeaderSlot, /relative left-4/,
    'Only the Selected header shifts right to align its text start with the existing Selected values')
  assert.doesNotMatch(selectedHeaderSlot, /text-(rose|red|green|emerald)-|font-(bold|semibold)/,
    'Selected header does not use sign colors or bold emphasis')
  assert.equal((costFullTable.match(/grid-cols-\[minmax\(0,1fr\)_9ch\]/g) ?? []).length, 5, 'Cost header and all four GAP cells share fixed Full/Selected slots')
  assert.equal((costSelectedTable.match(/grid-cols-\[minmax\(0,1fr\)_9ch\]/g) ?? []).length, 5, 'Selected mode preserves the shared GAP slot grid')
  assert.match(costFullTable, /data-gap-header-slot="selected" aria-hidden="true"[^>]*>Selected<\/span>/,
    'inactive Selected header reserves its slot while staying visually and accessibly hidden')
  assert.match(costSelectedTable, /data-gap-header-slot="selected" aria-hidden="false"[^>]*>Selected<\/span>/,
    'active Selected header uses the plain label without parentheses')
  assert.doesNotMatch(costSelectedTable, /\(Selected\)|Selected \([+-]?\d/,
    'Selected values are never parenthesized')

  for (const label of ['Material', 'Labor', 'Burden', 'Standard Cost']) {
    const fullRow = rowFor(costFullTable, label)
    const selectedRow = rowFor(costSelectedTable, label)
    const fullSlot = gapSlot(fullRow, 'selected')
    const selectedSlot = gapSlot(selectedRow, 'selected')
    assert.equal(fullSlot.ariaHidden, 'true', 'Full mode Selected slot must be visually hidden for ' + label)
    assert.equal(fullSlot.text, '0.00', 'stable Full-mode Selected slot reserves the plain zero display')
    assert.equal(selectedSlot.tag, 'button', 'Selected mode value is an eligible shared SelectedNumber source for ' + label)
    assert.equal(selectedSlot.ariaHidden, null, 'Selected mode source is exposed by default for ' + label)
    assert.match(selectedSlot.ariaLabel ?? '', new RegExp(label + ' Selected Gap'), 'Selected mode retains its semantic accessible name for ' + label)
    for (const token of ['justify-self-end', 'text-right', 'text-[10px]', 'font-normal', 'text-slate-500', 'tabular-nums']) {
      assert.ok(selectedSlot.className.split(/\s+/).includes(token),
        'SelectedNumber hugs its rendered value and stays right-aligned in the reserved secondary slot with ' + token + ' for ' + label)
    }
    assert.doesNotMatch(selectedSlot.className, /\b(block|w-full)\b/,
      'SelectedNumber does not stretch across the reserved secondary slot for ' + label)
    assert.doesNotMatch(selectedSlot.className, /relative|left-2/,
      'Selected numeric values keep their existing position for ' + label)
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
  assert.equal(fullTotalValues[3], formatters.formatPercent(guards.safeDivide(fullComparison.totalGap!, fullComparison.referenceCost.total!)!, 2) + ' Total', 'STD Cost %Total must be Gap divided by Before Standard Cost')
  const expectedSelectedTotal = selectedContribution.elementGaps.material! + selectedContribution.elementGaps.labor! + selectedContribution.elementGaps.burden!
  assert.equal(gapSlot(selectedTotalRow, 'selected').text, formatters.formatVariance(expectedSelectedTotal, 2), 'STD Cost Selected Gap must equal Selected MAT + LB + BD')
  assert.match(selectedTotalRow, />Total<\/span>/, 'Cost footer percentage must visibly identify Total')

  const wcMarkup = renderWithSelectedValueProvider(React.createElement(wcView.WorkCenterProcessingTable, {
    comparison: fullComparison,
    selectedComparison: selectedDisplayComparison,
    selectedActive: true,
    gapDirection: 'Current − Reference'
  } as never))
  const costSummarySource = readFileSync(new URL('../src/features/cost-breakdown/components/SnapshotComparisonCard.tsx', import.meta.url), 'utf8')
  const wcSummarySource = readFileSync(new URL('../src/features/cost-breakdown/components/WorkCenterProcessingTable.tsx', import.meta.url), 'utf8')
  assertSharedSummaryStyleContract(summaryStyles, costSummarySource, wcSummarySource, costFullMarkup, wcMarkup)
  assert.doesNotMatch(visibleText(wcMarkup), /\bSelected\b/i, 'Work Center shows no Selected summary column or label')
  const workCenterAccessibleLabels = [...wcMarkup.matchAll(/aria-label="([^"]+)"/g)].map(([, label]) => label)
  assert.ok(workCenterAccessibleLabels.every(label => !/\bSelected\b/i.test(label)),
    'Work Center numeric source names do not invent a Selected comparison')
  const wcTableStart = wcMarkup.indexOf('<div role="table"')
  assert.ok(wcTableStart >= 0, 'Work Center exposes one accessible table grid')
  const wcTable = extractElement(wcMarkup, wcTableStart, 'div')
  const wcRows = roleRows(wcTable)
  assert.deepEqual(roleRowHeaders(wcRows[0]), ['Work Center', 'Before', 'After', 'GAP', '%GAP'])
  assert.equal((wcTable.match(/role="rowgroup"/g) ?? []).length, 3,
    'Work Center uses matching header, independently scrollable body, and fixed footer rowgroups')
  const wcScrollBodyStart = wcTable.indexOf('data-wc-scroll-body="true"')
  assert.ok(wcScrollBodyStart > wcTable.indexOf('role="columnheader"') && wcScrollBodyStart < wcTable.indexOf('role="rowheader"'),
    'only Work Center data rows sit inside the scroll body')
  assert.match(wcTable, /data-wc-scroll-body="true"[^>]*class="[^"]*overflow-y-auto/,
    'the Work Center body is the only internal vertical scroller')
  assert.doesNotMatch(wcMarkup + wcSummarySource, /h-\[30px\]|pr-\[6px\]|scrollbar-gutter:\s*stable/,
    'Work Center does not override the shared footer rhythm or compensate for its scrollbar with fake width')
  const wcBodyMarker = wcTable.indexOf('data-wc-scroll-body="true"')
  const wcBodyStart = wcTable.lastIndexOf('<div', wcBodyMarker)
  const wcBody = extractElement(wcTable, wcBodyStart, 'div')
  const wcBodyEnd = wcBodyStart + wcBody.length
  const footerGroupStart = wcTable.indexOf('<div role="rowgroup"', wcBodyEnd)
  assert.ok(wcTable.indexOf('role="columnheader"') < wcBodyStart && footerGroupStart >= wcBodyEnd,
    'the WC header and footer stay outside the actual body scroller')
  assert.doesNotMatch(wcTable, /GAP \(Selected\)/)
  const wcRow = wcRows.find(row => roleRowHeader(row) === 'WC-CUT')
  assert.ok(wcRow)
  assert.deepEqual(roleRowCells(wcRow), [
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
  assert.match(costSection, /data-cbd-overview-panel="cost"/,
    'Cost Element participates in the paired bounded overview')
  assert.match(wcSection, /data-cbd-overview-panel="work-center"/,
    'Work Center participates in the paired bounded overview')
  assert.match(wcMarkup, /data-wc-scroll-body="true"[^>]*class="[^"]*overflow-y-auto/,
    'Work Center rows own bounded internal vertical scrolling on desktop')
  const wcFooterRow = wcRows.find(row => roleRowHeader(row) === 'Total')
  assert.ok(wcFooterRow)
  const wcFooterValues = roleRowCells(wcFooterRow)
  const totalWcReference = guards.safeAdd(fullComparison.referenceCost.labor!, fullComparison.referenceCost.burden!)!
  const totalWcCurrent = guards.safeAdd(fullComparison.currentCost.labor!, fullComparison.currentCost.burden!)!
  const totalWcGap = guards.safeAdd(fullComparison.elementGaps.labor!, fullComparison.elementGaps.burden!)!
  assertClose(totalWcGap, fullComparison.totalGap! - fullComparison.elementGaps.material!, 'Total WC Gap must reconcile to Labor + Burden')
  assertClose(totalWcCurrent - totalWcReference, totalWcGap, 'Total WC After minus Before must equal Labor Gap + Burden Gap')
  assert.equal(wcFooterValues[0], formatters.formatNumber(totalWcReference, 2))
  assert.equal(wcFooterValues[1], formatters.formatNumber(totalWcCurrent, 2))
  assert.equal(wcFooterValues[2], formatters.formatVariance(totalWcGap, 2))
  assert.equal(wcFooterValues[3], formatters.formatPercent(guards.safeDivide(totalWcGap, totalWcReference)!, 2) + ' Total')
  assert.match(wcFooterRow, />Total<\/span>/, 'WC footer percentage must visibly identify Total')

  const pageSource = readFileSync(new URL('../src/features/cost-breakdown/CostBreakdownPage.tsx', import.meta.url), 'utf8')
  const candidateTableSource = readFileSync(new URL('../src/features/cost-breakdown/components/CandidateFindingsTable.tsx', import.meta.url), 'utf8')
  const pageRootClass = pageSource.match(/return \(\s*<div ref=\{pageRef\}[^>]*className="([^"]+)"/s)?.[1]
  const stickyShellIndex = pageSource.indexOf('data-cbd-sticky-shell="true"')
  const stickyShellTag = pageSource.match(/<div\b[^>]*data-cbd-sticky-shell="true"[^>]*>/)?.[0]
  const stickyShellClass = stickyShellTag?.match(/className="([^"]+)"/)?.[1]
  const overviewClass = pageSource.match(/<div id="cost-breakdown-overview-panels"[^>]*className=\{isOverviewExpanded \? '([^']+)'/)?.[1]
  const candidateRegionClass = pageSource.match(/<div role="region" aria-label="Candidate workspace" tabIndex=\{0\} className="([^"]+)"/)?.[1]
  assert.ok(pageRootClass && stickyShellClass && overviewClass && candidateRegionClass,
    'expected CBD workspace, sticky upper shell, bounded overview, and normal-flow Candidate region')
  assert.match(pageRootClass, /flex min-h-full min-w-0 flex-col[\s\S]*overflow-x-clip/,
    'CBD content grows naturally inside the shared Main scroll area')
  assert.doesNotMatch(pageRootClass, /overflow-y-auto|overflow-y-scroll|overflow-auto/,
    'CBD page content does not add a nested vertical scroll owner')
  assert.doesNotMatch(pageSource, /data-cbd-overview-divider|grid-cols-\[[^\]]*_1px_|grid-rows-\[[^\]]*_1px_/,
    'independent summary boxes must not regress to a center-divider architecture')
  assert.match(overviewClass, /items-stretch[\s\S]*lg:shrink-0/,
    'the shared overview stretches its independently bounded desktop boxes equally')
  assert.match(overviewClass, /lg:grid-cols-2|lg:grid-cols-\[repeat\(2,minmax\(0,1fr\)\)\]/,
    'the shared overview uses two equal desktop columns')
  assert.match(overviewClass, /(?:^|\s)(?:lg:)?gap-(?:[1-9]\d*(?:\.\d+)?|px)(?:\s|$)/,
    'the independent summary boxes have an intentional nonzero gap')
  assert.match(overviewClass, /\bbg-\S+/,
    'one shared overview background visually groups the separate boxes')
  for (const section of [costSection, wcSection]) {
    assert.match(section, /(?:^|\s)border(?:\s|$)/,
      'each summary box has its own complete border')
  }
  const costDesktopHeight = costSection.match(/\blg:h-[^\s"]+/)?.[0]
  const wcDesktopHeight = wcSection.match(/\blg:h-[^\s"]+/)?.[0]
  assert.ok(costDesktopHeight, 'Cost Element has an explicit bounded desktop height')
  assert.equal(wcDesktopHeight, costDesktopHeight, 'both summary boxes consume the same desktop height standard')
  assert.match(stickyShellClass, /lg:sticky[^\"]*lg:top-0/,
    'Subheader and Cost Element / Work Center overview stay sticky at the top of CBD Main while it scrolls')
  assert.doesNotMatch(stickyShellClass, /(?:^|\s)(?:pb-2|lg:bg-slate-100)(?:\s|$)/,
    'the 8px gap and its background are not part of the sticky shell')
  const costGapLegendClass = pageSource.match(/<div role="group" aria-label="Cost element color legend" className="([^"]+)"/)?.[1]
  assert.ok(costGapLegendClass, 'Standard Cost Gap has its compact MAT/LB/BD legend')
  assert.match(costGapLegendClass, /(?:^|\s)border-l border-slate-300 pl-2(?:\s|$)/,
    'the Cost Gap legend uses a subtle divider and spacing after its title/value')
  const subheaderIndex = pageSource.indexOf('Cost Breakdown subheader')
  const overviewIndex = pageSource.indexOf('<div id="cost-breakdown-overview-panels"')
  const candidateIndex = pageSource.indexOf('aria-label="Candidate workspace"')
  assert.ok(subheaderIndex >= stickyShellIndex
    && overviewIndex > subheaderIndex
    && candidateIndex > overviewIndex
    && /\r?\n      <\/div>\r?\n      <\/div>\r?\n\r?\n      <div aria-hidden="true" data-cbd-sticky-gap="true" className="h-2 shrink-0" \/>\r?\n\r?\n      <div role="region" aria-label="Candidate workspace"/.test(pageSource.slice(overviewIndex, candidateIndex + 100)),
  'only the Subheader and summary belong to the sticky shell; Candidate remains Main content')
  assert.match(pageSource.slice(overviewIndex, candidateIndex), /<div aria-hidden="true" data-cbd-sticky-gap="true" className="h-2 shrink-0" \/>/,
    'the 8px gap follows the complete sticky Summary as a normal-flow sibling before Candidate')
  assert.doesNotMatch(candidateRegionClass, /overflow-y-auto|overflow-y-scroll|overflow-auto|flex-1|min-h-0/,
    'Candidate Findings stays in normal flow and does not take a second vertical scroll owner')
  const appLayoutSource = readFileSync(new URL('../src/shared/layout/AppLayout.tsx', import.meta.url), 'utf8')
  assert.match(appLayoutSource, /className=\{isCostBreakdown\s*\?\s*'[^']*overflow-y-auto[^']*'\s*:/,
    'shared Main remains the CBD page-level vertical scroll owner')
  assert.match(pageSource, /<Tooltip label=\{isOverviewExpanded \? 'Collapse' : 'Expand'\}[^>]*>[\s\S]*?<button[\s\S]*?aria-expanded=\{isOverviewExpanded\}[\s\S]*?aria-controls="cost-breakdown-overview-panels"[\s\S]*?aria-label=\{isOverviewExpanded \? 'Collapse' : 'Expand'\}[\s\S]*?<\/button>\s*<\/Tooltip>/,
    'overview disclosure has a shared tooltip, accessible name, expanded state, and controlled panel reference')
  const overviewDisclosure = pageSource.match(/<Tooltip label=\{isOverviewExpanded \? 'Collapse' : 'Expand'\}[\s\S]*?<\/Tooltip>/)?.[0]
  assert.ok(overviewDisclosure, 'overview disclosure is wrapped by the shared Tooltip')
  assert.doesNotMatch(overviewDisclosure, /\btitle=/,
    'overview disclosure does not duplicate its shared Tooltip with a native title')
  assert.match(pageSource, /isOverviewExpanded\s*\?\s*<ChevronDown data-cbd-overview-indicator="true" aria-hidden="true"[\s\S]*:\s*<ChevronRight data-cbd-overview-indicator="true" aria-hidden="true"/,
    'expanded Overview uses ChevronDown and collapsed Overview uses ChevronRight')
  const overviewButtonClass = pageSource.match(/const iconActionButtonClass = '([^']+)'/)?.[1] ?? ''
  assert.match(overviewButtonClass, /\bbg-transparent\b/, 'Overview disclosure is bare at idle')
  assert.doesNotMatch(overviewButtonClass, /(?:^|\s)border(?:-|\s)|\bbg-white\b/,
    'Overview disclosure has no persistent border or white box')
  assert.match(overviewButtonClass, /focus-visible:outline/,
    'Overview disclosure keeps a visible keyboard focus indicator')
  assert.match(pageSource, /data-cbd-overview-indicator="true"/,
    'overview disclosure retains a visible state indicator')
  assert.match(candidateRegionClass, /max-lg:\[contain:paint\]/,
    'narrow Candidate table overflow stays local rather than widening the document or Main')
  assert.doesNotMatch(appLayoutSource, /isCostBreakdown[\s\S]*?overflow-y-auto[^']*lg:overflow-y-hidden/,
    'CBD Main remains a vertical scroll owner at desktop widths')
  assert.match(candidateTableSource, /return <div className="border border-slate-200">[\s\S]*<StickyTableHeader[\s\S]*<div className="overflow-x-auto" onScroll=\{syncHeaderScroll\}>[\s\S]*<table className=\{tableClassName\}/,
    'narrow Candidate tables keep their own local horizontal fallback and enough width to avoid column collisions')

  console.log('PASS: CBD summary UX verifier (Gap Bar, Cost, Work Center)')
  console.log('PASS: proportional Selected overlay, per-element Normal/Highlight/Remove, accessible titles')
  console.log('PASS: Cost row/slot structure and MAT/LB/BD plus STD Cost formulas')
  console.log('PASS: Cost Element uses stable neutral Selected slots without parentheses')
  console.log('PASS: Work Center is bounded with body-only scrolling and fixed aligned header/footer')
  console.log('PASS: shared Main owns CBD vertical scrolling; Summary stays sticky with a normal-flow 8px gap; Candidate remains natural flow; summary calculations reconcile')
} finally {
  await vite.close()
}
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
