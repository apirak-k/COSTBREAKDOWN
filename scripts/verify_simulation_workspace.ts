import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import './verify_simulation_dataset_overrides.ts'

const app = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8')
const store = readFileSync(resolve(process.cwd(), 'src/state/store.tsx'), 'utf8')

assert.match(app, /simulationStatesByProduct\[activeProductId\]/, 'Simulation state remains scoped by product')
assert.match(app, /saveToSession\(STORAGE_KEYS\.SIMULATION_STATES, simulationStatesByProduct\)/,
  'role-keyed Simulation state remains session-persisted per product')
assert.match(app, /activeTab === 'simulation'[\s\S]*?<SimulationPage/, 'Simulation remains reachable as its own module')
assert.match(app, /const effectiveDatasets = useMemo\(\(\) => \(\{[\s\S]*reference: getEffectiveSimulationDataset\(masterDataSnapshots, simulationState, 'reference'\)[\s\S]*current: getEffectiveSimulationDataset\(masterDataSnapshots, simulationState, 'current'\)[\s\S]*custom: getEffectiveSimulationDataset\(masterDataSnapshots, simulationState, 'custom'\)/,
  'the Simulation story context derives all three effective role datasets from their matching Working sources')
assert.doesNotMatch(app, /rca-simulation|selectedCandidateKey|trialHandoffLetter|selectedScenarioLetter/,
  'Simulation routing does not depend on legacy RCA, Trial, or A/B state')

const sendStart = store.indexOf('const sendSimulationSnapshotsToMasterData =')
const sendAdapterStart = store.indexOf('const sendSimulationSnapshotToMasterData =', sendStart)
const sendAdapterEnd = store.indexOf('const updateMasterDataDatasetSizing =', sendAdapterStart)
assert.ok(sendStart >= 0 && sendAdapterStart > sendStart && sendAdapterEnd > sendAdapterStart,
  'same-role Simulation Send has bounded store adapters')
const sendAllBody = store.slice(sendStart, sendAdapterStart)
const sendOneBody = store.slice(sendAdapterStart, sendAdapterEnd)
assert.match(sendAllBody, /\['reference', 'current', 'custom'\]/,
  'the store prepares all three role mappings from the requested payload')
assert.match(sendAllBody, /for \(const role of roles\)[\s\S]*?isMasterDataSnapshotChangeValid\(currentDataset, nextDataset\)[\s\S]*?return false/,
  'every requested dataset is validated before any session commit')
assert.ok(sendAllBody.indexOf('isMasterDataSnapshotChangeValid(currentDataset, nextDataset)')
  < sendAllBody.indexOf('commitMasterDataAllWorkingDatasets(session, updated)'),
'Send All validates role payloads before its single atomic Working-data commit')
assert.match(sendAllBody, /if \(roles\.length === 3\)\s*\{\s*commitMasterDataAllWorkingDatasets\(session, updated\)/,
  'Send All commits all three Working datasets as one operation')
assert.match(sendAllBody, /if \(roles\.length === 1\)\s*\{\s*commitMasterDataWorkingSession\(session, updated, roles\[0\]\)/,
  'a single-role Send commits only that destination')
assert.doesNotMatch(sendAllBody, /setMasterDataInitialResetBaseline|lastSavedMasterData|customLastSavedMasterData|lastSavedSnapshot/,
  'Send updates Working data without changing reset baselines or Last Saved')
assert.match(sendOneBody, /sendSimulationSnapshotsToMasterData\(\{ \[role\]: snapshot \}\)/,
  'the active Send adapter maps a source snapshot to the same Master role only')
assert.doesNotMatch(sendOneBody, /setMasterDataInitialResetBaseline|lastSavedMasterData|customLastSavedMasterData/,
  'the single-role adapter does not publish Last Saved or reset-baseline changes')

// This write-boundary check is source-based; no AppStore provider is mounted here.
console.log('PASS: Simulation workspace and source-level Send write boundary')
