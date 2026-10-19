import assert from 'node:assert/strict'
import type { CostSnapshot, MasterDataRole } from '../src/core/types'
import {
  createEmptySimulationState,
  getActiveSimulationDataset,
  getEffectiveSimulationDataset,
  prepareSimulationSend,
  prepareSimulationSendAll,
  reconcileSimulationState,
  resetAllSimulationParameters,
  resetSimulationParameters,
  retainSimulationStatesForProducts,
  setSimulationActiveDataset,
  setSimulationComparison,
  setSimulationEconomicInput
} from '../src/features/simulation/simulation-state.ts'
import { calculateParameterSimulation, updateSimulationParameter } from '../src/features/simulation/simulation-engine.ts'
import { calculateEconomicSimulation } from '../src/features/simulation/simulation-economics.ts'

const roles: MasterDataRole[] = ['reference', 'current', 'custom']

function snapshot(role: MasterDataRole, index: number): CostSnapshot {
  return {
    id: `master-${role}`,
    product: {
      productCode: `PRODUCT-${role.toUpperCase()}`,
      productDescription: `${role} product`,
      uom: 'PC',
      customer: `${role} customer`,
      effectiveDate: `2026-10-${10 + index}`,
      sellingPrice: 100 + index,
      sgaPercent: 8 + index
    },
    effectiveDate: `2026-10-${10 + index}`,
    sourceRef: `source-${role}`,
    status: 'active',
    rates: [{
      id: `rate-${role}`,
      workCenterCode: 'WC-1',
      description: `${role} Work Center`,
      laborRate: 10 + index * 10,
      burdenRate: 5 + index * 5,
      effectiveDate: `2026-10-${10 + index}`,
      confidence: {}
    }],
    bom: [{
      id: `bom-${role}`,
      itemCode: 'MAT-1',
      description: 'Shared material identity',
      consumption: 2 + index,
      unit: 'PC',
      price: 10 + index * 10,
      loss: 0,
      confidence: {}
    }],
    routing: [{
      id: `routing-${role}`,
      processName: 'Shared assembly identity',
      workCenterId: 'WC-1',
      manning: 1 + index,
      capacity: 10 + index,
      yield: 1,
      confidence: {}
    }]
  }
}

const sources: Record<MasterDataRole, CostSnapshot> = {
  reference: snapshot('reference', 0),
  current: snapshot('current', 1),
  custom: snapshot('custom', 2)
}
const overridePrice: Record<MasterDataRole, number> = {
  reference: 81,
  current: 92,
  custom: 103
}

function withOverrides(sourceData = sources) {
  let state = createEmptySimulationState(sourceData)
  for (const role of roles) {
    state = updateSimulationParameter(
      state, sourceData, sourceData[role].bom[0].id, 'bom.price', overridePrice[role], role
    )
  }
  return state
}

let state = withOverrides()
for (const role of roles) {
  const effective = getEffectiveSimulationDataset(sources, state, role)
  assert.equal(effective.snapshot.bom[0].price, overridePrice[role], `${role} keeps its own parameter override`)
  assert.deepEqual(effective.snapshot.rates, sources[role].rates, `${role} keeps its own Work Center rates`)
  assert.equal(effective.snapshot.product.productCode, sources[role].product.productCode, `${role} keeps its own product metadata`)
}
assert.deepEqual(roles.map(role => sources[role].bom[0].price), [10, 20, 30],
  'editing Simulation parameters does not mutate any Master Working source')

const activeCurrent = setSimulationActiveDataset(createEmptySimulationState(sources), 'current')
const activeEdited = updateSimulationParameter(
  activeCurrent, sources, sources.current.bom[0].id, 'bom.price', 77
)
assert.equal(getEffectiveSimulationDataset(sources, activeEdited, 'current').snapshot.bom[0].price, 77,
  'an omitted role edits activeDataset')
assert.equal(getEffectiveSimulationDataset(sources, activeEdited, 'reference').snapshot.bom[0].price, sources.reference.bom[0].price,
  'editing active Current leaves Reference unchanged')
assert.equal(getEffectiveSimulationDataset(sources, activeEdited, 'custom').snapshot.bom[0].price, sources.custom.bom[0].price,
  'editing active Current leaves Custom unchanged')

const currentActiveCustomAfter = setSimulationComparison(activeCurrent, 'reference', 'custom')
const currentParameterEdit = updateSimulationParameter(
  currentActiveCustomAfter, sources, sources.current.bom[0].id, 'bom.price', 78, 'current'
)
const currentEconomicBefore = getEffectiveSimulationDataset(sources, currentParameterEdit, 'current').economicInputs
const customEconomicEdit = setSimulationEconomicInput(currentParameterEdit, 'sellingPriceOverride', '777', 'custom')
const customEconomicState = setSimulationEconomicInput(customEconomicEdit, 'sgaPercentOverride', '17', 'custom')
assert.equal(getEffectiveSimulationDataset(sources, customEconomicState, 'current').snapshot.bom[0].price, 78,
  'active Current parameter edits remain in Current while After is Custom')
assert.deepEqual(getEffectiveSimulationDataset(sources, customEconomicState, 'current').economicInputs, currentEconomicBefore,
  'editing Custom Business inputs leaves Current economic state untouched')
assert.equal(getEffectiveSimulationDataset(sources, customEconomicState, 'custom').economicInputs.sellingPriceOverride, '777',
  'Business/Economic edits explicitly target comparisonAfter')
assert.equal(getEffectiveSimulationDataset(sources, customEconomicState, 'custom').economicInputs.sgaPercentOverride, '17')

const activeReference = setSimulationActiveDataset(customEconomicState, 'reference')
assert.equal(activeReference.comparisonBefore, 'reference')
assert.equal(activeReference.comparisonAfter, 'custom', 'changing activeDataset does not move the analysis pair')
assert.deepEqual(getEffectiveSimulationDataset(sources, activeReference, activeReference.comparisonAfter).economicInputs,
  getEffectiveSimulationDataset(sources, customEconomicState, 'custom').economicInputs,
  'changing activeDataset preserves the After role and its Economic draft')

const currentAfter = setSimulationComparison(activeReference, 'reference', 'current')
assert.deepEqual(getEffectiveSimulationDataset(sources, currentAfter, 'current').economicInputs, currentEconomicBefore,
  'changing comparisonAfter changes the Business/Economic owner to Current')
assert.equal(getEffectiveSimulationDataset(sources, currentAfter, 'custom').economicInputs.sellingPriceOverride, '777',
  'switching After away from Custom preserves its independent draft')
const customAfterAgain = setSimulationComparison(currentAfter, 'reference', 'custom')
const customAnalysis = calculateParameterSimulation(
  getEffectiveSimulationDataset(sources, customAfterAgain, customAfterAgain.comparisonBefore).snapshot,
  getEffectiveSimulationDataset(sources, customAfterAgain, customAfterAgain.comparisonAfter).snapshot
)
const customEconomics = calculateEconomicSimulation(
  getEffectiveSimulationDataset(sources, customAfterAgain, customAfterAgain.comparisonAfter).snapshot,
  customAnalysis.afterCost,
  customAnalysis.parameterSavingPerPiece,
  getEffectiveSimulationDataset(sources, customAfterAgain, customAfterAgain.comparisonAfter).economicInputs
)
assert.equal(customEconomics.business.sellingPrice, 777, 'Business calculations use After Selling Price')
assert.equal(customEconomics.business.sgaPercent, 17, 'Business calculations use After SG&A')
assert.equal(customEconomics.business.operatingProfitPerPiece,
  777 - customAnalysis.afterCost.total! - 777 * 0.17,
  'Business OP uses the After effective Standard Cost')

for (const changedRole of roles) {
  const changedMaster = {
    ...sources[changedRole],
    bom: [{ ...sources[changedRole].bom[0], price: sources[changedRole].bom[0].price! + 40 }]
  }
  const changedSources = { ...sources, [changedRole]: changedMaster }
  const rebased = reconcileSimulationState(state, changedSources)
  assert.equal(getEffectiveSimulationDataset(changedSources, rebased, changedRole).snapshot.bom[0].price,
    changedMaster.bom[0].price, `a Master ${changedRole} edit rebases that role's stale override`)
  for (const unaffectedRole of roles.filter(role => role !== changedRole)) {
    assert.equal(getEffectiveSimulationDataset(changedSources, rebased, unaffectedRole).snapshot.bom[0].price,
      overridePrice[unaffectedRole], `rebasing ${changedRole} preserves ${unaffectedRole}'s override`)
  }
}

const activeCustom = setSimulationActiveDataset(state, 'custom')
assert.equal(activeCustom.activeDataset, 'custom')
assert.deepEqual(
  [getActiveSimulationDataset(sources, activeCustom).role, getActiveSimulationDataset(sources, activeCustom).snapshot.bom[0].price],
  ['custom', overridePrice.custom],
  'active dataset resolves to its effective Custom snapshot'
)
for (const before of roles) {
  for (const after of roles) {
    const compared = reconcileSimulationState(setSimulationComparison(activeCustom, before, after), sources)
    assert.equal(compared.comparisonBefore, before, `${before} remains a valid comparison Before source`)
    assert.equal(compared.comparisonAfter, after, `${after} remains a valid comparison After source`)
    assert.equal(compared.activeDataset, 'custom', 'comparison selection remains independent of the active editor dataset')
  }
}

const activeCurrentWithOverrides = setSimulationActiveDataset(state, 'current')
const resetActive = resetSimulationParameters(activeCurrentWithOverrides, sources)
assert.equal(getEffectiveSimulationDataset(sources, resetActive, 'current').snapshot.bom[0].price, sources.current.bom[0].price,
  'Reset clears the active Current override back to Current Working')
assert.equal(getEffectiveSimulationDataset(sources, resetActive, 'reference').snapshot.bom[0].price, overridePrice.reference,
  'Reset leaves Reference overrides intact')
assert.equal(getEffectiveSimulationDataset(sources, resetActive, 'custom').snapshot.bom[0].price, overridePrice.custom,
  'Reset leaves Custom overrides intact')
const resetWithCustomAfter = resetSimulationParameters(setSimulationComparison(activeCurrentWithOverrides, 'reference', 'custom'), sources)
assert.equal(getEffectiveSimulationDataset(sources, resetWithCustomAfter, 'current').snapshot.bom[0].price, sources.current.bom[0].price,
  'Reset still follows active Current when comparisonAfter is Custom')
assert.equal(getEffectiveSimulationDataset(sources, resetWithCustomAfter, 'custom').snapshot.bom[0].price, overridePrice.custom,
  'After Custom does not change Reset scope')

const resetAll = resetAllSimulationParameters(activeCurrentWithOverrides, sources)
for (const role of roles) {
  assert.deepEqual(getEffectiveSimulationDataset(sources, resetAll, role).snapshot, sources[role],
    `Reset All clears ${role} overrides to its latest Master Working dataset`)
}

for (const activeRole of roles) {
  const roleState = setSimulationActiveDataset(state, activeRole)
  const payload = prepareSimulationSend(roleState, sources)
  assert.equal(payload.role, activeRole, `Send maps the active ${activeRole} source back to the same Master role`)
  assert.equal(payload.snapshot.id, sources[activeRole].id)
  assert.equal(payload.snapshot.bom[0].price, overridePrice[activeRole])
}
const activeCurrentAfterCustom = setSimulationComparison(setSimulationActiveDataset(state, 'current'), 'reference', 'custom')
assert.equal(prepareSimulationSend(activeCurrentAfterCustom, sources).role, 'current',
  'Send still follows active Current when comparisonAfter is Custom')
const sendAll = prepareSimulationSendAll(state, sources)
assert.deepEqual(Object.keys(sendAll).sort(), [...roles].sort(), 'Send All prepares all three same-role destinations')
for (const role of roles) {
  assert.equal(sendAll[role].id, sources[role].id, `Send All maps ${role} to Master ${role}`)
  assert.equal(sendAll[role].bom[0].price, overridePrice[role], `Send All includes the effective ${role} override`)
}

const legacySnapshot = {
  ...sources.custom,
  id: 'obsolete-sim-snapshot',
  bom: [{ ...sources.custom.bom[0], price: 999 }]
}
const legacyState = reconcileSimulationState({
  sourceRole: 'custom',
  basisFingerprint: 'legacy-current-only-fingerprint',
  snapshot: legacySnapshot,
  resetBaselineSnapshot: sources.custom,
  startedAt: '2026-10-01T00:00:00.000Z',
  economicInputs: {},
  workingSelection: []
}, sources)
for (const role of roles) {
  assert.equal(getEffectiveSimulationDataset(sources, legacyState, role).snapshot.bom[0].price, sources[role].bom[0].price,
    `legacy single-SIM data does not recreate an override for ${role}`)
}
assert.notEqual(getEffectiveSimulationDataset(sources, legacyState, 'custom').snapshot.id, 'obsolete-sim-snapshot',
  'legacy SIM snapshot identity is not revived as a Master dataset')

const invalidState = {
  ...createEmptySimulationState(sources),
  activeDataset: 'simulation',
  comparisonBefore: 'simulation',
  comparisonAfter: 'invalid',
  datasets: {
    ...createEmptySimulationState(sources).datasets,
    reference: {
      ...createEmptySimulationState(sources).datasets.reference,
      parameterOverrides: { 'bom.price': { [sources.reference.bom[0].id]: 'not-a-number' } }
    },
    current: null
  }
} as unknown
const sanitized = reconcileSimulationState(invalidState, sources)
assert.ok(roles.includes(sanitized.activeDataset), 'invalid activeDataset is normalized to a valid role')
assert.ok(roles.includes(sanitized.comparisonBefore), 'invalid comparisonBefore is normalized to a valid role')
assert.ok(roles.includes(sanitized.comparisonAfter), 'invalid comparisonAfter is normalized to a valid role')
assert.equal(getEffectiveSimulationDataset(sources, sanitized, 'reference').snapshot.bom[0].price, sources.reference.bom[0].price,
  'invalid persisted parameter values are discarded during reconciliation')
const emptyRecovered = reconcileSimulationState(null, sources)
for (const role of roles) {
  assert.deepEqual(getEffectiveSimulationDataset(sources, emptyRecovered, role).snapshot, sources[role],
    `empty persisted state safely recovers from latest ${role} Working data`)
}

const retained = retainSimulationStatesForProducts({ kept: state, deleted: resetAll }, new Set(['kept']))
assert.deepEqual(Object.keys(retained), ['kept'], 'states for deleted products are pruned')
assert.strictEqual(retained.kept, state, 'product pruning preserves the retained product Simulation state')

const genericComparison = calculateParameterSimulation(sources.reference, sources.custom)
for (const [role, cost] of [
  ['reference', genericComparison.comparison.referenceCost],
  ['custom', genericComparison.comparison.currentCost]
] as const) {
  const source = sources[role]
  const expectedLabor = source.routing[0].manning! / (source.routing[0].capacity! * source.routing[0].yield!)
    * source.rates[0].laborRate!
  const expectedBurden = source.routing[0].manning! / (source.routing[0].capacity! * source.routing[0].yield!)
    * source.rates[0].burdenRate!
  assert.equal(cost.labor, expectedLabor, `${role} generic comparison cost uses the passed snapshot's labor rate`)
  assert.equal(cost.burden, expectedBurden, `${role} generic comparison cost uses the passed snapshot's burden rate`)
}

console.log('PASS: Simulation dataset override foundation')
