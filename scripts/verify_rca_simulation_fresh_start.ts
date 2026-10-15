import assert from 'node:assert/strict'
import React from 'react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import type { CostSnapshot, MasterDataRole } from '../src/core/types'

const vite = await createServer({
  server: { middlewareMode: true, hmr: false },
  appType: 'custom',
  logLevel: 'error',
  optimizeDeps: { noDiscovery: true, entries: [] }
})
try {
  const { SimulationPage } = await vite.ssrLoadModule('/src/features/simulation/SimulationPage.tsx')
  const { createEmptySimulationState, reconcileSimulationState, startSimulationFrom } = await vite.ssrLoadModule('/src/features/simulation/simulation-state.ts')
  const snapshot = (id: string, price: number, laborRate: number): CostSnapshot => ({
    id,
    product: { productCode: 'P-1', productDescription: 'Test Product', uom: 'PC', customer: '', effectiveDate: '', sellingPrice: 120, sgaPercent: 10 },
    effectiveDate: '', sourceRef: id, status: 'draft',
    rates: [{ id: `${id}-wc`, workCenterCode: 'WC-1', description: 'Assembly', laborRate, burdenRate: 2, effectiveDate: '', confidence: {} }],
    bom: [{ id: `${id}-bom`, itemCode: 'MAT-1', description: 'Candidate Material', consumption: 1, unit: 'PC', price, loss: 0, confidence: {} }],
    routing: [{ id: `${id}-process`, processName: 'Candidate Process', workCenterId: 'WC-1', manning: 1, capacity: 10, yield: 1, confidence: {} }]
  })
  const sources: Record<MasterDataRole, CostSnapshot> = {
    reference: snapshot('reference', 9, 9),
    current: snapshot('current', 10, 10),
    custom: snapshot('custom', 12, 12)
  }
  const noStoredState = createEmptySimulationState()
  assert.equal(noStoredState.snapshot, null, 'empty persisted state waits for the active page lifecycle')
  const fresh = startSimulationFrom('current', sources, '2026-10-09T00:00:00.000Z')
  assert.equal(fresh.snapshot?.id, 'current')
  assert.equal(fresh.snapshot?.rates[0]?.laborRate, 10, 'Current starts with Current rates')
  const fromReference = startSimulationFrom('reference', sources)
  const fromCustom = startSimulationFrom('custom', sources)
  assert.equal(fromReference.snapshot?.bom[0]?.price, 9)
  assert.equal(fromCustom.snapshot?.bom[0]?.price, 12)
  assert.equal(fromReference.snapshot?.rates[0]?.laborRate, 10, 'Reference clone still uses Current Work Center rates')
  assert.equal(fromCustom.snapshot?.rates[0]?.laborRate, 10, 'Custom clone still uses Current Work Center rates')

  const oldCurrent = startSimulationFrom('custom', sources, '2026-10-09T00:01:00.000Z', {
    fixedActionCost: '850', variableActionCostPerPiece: '1.25', batchSize: '25',
    sellingPriceOverride: '42', sgaPercentOverride: '8'
  })
  const changedCurrent = { ...sources, current: snapshot('current-next', 11, 15) }
  const stale = reconcileSimulationState(oldCurrent, changedCurrent)
  assert.equal(stale.snapshot, null, 'Current changes discard an obsolete copied snapshot')
  assert.equal(stale.economicInputs.fixedActionCost, '850', 'valid Economic inputs survive Current reconciliation')
  assert.equal(stale.economicInputs.batchSize, '25')
  const recreated = startSimulationFrom('current', changedCurrent, undefined, stale.economicInputs)
  assert.equal(recreated.snapshot?.id, 'current-next', 'a fresh active SIM uses the new Current')
  assert.equal(recreated.snapshot?.rates[0]?.laborRate, 15)

  const markup = renderToStaticMarkup(React.createElement(SimulationPage, {
    state: fresh,
    referenceSnapshot: sources.reference,
    currentSnapshot: sources.current,
    onCloneSource() {},
    onSendTo() { return true },
    onUpdateParameter() {},
    onUpdateEconomicInput() {}
  }))
  assert.match(markup, /Clone from/)
  assert.match(markup, /Send to/)
  assert.match(markup, /Candidate Material Price in SIM/)
  assert.match(markup, /Candidate Process Manning in SIM/)
  assert.match(markup, /Fixed Action Cost/)
  assert.match(markup, /Variable Action Cost \/ pc/)
  assert.match(markup, /Batch Size/)
  assert.doesNotMatch(markup, /Start SIM From|RCA Case context|RcaSimulationHandoffContext|prepareSimulationForRcaHandoff|Factors to Simulate/)

  const app = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8')
  const rca = readFileSync(resolve(process.cwd(), 'src/state/rca-cases.ts'), 'utf8')
  assert.match(app, /activeTab === 'simulation' && !reconciledSimulationState\.snapshot[\s\S]*?startSimulationFrom\('current'/)
  assert.doesNotMatch(app, /prepareSimulationForRcaHandoff|retainRcaSimulationHandoff|simulationRcaHandoff|rcaContext=/)
  assert.doesNotMatch(rca, /RcaSimulationHandoffContext|retainRcaSimulationHandoff|createRcaSimulationHandoffContext/)
  assert.match(rca, /migrateLegacyCandidateRcaRecords/,
    'retired visible handoff code does not remove legacy RCA session migration')

  console.log('Direct Current-first Simulation initialization and legacy RCA compatibility verification passed')
} finally {
  await vite.close()
}
