import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  createRcaSimulationPageState,
  createScenarioDrafts,
  getRcaSimulationStateForRevision,
  updateRcaSimulationStateByProduct,
  updateScenarioInputValue
} from '../src/features/rca-simulation/scenario-draft'
import { markMasterDataChanged } from '../src/state/master-data-revision'

const bomInputKey = JSON.stringify(['bom', 'bom-1', 'price'])
const routingInputKey = JSON.stringify(['routing', 'rt-1', 'manning'])
const scenarioDrafts = updateScenarioInputValue(
  updateScenarioInputValue(createScenarioDrafts(), 'A', bomInputKey, '10'),
  'A',
  routingInputKey,
  '80'
)

assert.equal(scenarioDrafts[0].inputValues[bomInputKey], '10')
assert.equal(scenarioDrafts[0].inputValues[routingInputKey], '80')
assert.equal(scenarioDrafts[1].inputValues[bomInputKey], undefined)
assert.equal(createRcaSimulationPageState().selectedCandidateKey, null, 'RCA must wait for a human candidate selection')

const savedPageState = {
  ...createRcaSimulationPageState(3),
  selectedCandidateKey: 'candidate-1',
  trialHandoffLetter: 'B' as const,
  scenarioDraftsByCandidate: {
    'candidate-1': scenarioDrafts
  }
}
const pageStatesAfterFirstProduct = updateRcaSimulationStateByProduct({}, 'product-1', 3, () => savedPageState)
const pageStatesAfterSecondProduct = updateRcaSimulationStateByProduct(
  pageStatesAfterFirstProduct,
  'product-2',
  0,
  state => ({ ...state, selectedCandidateKey: 'candidate-2' })
)
assert.equal(pageStatesAfterSecondProduct['product-1'].selectedCandidateKey, 'candidate-1')
assert.equal(pageStatesAfterSecondProduct['product-1'].trialHandoffLetter, 'B')
assert.equal(pageStatesAfterSecondProduct['product-1'].scenarioDraftsByCandidate['candidate-1'][0].inputValues[bomInputKey], '10')
assert.equal(pageStatesAfterSecondProduct['product-2'].selectedCandidateKey, 'candidate-2')
assert.equal(getRcaSimulationStateForRevision(pageStatesAfterSecondProduct['product-1'], 3).selectedCandidateKey, 'candidate-1')

const stalePageState = getRcaSimulationStateForRevision(pageStatesAfterSecondProduct['product-1'], 4)
assert.equal(stalePageState.selectedCandidateKey, null, 'Replacing source data must clear the selected RCA candidate')
assert.equal(stalePageState.trialHandoffLetter, null, 'Replacing source data must clear the old Trial handoff')
assert.deepEqual(stalePageState.scenarioDraftsByCandidate, {}, 'Replacing source data must clear scenario drafts')

const pageStatesAfterDataReplacement = updateRcaSimulationStateByProduct(
  pageStatesAfterSecondProduct,
  'product-1',
  4,
  state => ({ ...state, selectedCandidateKey: 'candidate-2' })
)
assert.equal(pageStatesAfterDataReplacement['product-1'].selectedCandidateKey, 'candidate-2')
assert.equal(pageStatesAfterDataReplacement['product-1'].trialHandoffLetter, null)
assert.deepEqual(pageStatesAfterDataReplacement['product-1'].scenarioDraftsByCandidate, {})
assert.equal(markMasterDataChanged({ masterDataRevision: 8 }).masterDataRevision, 9)
assert.equal(markMasterDataChanged({}).masterDataRevision, 1)

const pageSource = readFileSync(resolve(process.cwd(), 'src/features/rca-simulation/RCASimulationPage.tsx'), 'utf8')
const selectorSource = readFileSync(resolve(process.cwd(), 'src/features/rca-simulation/components/CandidateSelector.tsx'), 'utf8')
const appSource = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8')
const storeSource = readFileSync(resolve(process.cwd(), 'src/state/store.tsx'), 'utf8')
const clearDatasetSource = readFileSync(resolve(process.cwd(), 'src/state/clear-master-data-dataset.ts'), 'utf8')

assert.equal(pageSource.includes('first controllable'), false, 'Simulation must not silently choose the first controllable driver')
assert.match(pageSource, /<CandidateSelector\b[\s\S]*?candidates=\{candidates\}/, 'RCA must receive the full Candidate Prioritization pool')
assert.match(selectorSource, /candidates\.map\s*\(/, 'RCA selector must expose the full candidate list')
assert.match(selectorSource, /candidateKey/, 'RCA selection must use candidate identity')
assert.doesNotMatch(pageSource, /selectedDriverKeys|getSelectedDrivers/, 'RCA must not depend on Ranking preselection')
assert.match(appSource, /loadFromSession\(STORAGE_KEYS\.RCA_SIMULATION_STATES/, 'RCA UI state must load from the current browser session')
assert.match(appSource, /saveToSession\(STORAGE_KEYS\.RCA_SIMULATION_STATES/, 'RCA UI state must be saved in session storage')
assert.match(appSource, /rcaSimulationStatesByProduct\[activeProductId\]/, 'RCA UI state must be isolated by product session')
assert.match(appSource, /activeSession\.masterDataRevision/, 'RCA UI state must be tied to its product master-data revision')
assert.match(storeSource, /changesMasterData \? markMasterDataChanged\(updated\)/, 'Legacy Product data edits must advance the source revision')
assert.match(storeSource, /function applyMasterDataSnapshotPair[\s\S]*markMasterDataChanged\(applySnapshotPairToSession\(session, pair\)\)/, 'Snapshot dataset mutations must advance the source revision')
assert.equal((storeSource.match(/\bapplySnapshotPairToSession\(/g) ?? []).length, 2, 'Snapshot writes must go through the versioned helper')
assert.match(clearDatasetSource, /markMasterDataChanged\(/, 'Clearing a comparison dataset must advance the source revision')
assert.match(appSource, /<RCASimulationPage\s+state=\{rcaSimulationState\}/, 'The router must restore its saved RCA state when the page remounts')
assert.doesNotMatch(pageSource, /useState\(/, 'RCA page state must live above the conditionally mounted page')
assert.match(pageSource, /state\.scenarioDraftsByCandidate/, 'Scenario drafts must remain isolated by selected candidate')

console.log('Simulation context verification passed')
