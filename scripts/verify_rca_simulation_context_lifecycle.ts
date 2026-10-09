import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { retainRcaSimulationHandoff } from '../src/state/rca-cases.ts'
import type { RcaSimulationHandoffContext } from '../src/state/rca-cases.ts'

const context: RcaSimulationHandoffContext = {
  caseId: 'case-lifecycle',
  candidateKeys: ['bom:MAT-1', 'process:Process-A'],
  rootCause: 'Shared process change',
  action: 'Review the revised sequence'
}
const handoff = { productId: 'product-1', context }

assert.strictEqual(retainRcaSimulationHandoff(handoff, 'simulation', 'product-1'), handoff,
  'the active product retains RCA context while Simulation is open')

const afterLeavingSimulation = retainRcaSimulationHandoff(handoff, 'candidate', 'product-1')
assert.equal(afterLeavingSimulation, null, 'leaving Simulation clears RCA-only context')
assert.equal(retainRcaSimulationHandoff(afterLeavingSimulation, 'simulation', 'product-1'), null,
  'later direct Simulation entry cannot inherit stale RCA context')
assert.equal(retainRcaSimulationHandoff(handoff, 'simulation', 'product-2'), null,
  'switching product clears the prior product RCA context')
assert.equal(retainRcaSimulationHandoff(handoff, 'candidate', 'product-2'), null,
  'leaving Simulation and switching product both discard context')

const app = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8')
const store = readFileSync(resolve(process.cwd(), 'src/state/store.tsx'), 'utf8')
const handoffRoute = app.match(/const proceedFromRcaToSimulation = \(context: RcaSimulationHandoffContext\) => \{([\s\S]*?)\n  \}/)?.[1] ?? ''
assert.match(handoffRoute, /setSimulationRcaHandoff\(\{ productId: activeProductId, context \}\)/,
  'the RCA handoff route stores the Case context')
assert.match(handoffRoute, /setActiveTab\('simulation'\)/,
  'the explicit RCA action opens Simulation')
assert.match(app, /retainRcaSimulationHandoff\(/,
  'App routing uses the behaviorally tested context lifecycle transition')
assert.match(app, /<SimulationPage[\s\S]*?rcaContext=\{simulationRcaContext\}/,
  'Simulation receives only the currently scoped RCA context')

const reset = app.match(/const resetSimulation = \(\) => \{([\s\S]*?)\n  \}/)?.[1] ?? ''
assert.match(reset, /setSimulationStatesByProduct\(previous => \(\{/)
assert.match(reset, /\[activeProductId\]: createEmptySimulationState\(\)/)
assert.doesNotMatch(reset, /setProductSessions|setMasterData|masterDataSnapshots/)

assert.match(store, /const snapshotSourceFingerprint = useMemo\(\(\) => JSON\.stringify\(\[snapshotPair\.reference, snapshotPair\.current\]\)/)
assert.match(store, /selectedComparisonScope\?\.sourceFingerprint === snapshotSourceFingerprint/)
assert.match(store, /if \(selectedComparisonScope && !activeSelectedComparisonScope\) setSelectedComparisonScope\(null\)/)

console.log('RCA/Simulation context lifecycle verification passed')
