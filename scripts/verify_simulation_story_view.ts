import assert from 'node:assert/strict'
import React from 'react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import type { CostSnapshot, ScenarioFinancialResult, SnapshotCost } from '../src/core/types'

const vite = await createServer({
  server: { middlewareMode: true, hmr: false },
  appType: 'custom',
  logLevel: 'error',
  optimizeDeps: { noDiscovery: true, entries: [] }
})
try {
  const { calculateScenarioBusinessMetrics } = await vite.ssrLoadModule('/src/core/calculations/scenario-business.ts')
  const { createScenarioFinancialResult, createScenarioStory } = await vite.ssrLoadModule('/src/core/calculations/scenario-story.ts')
  const { SimulationStoryGraph } = await vite.ssrLoadModule('/src/features/simulation/SimulationStoryGraph.tsx')
  const { SimulationPage } = await vite.ssrLoadModule('/src/features/simulation/SimulationPage.tsx')
  const { simulationWorkingTargetKey, startSimulationFrom } = await vite.ssrLoadModule('/src/features/simulation/simulation-state.ts')
  const { calculateParameterSimulation } = await vite.ssrLoadModule('/src/features/simulation/simulation-engine.ts')

  const cost = (snapshotId: string, material: number, labor: number, burden: number): SnapshotCost => ({
    snapshotId, material, labor, burden, total: material + labor + burden, status: 'complete', warnings: []
  })
  const financial = (standardCost: SnapshotCost, sellingPrice: number, sgaPercent: number): ScenarioFinancialResult =>
    createScenarioFinancialResult(standardCost, calculateScenarioBusinessMetrics({ sellingPrice, sgaPercent }, standardCost.total))

  const reference = cost('ref', 60, 20, 10)
  const current = cost('current', 65, 20, 15)
  const sim = cost('sim', 62, 20, 13)
  const story = createScenarioStory(financial(reference, 120, 8), financial(current, 120, 10), financial(sim, 120, 10))
  assert.equal(story.gap1.standardCost, 10, 'GAP 1 is Current - Reference')
  assert.equal(story.gap2.standardCost, -5, 'GAP 2 is SIM - Current and may be negative')
  const graphMarkup = renderToStaticMarkup(React.createElement(SimulationStoryGraph, { story }))
  const graphSource = readFileSync(resolve(process.cwd(), 'src/features/simulation/SimulationStoryGraph.tsx'), 'utf8')
  const graphText = graphMarkup.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')
  assert.match(graphMarkup, /REF → GAP 1 → CUR → GAP 2 → SIM/)
  assert.match(graphMarkup, /GAP 1 \+10\.00/, 'GAP 1 uses the compact signed Standard Cost change')
  assert.match(graphMarkup, /GAP 2 -5\.00/, 'GAP 2 uses the compact signed Standard Cost change')
  assert.match(graphMarkup, /GAP 1 MAT Gap: \+5\.00/)
  assert.match(graphMarkup, /GAP 2 MAT Gap: -3\.00/)
  assert.doesNotMatch(graphMarkup, /\bSC [+-]\d/, 'gap labels do not use the ambiguous SC +/- notation')
  for (const [part, color] of [['MAT', '#4F7CAC'], ['LB', '#D89B45'], ['BD', '#8067B7']]) {
    assert.ok(graphMarkup.includes(`fill="${color}"`), `${part} uses the exact CBD palette color in the graph bars`)
    assert.ok(graphMarkup.includes(`background-color:${color}`), `${part} uses the exact CBD palette color in the legend`)
  }
  assert.match(graphMarkup, /role="slider"[^>]*aria-label="Visual comparison ruler"/)
  assert.match(graphMarkup, /aria-valuetext="[^\"]+ THB per piece"/)
  assert.match(graphSource, /onKeyDown=\{handleRulerKeyDown\}/, 'the visual ruler remains keyboard operable')
  assert.match(graphSource, /onPointerDown=/, 'the visual ruler still responds to pointer start')
  assert.match(graphSource, /onPointerMove=/, 'the visual ruler still responds to pointer movement')
  assert.match(graphSource, /onPointerUp=/, 'the visual ruler still responds to pointer release')
  assert.match(graphSource, /onPointerCancel=/, 'the visual ruler releases pointer capture on cancellation')
  assert.match(graphMarkup, /STD \d+\.\d{2}/, 'the compact graph retains each Standard Cost total')
  assert.match(graphMarkup, /Selling Price<\/li>/, 'Selling Price remains a separate graph line')
  assert.ok(graphMarkup.includes('fill="#15803d"'), 'positive OP uses its green sign color')
  assert.doesNotMatch(graphMarkup, /GAP [12] (?:SG&A|OP|Selling Price) Gap:/,
    'gap bars only contain MAT, LB, and BD')
  assert.ok(graphMarkup.includes('SG&amp;A') && graphText.includes('OP'), 'dataset bars and legend retain the separate economic values')

  const negativeOPStory = createScenarioStory(financial(reference, 120, 10), financial(current, 120, 10), financial(cost('loss', 90, 0, 0), 80, 10))
  assert.equal(negativeOPStory.simulated.operatingProfitPerPiece, -18, 'negative OP remains a valid story value')
  const negativeOPMarkup = renderToStaticMarkup(React.createElement(SimulationStoryGraph, { story: negativeOPStory }))
  assert.match(negativeOPMarkup, /Simulated OP: -18\.00 THB\/pc/)
  assert.ok(negativeOPMarkup.includes('fill="#be123c"'), 'negative OP uses its red sign color')

  const makeSnapshot = (id: string, price: number, referencePrice: number): CostSnapshot => ({
    id,
    product: { productCode: 'P-1', productDescription: 'Fixture', uom: 'PC', customer: '', effectiveDate: '', sellingPrice: 120, sgaPercent: 10 },
    effectiveDate: '', sourceRef: id, status: 'draft',
    rates: [{ id: `${id}-rate`, workCenterCode: 'WC-1', description: 'Long Work Center Description', laborRate: 10, burdenRate: 5, effectiveDate: '', confidence: {} }],
    bom: [
      { id: `${id}-bom`, itemCode: 'MAT-1', description: 'A deliberately long stainless steel material description for wrapping', consumption: 2, unit: 'PC', price, loss: 0.05, confidence: {} },
      { id: `${id}-bom-extra`, itemCode: 'MAT-2', description: 'Second material', consumption: 1, unit: 'PC', price: referencePrice, loss: 0, confidence: {} }
    ],
    routing: [
      { id: `${id}-route`, processName: 'Assembly process with a long name', workCenterId: 'WC-1', manning: 1, capacity: 10, yield: 1, confidence: {} }
    ]
  })
  const referenceSnapshot = makeSnapshot('reference', 10, 3)
  const currentSnapshot = makeSnapshot('current', 12, 3)
  const customSnapshot = makeSnapshot('custom', 12, 3)
  const sources = { reference: referenceSnapshot, current: currentSnapshot, custom: customSnapshot }
  const state = startSimulationFrom('current', sources)
  const simulation = calculateParameterSimulation(currentSnapshot, state.snapshot!)
  assert.equal(simulation.currentCost.total, simulation.simulationCost.total)
  assert.equal(simulation.parameterSavingPerPiece, 0, 'No-change Parameter Saving is zero')
  const pageMarkup = renderToStaticMarkup(React.createElement(SimulationPage, {
    state,
    workingSelection: state.workingSelection,
    referenceSnapshot,
    currentSnapshot,
    onCloneSource() {},
    onSendTo() { return true },
    onResetParameters() {},
    onToggleWorkingTarget() {},
    onUpdateParameter() {},
    onUpdateEconomicInput() {}
  }))
  const pageText = pageMarkup.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')
  assert.match(pageMarkup, /Clone from/)
  assert.match(pageMarkup, /Send to/)
  assert.match(pageMarkup, /Result/)
  assert.match(pageMarkup, /Economic/)
  assert.match(pageMarkup, />BOM</, 'the BOM editor uses the compact section label')
  assert.match(pageMarkup, />RTG</, 'the routing editor uses the compact section label')
  assert.match(pageMarkup, /Selection does not limit the full Simulation calculation/,
    'the UI explains that local row selection does not filter calculation')
  assert.match(pageMarkup, /Current → SIM/)
  assert.ok(pageText.includes('0.00%'), 'no-change Result percentage renders as 0.00%')
  assert.doesNotMatch(pageMarkup, /<h1[^>]*>Simulation<\/h1>|Adjust SIM parameters and review the live/,
    'the large Simulation PageHeading is removed')
  assert.doesNotMatch(pageMarkup, /Factors to Simulate|Select .* factor/,
    'direct editing does not show a Factors selector')
  assert.doesNotMatch(pageMarkup, /min-w-\[(?:390|650|730)px\]|overflow-x-auto/,
    'Result, BOM, and RTG do not force a horizontal scroll area')
  assert.match(pageMarkup, /table-fixed/, 'the parameter table fits its panel with fixed layout')
  assert.match(pageMarkup, /aria-label="A deliberately long stainless steel material description for wrapping Price in SIM"/,
    'editable fields remain labelled for long material names')
  const materialNameIndex = pageMarkup.indexOf('A deliberately long stainless steel material description for wrapping')
  assert.ok(materialNameIndex >= 0, 'the test row is present in the rendered table')
  const selectedPageMarkup = renderToStaticMarkup(React.createElement(SimulationPage, {
    state,
    workingSelection: [simulationWorkingTargetKey('bom', currentSnapshot.bom[0].id)],
    referenceSnapshot,
    currentSnapshot,
    onCloneSource() {},
    onSendTo() { return true },
    onResetParameters() {},
    onToggleWorkingTarget() {},
    onUpdateParameter() {},
    onUpdateEconomicInput() {}
  }))
  assert.match(selectedPageMarkup, /1 selected · structure locked/,
    'the selected BOM is reflected in the local working count')
  assert.ok(selectedPageMarkup.includes('checked=""'), 'the selected BOM has a checked selection control')
  const materialRowStart = pageMarkup.lastIndexOf('<tr', materialNameIndex)
  assert.ok(materialRowStart >= 0, 'the test material belongs to a rendered table row')
  const materialRowStartTag = pageMarkup.slice(materialRowStart, pageMarkup.indexOf('>', materialRowStart))
  assert.match(materialRowStartTag, /tabindex="0"/, 'the whole parameter row is keyboard reachable')
  assert.match(materialRowStartTag, /aria-expanded="false"/, 'the row exposes its collapsed state')
  assert.match(materialRowStartTag, /aria-label=/, 'the whole parameter row has an accessible name')
  const pageSource = readFileSync(resolve(process.cwd(), 'src/features/simulation/SimulationPage.tsx'), 'utf8')
  const rolesStart = pageSource.indexOf('const ROLES: Array')
  const rolesEnd = pageSource.indexOf('const BOM_PARAMETERS', rolesStart)
  const roleSource = pageSource.slice(rolesStart, rolesEnd)
  for (const [role, label] of [['reference', 'Reference'], ['current', 'Current'], ['custom', 'Custom']]) {
    assert.ok(roleSource.includes(`role: '${role}', label: '${label}'`),
      `Send to offers the ${label} Master Data role`)
  }
  const sendToMenuSource = pageSource.match(/<RoleActionMenu\s+label="Send to"[\s\S]*?\/>/)?.[0] ?? ''
  assert.ok(sendToMenuSource.length > 0, 'the Send to role menu is wired in the Simulation actions')
  assert.match(sendToMenuSource, /onSendTo\(role, simulationSnapshot\)/,
    'Send to passes the selected role and current SIM snapshot to its integration callback')
  assert.match(sendToMenuSource, /SIM sent to .* Working\./,
    'a successful transfer reports the selected Master Data Working dataset')
  assert.match(sendToMenuSource, /Send blocked by Master Data validation\./,
    'a rejected transfer reports Master Data validation feedback')
  const rowTemplateStart = pageSource.indexOf('const status = rowStatusText(row)')
  assert.ok(rowTemplateStart >= 0, 'the Simulation parameter row template remains identifiable')
  const rowOpeningStart = pageSource.indexOf('<tr', rowTemplateStart)
  assert.ok(rowOpeningStart >= 0, 'the parameter row uses a table row element')
  const rowHandlerSource = pageSource.slice(rowOpeningStart, pageSource.indexOf('</tr>', rowOpeningStart))
  assert.match(rowHandlerSource, /onClick=\{/, 'clicking anywhere on the parameter row invokes its row action')
  assert.match(rowHandlerSource, /onKeyDown=\{/, 'the row action has a keyboard handler')
  assert.match(rowHandlerSource, /event\.key\s*!==\s*['"]Enter['"]/, 'Enter is accepted by the row activation guard')
  assert.match(rowHandlerSource, /event\.key\s*!==\s*['"] ['"]/, 'Space is accepted by the row activation guard')
  assert.match(rowHandlerSource, /isInteractiveTarget\(event\.target\)/,
    'editing inputs and nested controls keep their own click behavior')
  const mobileRowsStart = pageSource.indexOf('tableRows.map((row, index) => {', pageSource.indexOf('tableRows.map((row, index) => {') + 1)
  assert.ok(mobileRowsStart >= 0, 'a separate mobile card row template remains available')
  const mobileArticleStart = pageSource.indexOf('<article', mobileRowsStart)
  const mobileRowHandlerSource = pageSource.slice(mobileArticleStart, pageSource.indexOf('</article>', mobileArticleStart))
  assert.match(mobileRowHandlerSource, /tabIndex=\{canExpand \? 0 : undefined\}/, 'mobile rows are keyboard reachable too')
  assert.match(mobileRowHandlerSource, /onClick=\{/, 'the full mobile card toggles its detail')
  assert.match(mobileRowHandlerSource, /onKeyDown=\{/, 'mobile rows use the same keyboard activation')
  assert.match(mobileRowHandlerSource, /event\.key\s*!==\s*['"]Enter['"]|event\.key\s*!==\s*['"] ['"]/,
    'mobile cards respond to Enter or Space')
  assert.doesNotMatch(pageMarkup, /RCA Case context|Start SIM From|Action Cost\s*\/\s*Evaluation Quantity|Evaluation Quantity/,
    'visible Simulation has no active RCA strip or old economic model')

  const duplicateSnapshot = {
    ...customSnapshot,
    bom: [
      { ...customSnapshot.bom[0], id: 'ambiguous-1' },
      { ...customSnapshot.bom[0], id: 'ambiguous-2' }
    ]
  }
  const protectedState = startSimulationFrom('custom', { ...sources, custom: duplicateSnapshot })
  const protectedMarkup = renderToStaticMarkup(React.createElement(SimulationPage, {
    state: protectedState,
    workingSelection: protectedState.workingSelection,
    referenceSnapshot,
    currentSnapshot,
    onCloneSource() {}, onSendTo() { return true }, onResetParameters() {}, onToggleWorkingTarget() {}, onUpdateParameter() {}, onUpdateEconomicInput() {}
  }))
  assert.match(protectedMarkup, /Ambiguous identity · protected/)
  assert.match(protectedMarkup, /aria-label="BOM: .* activate to expand Parameter Cost Effect"/,
    'the ambiguous row exposes its full-row expansion name')
  assert.match(protectedMarkup, /aria-expanded="false"/)
  const protectedText = protectedMarkup.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')
  assert.doesNotMatch(protectedText, /Parameter Cost Effect/, 'the compact detail remains collapsed until requested')
  assert.doesNotMatch(protectedMarkup, /100\.00%/, 'per-parameter attribution shares are not presented')
  assert.match(pageSource, /\{expanded && \(/, 'Parameter Cost Effect appears only after expanding the row')
  assert.match(pageSource, /Parameter Cost Effect/, 'the expandable row contains the effect detail')
  assert.match(pageSource, /analysis\.effects\.effects === null \? null : analysis\.effects\.totalEffect/,
    'unavailable attribution does not fabricate a total amount or percentage')
  assert.doesNotMatch(pageSource, /analysis\.effects\.shares\?\./, 'per-factor share percentages are removed from the presentation')

  console.log('Simulation story graph and page contract verification passed')
} finally {
  await vite.close()
}
