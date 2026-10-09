import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { CostSnapshot, MasterDataRole, SnapshotBOMItem, SnapshotRoutingStep, SnapshotWorkCenterRate } from '../src/core/types'
import { SimulationPage } from '../src/features/simulation/SimulationPage.tsx'
import {
  prepareSimulationForRcaHandoff,
  setSimulationEconomicInput,
  setSimulationFactors,
  simulationFactorId,
  startSimulationFrom
} from '../src/features/simulation/simulation-state.ts'
import type { SimulationWorkspaceState } from '../src/features/simulation/simulation-state.ts'
import { retainRcaSimulationHandoff } from '../src/state/rca-cases.ts'
import type { RcaSimulationHandoffContext } from '../src/state/rca-cases.ts'

function material(id: string, name: string, price: number): SnapshotBOMItem {
  return { id, itemCode: name, description: name, consumption: 1, unit: 'PC', price, loss: 0, confidence: {} }
}

function routingStep(id: string, name: string): SnapshotRoutingStep {
  return { id, processName: name, workCenterId: 'WC-1', manning: 1, capacity: 1, yield: 1, confidence: {} }
}

function rate(id: string): SnapshotWorkCenterRate {
  return { id, workCenterCode: 'WC-1', description: 'Assembly', laborRate: 10, burdenRate: 2, effectiveDate: '', confidence: {} }
}

function snapshot(id: string, price: number): CostSnapshot {
  return {
    id,
    product: { productCode: 'P-1', productDescription: 'Test Product', uom: 'PC', customer: '', effectiveDate: '' },
    effectiveDate: '',
    sourceRef: id,
    status: 'draft',
    rates: [rate(`${id}-wc`)],
    bom: [
      material(`${id}-bom-candidate`, 'Candidate Material', price),
      material(`${id}-bom-extra`, 'Additional Material', price + 1)
    ],
    routing: [
      routingStep(`${id}-process-candidate`, 'Candidate Process'),
      routingStep(`${id}-process-extra`, 'Additional Process')
    ]
  }
}

const sources: Record<MasterDataRole, CostSnapshot> = {
  reference: snapshot('reference', 9),
  current: snapshot('current', 10),
  custom: snapshot('custom', 12)
}
const economicInputs = {
  actionCost: '850',
  evaluationQuantity: '25',
  sellingPriceOverride: '42',
  sgaPercentOverride: '8'
}

for (const sourceRole of ['current', 'reference', 'custom'] as const) {
  const existing = startSimulationFrom(sourceRole, sources, '2026-10-09T00:00:00.000Z', economicInputs)
  const withEconomicEdits = setSimulationEconomicInput(existing, 'actionCost', '1250')
  const oldFactors = [
    simulationFactorId('bom', `${sourceRole}-bom-extra`),
    simulationFactorId('routing', `${sourceRole}-process-extra`)
  ]
  const previouslyActive = setSimulationFactors(withEconomicEdits, oldFactors)
  assert.equal(previouslyActive.sourceRole, sourceRole)
  assert.ok(previouslyActive.snapshot, `${sourceRole} starts with an active Parameter SIM snapshot`)
  assert.deepEqual(previouslyActive.selectedFactors, oldFactors, `${sourceRole} has old selected Factors before handoff`)

  const fresh = prepareSimulationForRcaHandoff(previouslyActive, sources)
  assert.equal(fresh.sourceRole, null, `${sourceRole} SIM source is discarded for a new RCA handoff`)
  assert.equal(fresh.snapshot, null, `${sourceRole} Parameter snapshot is cleared for a new RCA handoff`)
  assert.equal(fresh.basisFingerprint, null)
  assert.equal(fresh.startedAt, null)
  assert.deepEqual(fresh.selectedFactors, [], `${sourceRole} Factors do not carry into the new RCA handoff`)
  assert.deepEqual(fresh.economicInputs, { ...economicInputs, actionCost: '1250' },
    `${sourceRole} Parameter reset preserves the existing Economic inputs deterministically`)
  assert.ok(previouslyActive.snapshot, 'resetting the handoff state does not mutate the prior SIM object')
}

const rcaContext: RcaSimulationHandoffContext = {
  caseId: 'case-rca-1',
  candidateKeys: ['process:current-process-candidate'],
  rootCause: 'Shared process change',
  action: 'Review the revised sequence'
}

function renderSimulation(state: SimulationWorkspaceState, context: RcaSimulationHandoffContext | null) {
  return renderToStaticMarkup(React.createElement(SimulationPage, {
    state,
    referenceSnapshot: sources.reference,
    currentSnapshot: sources.current,
    rcaContext: context,
    onStartFrom() {},
    onReset() {},
    onSelectFactors() {},
    onUpdateParameter() {},
    onUpdateEconomicInput() {}
  }))
}

const handoffStartMarkup = renderSimulation(prepareSimulationForRcaHandoff(
  setSimulationFactors(
    startSimulationFrom('custom', sources, '2026-10-09T00:00:00.000Z', economicInputs),
    [simulationFactorId('bom', 'custom-bom-extra')]
  ),
  sources
), rcaContext)
assert.match(handoffStartMarkup, /RCA Case context/)
assert.match(handoffStartMarkup, /case-rca-1/)
const sourceButtons = [...handoffStartMarkup.matchAll(/<button\b[^>]*>(.*?)<\/button>/g)]
  .filter(([, label]) => label?.startsWith('Start SIM From '))
assert.deepEqual(sourceButtons.map(([, label]) => label), [
  'Start SIM From Current', 'Start SIM From Reference', 'Start SIM From Custom'
], 'RCA handoff presents Current first and leaves Reference and Custom choices available')
for (const [buttonMarkup] of sourceButtons) {
  assert.doesNotMatch(buttonMarkup, /\sdisabled(?:\s|=|>)/, 'all RCA handoff source choices remain enabled')
}

const currentStart = startSimulationFrom('current', sources, '2026-10-09T00:01:00.000Z', economicInputs)
const additionalMaterial = simulationFactorId('bom', 'current-bom-extra')
const additionalProcess = simulationFactorId('routing', 'current-process-extra')
const selectedAdditionalFactors = setSimulationFactors(currentStart, [additionalMaterial, additionalProcess])
assert.deepEqual(selectedAdditionalFactors.selectedFactors, [additionalMaterial, additionalProcess],
  'additional Material and Process records can be selected outside the RCA Candidate set')
const factorMarkup = renderSimulation(selectedAdditionalFactors, rcaContext)
for (const factor of [
  'Select Material factor Additional Material',
  'Select Process factor Additional Process',
  'Select Material factor Candidate Material',
  'Select Process factor Candidate Process'
]) {
  const checkbox = factorMarkup.match(new RegExp(`<input\\b(?=[^>]*aria-label="${factor}")[^>]*>`))?.[0]
  assert.ok(checkbox, `${factor} remains available in the RCA handoff SIM`)
  assert.match(checkbox, /type="checkbox"/)
  assert.doesNotMatch(checkbox, /\sdisabled(?:\s|=|>)/, `${factor} remains selectable`)
}

const scopedHandoff = { productId: 'product-1', context: rcaContext }
assert.strictEqual(retainRcaSimulationHandoff(scopedHandoff, 'simulation', 'product-1'), scopedHandoff,
  'RCA context remains available while its product is in Simulation')
const afterLeavingSimulation = retainRcaSimulationHandoff(scopedHandoff, 'candidate', 'product-1')
assert.equal(afterLeavingSimulation, null, 'leaving Simulation expires RCA-only context')
assert.equal(retainRcaSimulationHandoff(afterLeavingSimulation, 'simulation', 'product-1'), null,
  'a later direct Simulation entry cannot inherit stale RCA-only context')
assert.equal(retainRcaSimulationHandoff(scopedHandoff, 'simulation', 'product-2'), null,
  'switching products while Simulation is active clears the previous product RCA context')

const appSource = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8')
assert.match(appSource, /prepareSimulationForRcaHandoff\(/,
  'the App handoff route uses the tested fresh Parameter-SIM transition')
assert.match(appSource, /retainRcaSimulationHandoff\(/,
  'the App lifecycle uses the tested RCA-context expiry transition')

console.log('RCA-to-Simulation fresh-start behavioral verification passed')
