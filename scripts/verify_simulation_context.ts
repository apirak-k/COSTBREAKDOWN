import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  createRcaSimulationPageState,
  createScenarioDrafts,
  getRcaSimulationStateForRevision,
  retainRcaSimulationStatesForProducts,
  updateRcaSimulationStateByProduct,
  updateScenarioInputValue
} from '../src/features/rca-simulation/scenario-draft'
import * as masterDataRevision from '../src/state/master-data-revision'
import type { RcaSimulationPageState } from '../src/features/rca-simulation/scenario-draft'

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
assert.equal(createRcaSimulationPageState().selectedScenarioLetter, null, 'Simulation must wait for a human scenario selection')

const savedPageState = {
  ...createRcaSimulationPageState(3),
  selectedCandidateKey: 'candidate-1',
  selectedScenarioLetter: 'A' as const,
  trialHandoffLetter: 'B' as const,
  scenarioDraftsByCandidate: {
    'candidate-1': scenarioDrafts
  }
}
const legacyCPageState = {
  ...savedPageState,
  selectedScenarioLetter: 'C',
  trialHandoffLetter: 'C',
  scenarioDraftsByCandidate: {
    'candidate-1': [
      ...scenarioDrafts,
      { letter: 'C', label: 'Legacy C', inputValues: {}, economicsInputs: { fixedInvestment: '', variableAddedCostPerPiece: '', evaluationVolume: '' } }
    ]
  }
} as unknown as RcaSimulationPageState
const migratedLegacyPageState = getRcaSimulationStateForRevision(legacyCPageState, 3)
assert.equal(migratedLegacyPageState.trialHandoffLetter, null, 'Legacy Scenario C handoff state must be discarded')
assert.equal(migratedLegacyPageState.selectedScenarioLetter, null, 'Legacy Scenario C selection must be discarded')
assert.deepEqual(
  migratedLegacyPageState.scenarioDraftsByCandidate['candidate-1']?.map(draft => draft.letter),
  ['A', 'B'],
  'Legacy persisted Scenario C drafts must be removed'
)
const pageStatesAfterFirstProduct = updateRcaSimulationStateByProduct({}, 'product-1', 3, () => savedPageState)
const pageStatesAfterSecondProduct = updateRcaSimulationStateByProduct(
  pageStatesAfterFirstProduct,
  'product-2',
  0,
  state => ({ ...state, selectedCandidateKey: 'candidate-2' })
)
assert.equal(pageStatesAfterSecondProduct['product-1'].selectedCandidateKey, 'candidate-1')
assert.equal(pageStatesAfterSecondProduct['product-1'].trialHandoffLetter, 'B')
assert.equal(pageStatesAfterSecondProduct['product-1'].selectedScenarioLetter, 'A')
assert.equal(pageStatesAfterSecondProduct['product-1'].scenarioDraftsByCandidate['candidate-1'][0].inputValues[bomInputKey], '10')
assert.equal(pageStatesAfterSecondProduct['product-2'].selectedCandidateKey, 'candidate-2')
assert.strictEqual(
  retainRcaSimulationStatesForProducts(pageStatesAfterSecondProduct, new Set(['product-1', 'product-2'])),
  pageStatesAfterSecondProduct,
  'Existing product state must be preserved when its session still exists'
)
const statesWithLegacyCProduct = { ...pageStatesAfterSecondProduct, 'product-2': legacyCPageState }
const normalizedProductStates = retainRcaSimulationStatesForProducts(
  statesWithLegacyCProduct,
  new Set(['product-1', 'product-2'])
)
assert.deepEqual(
  normalizedProductStates['product-2'].scenarioDraftsByCandidate['candidate-1']?.map(draft => draft.letter),
  ['A', 'B'],
  'Legacy Scenario C state must be normalized for inactive products too'
)
const pageStatesAfterProductDeletion = retainRcaSimulationStatesForProducts(pageStatesAfterSecondProduct, new Set(['product-2']))
assert.deepEqual(Object.keys(pageStatesAfterProductDeletion), ['product-2'], 'Deleting a product must remove its orphan RCA state')
assert.strictEqual(pageStatesAfterProductDeletion['product-2'], pageStatesAfterSecondProduct['product-2'])
assert.equal(getRcaSimulationStateForRevision(pageStatesAfterSecondProduct['product-1'], 3).selectedCandidateKey, 'candidate-1')

const stalePageState = getRcaSimulationStateForRevision(pageStatesAfterSecondProduct['product-1'], 4)
assert.equal(stalePageState.selectedCandidateKey, null, 'Replacing source data must clear the selected RCA candidate')
assert.equal(stalePageState.trialHandoffLetter, null, 'Replacing source data must clear the old Trial handoff')
assert.equal(stalePageState.selectedScenarioLetter, null, 'Replacing source data must clear the selected scenario')
assert.deepEqual(stalePageState.scenarioDraftsByCandidate, {}, 'Replacing source data must clear scenario drafts')

const pageStatesAfterDataReplacement = updateRcaSimulationStateByProduct(
  pageStatesAfterSecondProduct,
  'product-1',
  4,
  state => ({ ...state, selectedCandidateKey: 'candidate-2' })
)
assert.equal(pageStatesAfterDataReplacement['product-1'].selectedCandidateKey, 'candidate-2')
assert.equal(pageStatesAfterDataReplacement['product-1'].trialHandoffLetter, null)
assert.equal(pageStatesAfterDataReplacement['product-1'].selectedScenarioLetter, null)
assert.deepEqual(pageStatesAfterDataReplacement['product-1'].scenarioDraftsByCandidate, {})
assert.equal(masterDataRevision.markMasterDataChanged({ masterDataRevision: 8 }).masterDataRevision, 9)
assert.equal(masterDataRevision.markMasterDataChanged({}).masterDataRevision, 1)

const revisionBasePair = {
  reference: {
    id: 'reference', product: { productCode: 'P-1', productDescription: 'Part', uom: 'PC', customer: '', effectiveDate: '' },
    effectiveDate: '', sourceRef: 'fixture', status: 'draft', rates: [], bom: [], routing: []
  },
  current: {
    id: 'current', product: { productCode: 'P-1', productDescription: 'Part', uom: 'PC', customer: '', effectiveDate: '' },
    effectiveDate: '', sourceRef: 'fixture', status: 'draft', rates: [{
      id: 'rate-1', workCenterCode: 'WC-1', description: 'Cutting', laborRate: 10, burdenRate: 5,
      effectiveDate: '', note: 'original note', additionalFields: { Note: 'original imported note', Shift: 'A' }, confidence: {}
    }], bom: [], routing: []
  }
}
const noteOnlyPair = {
  ...revisionBasePair,
  current: {
    ...revisionBasePair.current,
    remark: 'new remark',
    product: { ...revisionBasePair.current.product, note: 'new product note' },
    rates: [{ ...revisionBasePair.current.rates[0], note: 'new note', additionalFields: { Note: 'new imported note', Shift: 'A' } }]
  }
}
assert.equal(
  masterDataRevision.markMasterDataChangedForSnapshotPair({ masterDataRevision: 8 }, revisionBasePair, noteOnlyPair).masterDataRevision,
  8,
  'annotation-only changes must retain the Master Data revision'
)
const businessChangePair = {
  ...revisionBasePair,
  current: { ...revisionBasePair.current, rates: [{ ...revisionBasePair.current.rates[0], laborRate: 11 }] }
}
assert.equal(
  masterDataRevision.markMasterDataChangedForSnapshotPair({ masterDataRevision: 8 }, revisionBasePair, businessChangePair).masterDataRevision,
  9,
  'calculation input changes must advance the Master Data revision'
)
const placeholderChangePair = {
  ...revisionBasePair,
  current: { ...revisionBasePair.current, rates: [{ ...revisionBasePair.current.rates[0], isGeneratedSizingPlaceholder: true }] }
}
assert.equal(
  masterDataRevision.markMasterDataChangedForSnapshotPair({ masterDataRevision: 8 }, revisionBasePair, placeholderChangePair).masterDataRevision,
  9,
  'generated placeholder ownership changes must advance the Master Data revision'
)
const nullRatePair = {
  ...revisionBasePair,
  current: {
    ...revisionBasePair.current,
    rates: [{ ...revisionBasePair.current.rates[0], laborRate: null }]
  }
}
const infiniteRatePair = {
  ...revisionBasePair,
  current: {
    ...revisionBasePair.current,
    rates: [{ ...revisionBasePair.current.rates[0], laborRate: Number.POSITIVE_INFINITY }]
  }
}
const nanRatePair = {
  ...revisionBasePair,
  current: {
    ...revisionBasePair.current,
    rates: [{ ...revisionBasePair.current.rates[0], laborRate: Number.NaN }]
  }
}
assert.equal(
  masterDataRevision.markMasterDataChangedForSnapshotPair({ masterDataRevision: 8 }, nullRatePair, infiniteRatePair).masterDataRevision,
  9,
  'null-to-Infinity business changes must advance the Master Data revision'
)
assert.equal(
  masterDataRevision.markMasterDataChangedForSnapshotPair({ masterDataRevision: 8 }, nullRatePair, nanRatePair).masterDataRevision,
  9,
  'null-to-NaN business changes must advance the Master Data revision'
)

const pageSource = readFileSync(resolve(process.cwd(), 'src/features/rca-simulation/RCASimulationPage.tsx'), 'utf8')
const selectorSource = readFileSync(resolve(process.cwd(), 'src/features/rca-simulation/components/CandidateSelector.tsx'), 'utf8')
const appSource = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8')
const navbarSource = readFileSync(resolve(process.cwd(), 'src/shared/layout/Navbar.tsx'), 'utf8')
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
assert.match(appSource, /retainRcaSimulationStatesForProducts/, 'RCA state must be pruned when its ProductSession is deleted')
assert.match(appSource, /productSessions\.map\(session => session\.id\)/, 'RCA cleanup must use the current ProductSession ids')
assert.doesNotMatch(appSource, /DashboardPage|activeTab === 'dashboard'/, 'Dashboard must not remain a separate routed workflow')
assert.doesNotMatch(navbarSource, /id: 'dashboard'|label: 'Dashboard'/, 'Dashboard must not remain a separate navigation item')
assert.match(storeSource, /value === 'dashboard'\) return 'rca'/, 'sessions saved on the old Dashboard tab must open the consolidated Simulation workflow')
assert.match(storeSource, /changesMasterData \? markMasterDataChanged\(updated\)/, 'Legacy Product data edits must advance the source revision')
assert.match(pageSource, /const currentSnapshot = snapshotPair\.current/, 'Simulation calculations must start from the full Current snapshot')
assert.match(pageSource, /selectedCandidate && !isSelectedComparisonActive \? calculateScenarioCosts\(currentSnapshot, preparedDrafts\.drafts\)/, 'Simulation must wait until the Selected Scope has ended')
assert.match(storeSource, /function applyMasterDataSnapshotPair[\s\S]*markMasterDataChangedForSnapshotPair\(/, 'Snapshot dataset mutations must compare business data before advancing the source revision')
assert.equal((storeSource.match(/\bapplySnapshotPairToSession\(/g) ?? []).length, 2, 'Snapshot writes must go through the versioned helper')
assert.match(clearDatasetSource, /markMasterDataChanged\(/, 'Clearing a comparison dataset must advance the source revision')
assert.match(appSource, /<RCASimulationPage\s+state=\{rcaSimulationState\}/, 'The router must restore its saved RCA state when the page remounts')
assert.doesNotMatch(pageSource, /useState\(/, 'RCA page state must live above the conditionally mounted page')
assert.match(pageSource, /state\.scenarioDraftsByCandidate/, 'Scenario drafts must remain isolated by selected candidate')

assert.match(pageSource, /const selectCandidate = \(candidateKey: string \| null\) => \{[\s\S]*?if \(candidateKey\) clearSelectedComparison\(\)/, 'Choosing one Candidate ends the multi-finding scope before Simulation')
assert.match(pageSource, /if \(selectedCandidate && isSelectedComparisonActive\) clearSelectedComparison\(\)/, 'A Candidate already selected before RCA entry also ends the scope')
assert.doesNotMatch(pageSource, /selected BOM and Routing scope/, 'Simulation must not calculate from a selected-only product')
console.log('Simulation context verification passed')
