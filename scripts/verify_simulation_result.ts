import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import type { CostSnapshot } from '../src/core/types'

const vite = await createServer({
  server: { middlewareMode: true, hmr: false },
  appType: 'custom',
  logLevel: 'error',
  optimizeDeps: { noDiscovery: true, entries: [] }
})

try {
  const { SimulationPage } = await vite.ssrLoadModule('/src/features/simulation/SimulationPage.tsx')
  const { startSimulationFrom, setSimulationEconomicInput } = await vite.ssrLoadModule('/src/features/simulation/simulation-state.ts')
  const { updateSimulationParameter } = await vite.ssrLoadModule('/src/features/simulation/simulation-engine.ts')

  const makeSnapshot = (id: string, materialPrice: number | null, sellingPrice: number | null = 250): CostSnapshot => ({
    id,
    product: {
      productCode: 'RESULT-1', productDescription: 'Result verification product', uom: 'KG',
      customer: '', effectiveDate: '', sellingPrice, sgaPercent: 8
    },
    effectiveDate: '', sourceRef: id, status: 'draft',
    rates: [{ id: 'rate-1', workCenterCode: 'WC-1', description: 'Zero-rate fixture', laborRate: 0, burdenRate: 0, effectiveDate: '', confidence: {} }],
    bom: [{
      id: 'material-1', itemCode: 'MAT-1', description: 'Verification material',
      consumption: 1, unit: 'KG', price: materialPrice, loss: 0, confidence: {}
    }],
    routing: [{ id: 'route-1', processName: 'Fixture route', workCenterId: 'WC-1', manning: 1, capacity: 1, yield: 1, confidence: {} }]
  })
  const render = (state: any, currentSnapshot: CostSnapshot) => renderToStaticMarkup(React.createElement(SimulationPage, {
    state,
    workingSelection: state.workingSelection,
    referenceSnapshot: currentSnapshot,
    currentSnapshot,
    onCloneSource() {}, onSendTo() { return true }, onResetParameters() {},
    onToggleWorkingTarget() {}, onUpdateParameter() {}, onUpdateEconomicInput() {}
  }))
  const resultPanel = (markup: string) => markup.match(/<section[^>]*aria-labelledby="simulation-result-title"[\s\S]*?<\/section>/)?.[0] ?? ''
  const rowElement = (markup: string, label: string) => {
    const panel = resultPanel(markup)
    return [...panel.matchAll(/<tr[^>]*>[\s\S]*?<\/tr>/g)].map(match => match[0]).find(content =>
      content.includes('scope="row"') && content.replace(/&amp;/g, '&').includes(`>${label}</th>`)
    ) ?? ''
  }
  const row = (markup: string, label: string) => {
    return rowElement(markup, label).replace(/^<tr[^>]*>|<\/tr>$/g, '')
  }
  const values = (rowMarkup: string) => [...rowMarkup.matchAll(/<td class="([^"]*)">([^<]*)<\/td>/g)]
    .map(match => ({ className: match[1], text: match[2] }))

  const current = makeSnapshot('current', 78)
  const sources = { reference: current, current, custom: current }
  const baseline = startSimulationFrom('current', sources)
  const improved = updateSimulationParameter(baseline, current, 'material-1', 'bom.price', 71)
  const baselineMarkup = render(improved, current)
  const panel = resultPanel(baselineMarkup)
  assert.ok(panel, 'Result panel renders')
  assert.match(panel, /<h2 id="simulation-result-title"[^>]*>Result<\/h2>/, 'Result heading remains')
  assert.doesNotMatch(panel, /Current → SIM|THB\//, 'Result has no Current-to-SIM/UOM subtitle')
  assert.deepEqual(
    [...panel.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)].map(([, attributes, contents]) =>
      attributes.match(/aria-label="([^"]+)"/)?.[1] ?? contents.replace(/<[^>]*>/g, '').trim()),
    ['Clone from', 'Send to', 'Reset Simulation'],
    'Clone from, Send to, and Reset remain in the existing order'
  )
  assert.ok(panel.indexOf('Cost / Unit') < panel.indexOf('Standard Cost'))
  assert.ok(panel.indexOf('Standard Cost') < panel.indexOf('Business Outcome / Unit'))
  assert.ok(panel.indexOf('Business Outcome / Unit') < panel.indexOf('Selling Price'))
  assert.ok(panel.indexOf('Selling Price') < panel.indexOf('SG&amp;A'))
  assert.ok(panel.indexOf('SG&amp;A') < panel.indexOf('Operating Profit'))

  const materialRow = rowElement(baselineMarkup, 'Material Cost')
  const conversionRow = rowElement(baselineMarkup, 'Conversion Cost')
  const standardRow = rowElement(baselineMarkup, 'Standard Cost')
  assert.match(materialRow, /<tr class="text-slate-700">/, 'ordinary cost rows keep their existing weight')
  assert.match(conversionRow, /<tr class="border-t border-slate-200 font-medium text-slate-800 !border-slate-200">/,
    'Conversion Cost has a subtle top separator and medium emphasis')
  assert.match(standardRow, /<tr class="border-t border-slate-300 font-semibold text-slate-950 !border-slate-300">/,
    'Standard Cost remains stronger than the Conversion Cost subtotal')

  assert.deepEqual(values(row(baselineMarkup, 'Material Cost')).map(cell => cell.text), ['78.00', '71.00', '-7.00', '-8.97%'])
  for (const label of ['Labor Cost', 'Burden Cost', 'Conversion Cost']) {
    assert.deepEqual(values(row(baselineMarkup, label)).map(cell => cell.text), ['0.00', '0.00', '0.00', '—'],
      `${label} values and unavailable zero-baseline percentage remain unchanged`)
  }

  const costRow = values(row(baselineMarkup, 'Standard Cost'))
  assert.deepEqual(costRow.map(cell => cell.text), ['78.00', '71.00', '-7.00', '-8.97%'])
  assert.match(costRow[2]?.className ?? '', /text-emerald-700/, 'lower cost is favorable')
  assert.match(costRow[3]?.className ?? '', /text-emerald-700/, 'lower cost percent is favorable')
  assert.deepEqual(values(row(baselineMarkup, 'Selling Price')).map(cell => cell.text), ['250.00', '250.00', '0.00', '0.00%'])
  assert.deepEqual(values(row(baselineMarkup, 'SG&A')).map(cell => cell.text), ['20.00', '20.00', '0.00', '0.00%'])
  const profitRow = values(row(baselineMarkup, 'Operating Profit'))
  assert.deepEqual(profitRow.map(cell => cell.text), ['152.00', '159.00', '+7.00', '+4.61%'])
  assert.match(profitRow[2]?.className ?? '', /text-emerald-700/, 'higher operating profit is favorable')
  assert.match(profitRow[3]?.className ?? '', /text-emerald-700/)
  for (const label of ['Selling Price', 'SG&A']) {
    const neutral = values(row(baselineMarkup, label))
    assert.match(neutral[2]?.className ?? '', /text-slate-700/, `${label} change is neutral`)
    assert.match(neutral[3]?.className ?? '', /text-slate-700/, `${label} percentage is neutral`)
  }

  const withPriceOverride = setSimulationEconomicInput(improved, 'sellingPriceOverride', '260')
  const priceMarkup = render(setSimulationEconomicInput(withPriceOverride, 'sgaPercentOverride', '8'), current)
  assert.deepEqual(values(row(priceMarkup, 'Selling Price')).map(cell => cell.text), ['250.00', '260.00', '+10.00', '+4.00%'])
  assert.deepEqual(values(row(priceMarkup, 'SG&A')).map(cell => cell.text), ['20.00', '20.80', '+0.80', '+4.00%'])
  assert.deepEqual(values(row(priceMarkup, 'Operating Profit')).map(cell => cell.text), ['152.00', '168.20', '+16.20', '+10.66%'])
  assert.deepEqual(values(row(priceMarkup, 'Standard Cost')).map(cell => cell.text), ['78.00', '71.00', '-7.00', '-8.97%'],
    'business overrides do not change Cost / Unit')

  const withSgaOverride = setSimulationEconomicInput(withPriceOverride, 'sgaPercentOverride', '10')
  const sgaMarkup = render(withSgaOverride, current)
  assert.deepEqual(values(row(sgaMarkup, 'SG&A')).map(cell => cell.text), ['20.00', '26.00', '+6.00', '+30.00%'])
  assert.deepEqual(values(row(sgaMarkup, 'Operating Profit')).map(cell => cell.text), ['152.00', '163.00', '+11.00', '+7.24%'])

  const zeroCurrent = makeSnapshot('zero-current', 0, 0)
  const zeroState = startSimulationFrom('current', { reference: zeroCurrent, current: zeroCurrent, custom: zeroCurrent })
  const zeroSimulation = updateSimulationParameter(zeroState, zeroCurrent, 'material-1', 'bom.price', 2)
  const zeroMarkup = render(zeroSimulation, zeroCurrent)
  const zeroCostRow = values(row(zeroMarkup, 'Standard Cost'))
  assert.deepEqual(zeroCostRow.map(cell => cell.text), ['0.00', '2.00', '+2.00', '—'])
  assert.match(zeroCostRow[3]?.className ?? '', /text-slate-400/, 'an unavailable zero-denominator percentage is gray')
  assert.deepEqual(values(row(zeroMarkup, 'Selling Price')).map(cell => cell.text), ['0.00', '0.00', '0.00', '—'])
  assert.deepEqual(values(row(zeroMarkup, 'Operating Profit')).map(cell => cell.text), ['0.00', '-2.00', '-2.00', '—'])

  const missingPrice = makeSnapshot('missing-price', 78, null)
  const missingState = startSimulationFrom('current', { reference: missingPrice, current: missingPrice, custom: missingPrice })
  const missingMarkup = render(missingState, missingPrice)
  assert.deepEqual(values(row(missingMarkup, 'Selling Price')).map(cell => cell.text), ['—', '—', '—', '—'])
  assert.deepEqual(values(row(missingMarkup, 'SG&A')).map(cell => cell.text), ['—', '—', '—', '—'])
  assert.deepEqual(values(row(missingMarkup, 'Operating Profit')).map(cell => cell.text), ['—', '—', '—', '—'])

  const negativeCurrent = makeSnapshot('negative-current', 300)
  const negativeState = startSimulationFrom('current', { reference: negativeCurrent, current: negativeCurrent, custom: negativeCurrent })
  const lowerProfit = updateSimulationParameter(negativeState, negativeCurrent, 'material-1', 'bom.price', 310)
  const negativeMarkup = render(lowerProfit, negativeCurrent)
  const negativeProfitRow = values(row(negativeMarkup, 'Operating Profit'))
  assert.deepEqual(negativeProfitRow.map(cell => cell.text), ['-70.00', '-80.00', '-10.00', '+14.29%'])
  assert.match(negativeProfitRow[2]?.className ?? '', /text-rose-700/, 'a lower negative profit remains unfavorable')
  assert.match(negativeProfitRow[3]?.className ?? '', /text-rose-700/, 'profit percentage color follows profit change direction')
  assert.doesNotMatch(resultPanel(negativeMarkup), /NaN|Infinity/)

  console.log('Simulation Result values, hierarchy, actions, and unavailable-value verification passed')
} finally {
  await vite.close()
}
