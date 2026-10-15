import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const app = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8')
const store = readFileSync(resolve(process.cwd(), 'src/state/store.tsx'), 'utf8')
const simulation = readFileSync(resolve(process.cwd(), 'src/features/simulation/SimulationPage.tsx'), 'utf8')
const rcaCases = readFileSync(resolve(process.cwd(), 'src/state/rca-cases.ts'), 'utf8')

assert.doesNotMatch(app + simulation, /prepareSimulationForRcaHandoff|retainRcaSimulationHandoff|simulationRcaHandoff|rcaContext=/,
  'visible Simulation has no active RCA handoff state')
assert.doesNotMatch(rcaCases, /RcaSimulationHandoffContext|retainRcaSimulationHandoff|createRcaSimulationHandoffContext/,
  'the unused RCA-to-Simulation handoff helpers are retired')
assert.match(app, /activeTab === 'simulation' && !reconciledSimulationState\.snapshot[\s\S]*?startSimulationFrom\('current'/,
  'direct Simulation entry initializes a fresh Current-based SIM when required')
assert.match(app, /simulationStatesByProduct\[activeProductId\]/,
  'Simulation state remains scoped to the active product')
assert.match(app, /retainSimulationStatesForProducts\(previous, liveProductIds\)/,
  'deleted products are pruned from Simulation state')
assert.match(app, /activeTab === 'simulation'[\s\S]*?<SimulationPage/,
  'Simulation remains directly available through normal product navigation')

assert.match(store, /snapshotPair\.reference, snapshotPair\.current/,
  'Reference/Current edit history remains integrated with Master Data')
assert.match(store, /selectedComparisonScope\?\.sourceFingerprint === snapshotSourceFingerprint/)
assert.match(store, /if \(selectedComparisonScope && !activeSelectedComparisonScope\) setSelectedComparisonScope\(null\)/)

console.log('Direct Simulation lifecycle and retired RCA handoff verification passed')
