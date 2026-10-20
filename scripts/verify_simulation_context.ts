import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { CostSnapshot, MasterDataRole } from '../src/core/types'
import {
  createEmptySimulationState,
  getEffectiveSimulationDataset,
  omitSimulationViewState,
  omitSimulationViewStateMap,
  reconcileSimulationState,
  retainSimulationStatesForProducts,
  setSimulationActiveDataset,
  setSimulationComparison,
  setSimulationEconomicInput,
  setSimulationWorkingSelection
} from '../src/features/simulation/simulation-state.ts'
import { updateSimulationParameter } from '../src/features/simulation/simulation-engine.ts'

function snapshot(role: MasterDataRole, price: number, laborRate: number): CostSnapshot {
  return {
    id: role,
    product: { productCode: `P-${role}`, productDescription: role, uom: 'PC', customer: '', effectiveDate: '' },
    effectiveDate: '', sourceRef: role, status: 'draft',
    rates: [{ id: `rate-${role}`, workCenterCode: 'WC-1', description: role, laborRate, burdenRate: laborRate / 2, effectiveDate: '', confidence: {} }],
    bom: [{ id: `bom-${role}`, itemCode: 'MAT-1', description: 'Material', consumption: 1, unit: 'PC', price, loss: 0, confidence: {} }],
    routing: [{ id: `route-${role}`, processName: 'Process', workCenterId: 'WC-1', manning: 1, capacity: 10, yield: 1, confidence: {} }]
  }
}

const sources = {
  reference: snapshot('reference', 10, 100),
  current: snapshot('current', 20, 200),
  custom: snapshot('custom', 30, 300)
}
const state = updateSimulationParameter(
  createEmptySimulationState(sources), sources, sources.custom.bom[0].id, 'bom.price', 75, 'custom'
)
assert.deepEqual([state.activeDataset, state.comparisonBefore, state.comparisonAfter], ['custom', 'current', 'custom'],
  'fresh Simulation initializes to Custom and Current → Custom')
assert.equal(state.schemaVersion, 2)
assert.equal(getEffectiveSimulationDataset(sources, state, 'custom').snapshot.bom[0].price, 75)
assert.deepEqual(getEffectiveSimulationDataset(sources, state, 'custom').snapshot.rates, sources.custom.rates,
  'Custom Simulation keeps Custom Work Center rates')

const inSessionState = setSimulationWorkingSelection(
  setSimulationEconomicInput(
    setSimulationComparison(setSimulationActiveDataset(state, 'reference'), 'reference', 'current'),
    'fixedActionCost', '125', 'custom'
  ),
  sources,
  ['bom:bom-custom'],
  'custom'
)
assert.deepEqual(inSessionState.datasets.custom.workingSelection, ['bom:bom-custom'],
  'row selection remains available in the running application session')
const storedState = omitSimulationViewState(inSessionState) as Record<string, unknown>
const storedDatasets = storedState.datasets as Record<string, Record<string, unknown>>
assert.equal(Object.hasOwn(storedState, 'activeDataset'), false, 'active role is not persisted as view state')
assert.equal(Object.hasOwn(storedState, 'comparisonBefore'), false, 'comparison Before is not persisted as view state')
assert.equal(Object.hasOwn(storedState, 'comparisonAfter'), false, 'comparison After is not persisted as view state')
assert.equal(Object.hasOwn(storedDatasets.custom, 'workingSelection'), false, 'temporary row selection is not persisted')
const afterRefresh = reconcileSimulationState(storedState, sources)
assert.deepEqual([afterRefresh.activeDataset, afterRefresh.comparisonBefore, afterRefresh.comparisonAfter], ['custom', 'current', 'custom'],
  'full app initialization restores Simulation view defaults')
assert.deepEqual(afterRefresh.datasets.custom.workingSelection, [], 'full app initialization clears temporary row selection')
assert.equal(getEffectiveSimulationDataset(sources, afterRefresh, 'custom').snapshot.bom[0].price, 75,
  'browser refresh retains role-local parameter overrides')
assert.equal(afterRefresh.datasets.custom.economicInputs.fixedActionCost, '125',
  'browser refresh retains economic working inputs')
const storedStateMap = omitSimulationViewStateMap({ product: inSessionState })
assert.equal(Object.hasOwn(storedStateMap.product as Record<string, unknown>, 'activeDataset'), false,
  'the per-product storage projection also omits Simulation view context')

const changedCurrentSources = { ...sources, current: { ...sources.current, sourceRef: 'changed-current' } }
const reconciled = reconcileSimulationState(state, changedCurrentSources)
assert.deepEqual([reconciled.activeDataset, reconciled.comparisonBefore, reconciled.comparisonAfter], ['custom', 'current', 'custom'],
  'basis reconciliation preserves a valid saved comparison context')
assert.equal(getEffectiveSimulationDataset(changedCurrentSources, reconciled, 'current').snapshot.bom[0].price, 20,
  'a changed Current Master basis resets only Current overrides')
assert.equal(getEffectiveSimulationDataset(changedCurrentSources, reconciled, 'custom').snapshot.bom[0].price, 75,
  'a changed Current Master basis preserves Custom overrides')
assert.equal(getEffectiveSimulationDataset(changedCurrentSources, reconciled, 'reference').snapshot.bom[0].price, 10,
  'a changed Current Master basis preserves Reference')

const products = { p1: reconciled, p2: createEmptySimulationState(changedCurrentSources) }
const retained = retainSimulationStatesForProducts(products, new Set(['p1']))
assert.deepEqual(Object.keys(retained), ['p1'], 'deleted products do not retain Simulation state')
assert.strictEqual(retained.p1, reconciled, 'a retained product keeps its independent role-keyed state')
const invalidContext = reconcileSimulationState({ ...state, activeDataset: 'simulation', comparisonBefore: 'bad', comparisonAfter: null } as never, sources)
assert.deepEqual([invalidContext.activeDataset, invalidContext.comparisonBefore, invalidContext.comparisonAfter], ['custom', 'current', 'custom'],
  'invalid/fresh reconciliation fallbacks use the canonical default context')

const app = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8')
const simulationPage = readFileSync(resolve(process.cwd(), 'src/features/simulation/SimulationPage.tsx'), 'utf8')
assert.match(app, /simulationStatesByProduct\[activeProductId\]/, 'Simulation state is scoped by active product')
assert.match(app, /activeTab === 'simulation'[\s\S]*?<SimulationPage/, 'Simulation is reachable as its own module')
assert.match(app, /const effectiveDatasets = useMemo\(\(\) => \(\{[\s\S]*reference: getEffectiveSimulationDataset\(masterDataSnapshots, simulationState, 'reference'\)[\s\S]*current: getEffectiveSimulationDataset\(masterDataSnapshots, simulationState, 'current'\)[\s\S]*custom: getEffectiveSimulationDataset\(masterDataSnapshots, simulationState, 'custom'\)/,
  'Simulation graph context derives the effective Reference, Current, and Custom Working datasets')
assert.match(app, /getActiveSimulationDataset\(masterDataSnapshots, simulationState\)/,
  'the active view is derived from the role-keyed Simulation state and latest Working sources')
assert.match(app, /const role = simulationState\.activeDataset[\s\S]*?updateSimulationState\(role, state => updateSimulationParameter/,
  'parameter edits explicitly target activeDataset')
assert.match(app, /onUpdateEconomicInput=\{updateEconomicInput\}[\s\S]*?onBeginEdit=\{beginSimulationEdit\}/,
  'Simulation callbacks route economic updates and history boundaries through explicit roles')
assert.match(simulationPage, /onUpdate=\{\(field, value\) => onUpdateEconomicInput\(analysisAfterDataset\.role, field, value\)\}/,
  'Business/Economic inputs explicitly target the effective comparisonAfter dataset')
assert.match(simulationPage, /onBatchSizeChange=\{value => onUpdateEconomicInput\(analysisAfterDataset\.role, 'batchSize', value\)\}/,
  'Break-even graph Batch Size edits target comparisonAfter')
assert.match(simulationPage, /calculateParameterSimulation\(analysisBeforeDataset\.snapshot, analysisAfterDataset\.snapshot\)/,
  'Result and Economic calculations use the effective comparison pair')
assert.match(simulationPage, /<ComparisonRoleSelector side="Before"[\s\S]*?<ComparisonRoleSelector side="After"/,
  'Result uses the shared Before and After selectors')
assert.match(simulationPage, /beforeRole=\{analysisBeforeDataset\.role\}[\s\S]*?afterRole=\{analysisAfterDataset\.role\}[\s\S]*?beforeCost=\{analysisResult\.beforeCost\}[\s\S]*?afterCost=\{analysisResult\.afterCost\}/,
  'the Result panel displays the selected role names and effective Before/After costs')
assert.match(simulationPage, /onBeginEdit=\{\(\) => onBeginEdit\(state\.role\)\}/,
  'parameter edit history explicitly targets the active role')
assert.match(app, /simulationHistoryRolesByProduct\[activeProductId\] \?\? simulationState\.activeDataset/,
  'Global Simulation Undo/Redo follows the last edited role, falling back to activeDataset')
assert.match(app, /const currentRole = committed\?\.recorded[\s\S]*?simulationHistoryRolesByProduct\[activeProductId\]/,
  'activeDataset changes do not reinterpret the role owning an existing history entry')
assert.match(app, /const role = current\.activeDataset[\s\S]*?resetSimulationParameters\(current, sources\)/,
  'Reset scope remains activeDataset even when comparisonAfter differs')
assert.match(app, /const activeDataset = current\.activeDataset[\s\S]*?prepareSimulationSend\(current, masterDataSnapshots\)[\s\S]*?sendSimulationSnapshotToMasterData\(activeDataset, payload\.snapshot\)/,
  'Send uses only the active Simulation role and sends to that same Master Data role')
assert.match(simulationPage, /<SimulationStoryGraph[\s\S]*?activeRole=\{state\.role\}[\s\S]*?onSelectActiveDataset=\{onSelectActiveDataset\}/,
  'graph dataset labels select the active Simulation role')
assert.doesNotMatch(simulationPage, /Edit dataset|<Pencil/,
  'the final Simulation UI has no separate active-dataset selector')
assert.match(simulationPage, /label="Send"[\s\S]*?onPrimary=\{onSend\}/,
  'Simulation exposes the exact Send primary action for the active role')
assert.match(simulationPage, /label="Reset"[\s\S]*?onPrimary=\{onReset\}/,
  'Simulation exposes the Reset primary action for the active role')
assert.match(simulationPage, /secondaryLabel="Send all datasets"[\s\S]*?onSecondary=\{onSendAll\}/,
  'the Send secondary action is wired to the all-role handler')
assert.match(simulationPage, /secondaryLabel="Reset all"[\s\S]*?onSecondary=\{onResetAll\}/,
  'the Reset secondary action uses the exact Reset all label and all-role handler')
assert.doesNotMatch(simulationPage, /label="Send to"|onSendTo\(/,
  'Simulation does not offer an arbitrary Send destination')
assert.doesNotMatch(app, /rca-simulation|selectedCandidateKey|trialHandoffLetter|selectedScenarioLetter/,
  'Simulation routing does not depend on legacy RCA, Trial, or A/B state')

console.log('PASS: Independent Simulation context, role-scoped reconciliation, and product retention')
