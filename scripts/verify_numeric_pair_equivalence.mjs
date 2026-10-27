import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const jiti = require('jiti')(fileURLToPath(import.meta.url))
let assertions = 0
const check = Object.fromEntries(['deepEqual', 'equal', 'notEqual', 'ok'].map(method => [method, (...args) => {
  assertions += 1
  return assert[method](...args)
}]))

const { seedSnapshotPair } = jiti('../src/state/seed-data.ts')
const { cloneCostSnapshot } = jiti('../src/state/master-data-datasets.ts')
const { getCanonicalComparisonStatus } = jiti('../src/core/calculations/comparison-status.ts')
const { compareSnapshots } = jiti('../src/core/calculations/snapshot-comparison.ts')
const { calculateSnapshotBOMDetail } = jiti('../src/core/calculations/snapshot-bom-detail.ts')
const { calculateSnapshotRoutingDetail } = jiti('../src/core/calculations/snapshot-routing-detail.ts')
const { calculateBOMParameterCostEffects, calculateRoutingParameterCostEffects } = jiti('../src/core/calculations/parameter-cost-effect.ts')

function makePair() {
  const reference = cloneCostSnapshot(seedSnapshotPair.reference)
  const current = cloneCostSnapshot(seedSnapshotPair.reference)
  reference.id = 'numeric-pair-reference'
  current.id = 'numeric-pair-current'
  current.comparisonRole = 'current'
  return { reference, current }
}

function setExact(row, field, exact) {
  const exactDecimalInputs = { ...row.exactDecimalInputs }
  if (exact === undefined) delete exactDecimalInputs[field]
  else exactDecimalInputs[field] = exact
  return { ...row, exactDecimalInputs }
}

const bomPair = makePair()
bomPair.reference.bom[0] = {
  ...bomPair.reference.bom[0],
  consumption: 0.02542,
  price: 14.83571,
  loss: 0.101,
  exactDecimalInputs: { loss: '10.1' }
}
bomPair.current.bom[0] = {
  ...bomPair.current.bom[0],
  consumption: 0.02542,
  price: 14.83571,
  loss: 0.101,
  exactDecimalInputs: {
    consumption: '2.5420000000000002E-2',
    price: '14.835710000000001',
    loss: '10.1'
  }
}

const bomDetail = calculateSnapshotBOMDetail({
  reference: bomPair.reference.bom[0],
  current: bomPair.current.bom[0]
})
check.equal(bomDetail.exactValues?.costGap, '0', 'machine-equivalent BOM inputs produce an exact zero cost gap')
check.equal(bomDetail.costGap, 0, 'machine-equivalent BOM numeric cost gap is exact zero')

const bomEffects = calculateBOMParameterCostEffects(
  {
    usage: 0.02542,
    price: 14.83571,
    loss: 0.101,
    exactInputs: { loss: '10.1' }
  },
  {
    usage: 0.02542,
    price: 14.83571,
    loss: 0.101,
    exactInputs: {
      usage: '2.5420000000000002E-2',
      price: '14.835710000000001',
      loss: '10.1'
    }
  }
)
check.equal(bomEffects.status, 'available', 'fully unchanged BOM PCE remains available')
if (bomEffects.status === 'available') {
  check.equal(bomEffects.effects.usage, 0, 'machine-equivalent BOM usage PCE is exact zero')
  check.equal(bomEffects.effects.price, 0, 'machine-equivalent BOM price PCE is exact zero')
  check.equal(bomEffects.effects.loss, 0, '10.1% BOM loss PCE is exact zero')
}

const unchangedBomComparison = compareSnapshots(bomPair.reference, bomPair.current)
const bomFinding = unchangedBomComparison.bomFindings.find(finding => finding.referenceId === bomPair.reference.bom[0].id)
check.equal(getCanonicalComparisonStatus(bomFinding), 'UNCHANGED', 'machine-equivalent BOM row stays UNCHANGED')
check.equal(bomFinding?.costEffect?.gap.material, 0, 'machine-equivalent BOM row material effect is exact zero')
check.equal(unchangedBomComparison.elementGaps.material, 0, 'machine-equivalent BOM total material gap is exact zero')
check.equal(unchangedBomComparison.totalGap, 0, 'machine-equivalent BOM comparison total gap is exact zero')
check.equal(bomPair.current.bom[0].exactDecimalInputs?.consumption, '2.5420000000000002E-2',
  'BOM calculation does not discard the imported consumption sidecar')
check.equal(bomPair.current.bom[0].exactDecimalInputs?.price, '14.835710000000001',
  'BOM calculation does not discard the imported price sidecar')

const noSidecarResiduePair = makePair()
noSidecarResiduePair.reference.bom[0] = {
  ...noSidecarResiduePair.reference.bom[0], consumption: 1, price: 0.09, loss: 0,
  exactDecimalInputs: undefined
}
noSidecarResiduePair.current.bom[0] = {
  ...noSidecarResiduePair.current.bom[0], consumption: 1, price: 0.09000000000000004, loss: 0,
  exactDecimalInputs: undefined
}
const noSidecarResidueComparison = compareSnapshots(noSidecarResiduePair.reference, noSidecarResiduePair.current)
const noSidecarResidueFinding = noSidecarResidueComparison.bomFindings.find(finding =>
  finding.referenceId === noSidecarResiduePair.reference.bom[0].id)
check.equal(getCanonicalComparisonStatus(noSidecarResidueFinding), 'UNCHANGED',
  'the finalized no-sidecar 0.09 residue example remains UNCHANGED')
check.equal(noSidecarResidueFinding?.fieldDiffs.price, undefined,
  'no-sidecar representation residue does not create a field difference')
check.equal(noSidecarResidueFinding?.costEffect?.gap.material, 0,
  'equivalent no-sidecar operands enter BOM cost calculation as the same exact decimal')
check.equal(noSidecarResidueComparison.totalGap, 0,
  'equivalent no-sidecar BOM residue contributes exact zero aggregate Gap')
check.equal(noSidecarResiduePair.current.bom[0].price, 0.09000000000000004,
  'pair reconciliation does not change the source snapshot Number')
check.equal(noSidecarResiduePair.current.bom[0].exactDecimalInputs, undefined,
  'pair reconciliation does not create a source exact-decimal sidecar')
const noSidecarResiduePce = calculateBOMParameterCostEffects(
  { usage: 1, price: 0.09, loss: 0 },
  { usage: 1, price: 0.09000000000000004, loss: 0 }
)
check.deepEqual(noSidecarResiduePce, { status: 'available', effects: { usage: 0, price: 0, loss: 0 } },
  'equivalent no-sidecar residue produces exact-zero BOM PCE')

const noSidecarMeaningfulDifference = makePair()
noSidecarMeaningfulDifference.reference.bom[0] = {
  ...noSidecarMeaningfulDifference.reference.bom[0], consumption: 1, price: 0.09, loss: 0,
  exactDecimalInputs: undefined
}
noSidecarMeaningfulDifference.current.bom[0] = {
  ...noSidecarMeaningfulDifference.current.bom[0], consumption: 1, price: 0.091, loss: 0,
  exactDecimalInputs: undefined
}
const noSidecarMeaningfulComparison = compareSnapshots(
  noSidecarMeaningfulDifference.reference,
  noSidecarMeaningfulDifference.current
)
const noSidecarMeaningfulFinding = noSidecarMeaningfulComparison.bomFindings.find(finding =>
  finding.referenceId === noSidecarMeaningfulDifference.reference.bom[0].id)
check.equal(getCanonicalComparisonStatus(noSidecarMeaningfulFinding), 'CHANGED',
  'a meaningful no-sidecar decimal difference outside the residue rule remains CHANGED')

const outsideNoSidecarBoundary = makePair()
outsideNoSidecarBoundary.reference.bom[0] = {
  ...outsideNoSidecarBoundary.reference.bom[0], consumption: 1, price: 0.09, loss: 0,
  exactDecimalInputs: undefined
}
outsideNoSidecarBoundary.current.bom[0] = {
  ...outsideNoSidecarBoundary.current.bom[0], consumption: 1, price: 0.09000000000000005, loss: 0,
  exactDecimalInputs: undefined
}
const outsideNoSidecarBoundaryComparison = compareSnapshots(
  outsideNoSidecarBoundary.reference,
  outsideNoSidecarBoundary.current
)
const outsideNoSidecarBoundaryFinding = outsideNoSidecarBoundaryComparison.bomFindings.find(finding =>
  finding.referenceId === outsideNoSidecarBoundary.reference.bom[0].id)
check.equal(getCanonicalComparisonStatus(outsideNoSidecarBoundaryFinding), 'CHANGED',
  'the four-ULP no-sidecar pair remains CHANGED beyond the explicit residue boundary')

const unchangedRatePair = makePair()
unchangedRatePair.reference.rates[0] = setExact(unchangedRatePair.reference.rates[0], 'burdenRate', undefined)
unchangedRatePair.current.rates[0] = {
  ...unchangedRatePair.current.rates[0],
  burdenRate: 138.48,
  exactDecimalInputs: { ...unchangedRatePair.current.rates[0].exactDecimalInputs, burdenRate: '138.47999999999999' }
}

const routingDetail = calculateSnapshotRoutingDetail(
  { reference: unchangedRatePair.reference.routing[0], current: unchangedRatePair.current.routing[0] },
  unchangedRatePair.reference.rates,
  unchangedRatePair.current.rates
)
check.equal(routingDetail.exactValues?.totalGap, '0', 'machine-equivalent Work Center rates produce exact zero Routing gap')
check.equal(routingDetail.totalGap, 0, 'machine-equivalent Work Center rates produce numeric zero Routing gap')

const unchangedRoutingPce = calculateRoutingParameterCostEffects(
  {
    manning: 1,
    capacity: 600,
    yield: 0.9,
    laborRate: 105.29,
    burdenRate: 138.48,
    exactInputs: { yield: '90', laborRate: '105.29' }
  },
  {
    manning: 1,
    capacity: 600,
    yield: 0.9,
    laborRate: 105.29,
    burdenRate: 138.48,
    exactInputs: { yield: '90', laborRate: '105.29', burdenRate: '138.47999999999999' }
  }
)
check.equal(unchangedRoutingPce.status, 'available', 'fully unchanged Routing PCE remains available')
if (unchangedRoutingPce.status === 'available') {
  for (const element of ['labor', 'burden', 'conversion']) {
    for (const parameter of ['manning', 'capacity', 'yield', 'laborRate', 'burdenRate']) {
      check.equal(unchangedRoutingPce.effects[element][parameter], 0,
        `unchanged Routing ${element} ${parameter} effect is exact zero`)
    }
  }
}

const unchangedRateComparison = compareSnapshots(unchangedRatePair.reference, unchangedRatePair.current)
const cuttingRate = unchangedRateComparison.workCenterFindings.find(finding => finding.referenceId === 'Cutting')
check.equal(getCanonicalComparisonStatus(cuttingRate), 'UNCHANGED', 'machine-equivalent Work Center row stays UNCHANGED')
check.equal(cuttingRate?.costEffect, undefined, 'Work Center rate rows do not invent a direct cost effect')
for (const finding of unchangedRateComparison.routingFindings.filter(finding =>
  unchangedRatePair.reference.routing.some(step => step.id === finding.referenceId && step.workCenterId === 'Cutting'))) {
  check.equal(getCanonicalComparisonStatus(finding), 'UNCHANGED',
    `Routing row ${finding.referenceId} using the equivalent Work Center rate stays UNCHANGED`)
  check.equal(finding.changeFlags.changedRate, false,
    `Routing row ${finding.referenceId} does not inherit a false changedRate flag`)
  check.equal(finding.costEffect?.gap.burden, 0,
    `Routing row ${finding.referenceId} burden cost gap is exact zero`)
}
const cuttingProcessing = unchangedRateComparison.processingFindings.find(finding =>
  finding.workCenterCode?.toLowerCase() === 'cutting')
check.equal(cuttingProcessing?.costEffect?.gap.burden, 0, 'Work Center processing burden gap is exact zero')
check.equal(unchangedRateComparison.elementGaps.burden, 0, 'machine-equivalent Work Center rates leave total burden gap at exact zero')
check.equal(unchangedRateComparison.totalGap, 0, 'machine-equivalent Work Center rates leave total cost gap at exact zero')
check.equal(unchangedRatePair.current.rates[0].exactDecimalInputs?.burdenRate, '138.47999999999999',
  'Routing calculations do not discard the imported Work Center rate sidecar')

const changedRoutingPair = makePair()
changedRoutingPair.reference.routing[0] = {
  ...changedRoutingPair.reference.routing[0],
  manning: 1,
  capacity: 600,
  yield: 0.9,
  exactDecimalInputs: { yield: '90' }
}
changedRoutingPair.current.routing[0] = {
  ...changedRoutingPair.current.routing[0],
  manning: 1,
  capacity: 610,
  yield: 0.99,
  exactDecimalInputs: { yield: '99' }
}
changedRoutingPair.reference.rates[0] = {
  ...changedRoutingPair.reference.rates[0],
  laborRate: 105.29,
  burdenRate: 138.48,
  exactDecimalInputs: { laborRate: '105.29' }
}
changedRoutingPair.current.rates[0] = {
  ...changedRoutingPair.current.rates[0],
  laborRate: 105.29,
  burdenRate: 138.48,
  exactDecimalInputs: { laborRate: '105.29', burdenRate: '138.47999999999999' }
}

const changedRoutingComparison = compareSnapshots(changedRoutingPair.reference, changedRoutingPair.current)
const changedRoutingFinding = changedRoutingComparison.routingFindings.find(finding =>
  finding.referenceId === changedRoutingPair.reference.routing[0].id)
check.equal(getCanonicalComparisonStatus(changedRoutingFinding), 'CHANGED', 'real Capacity/Yield changes keep Routing status CHANGED')
check.equal(changedRoutingFinding?.changeFlags.changedRate, false,
  'a machine-equivalent Burden Rate does not create a changedRate flag beside real input changes')
check.notEqual(changedRoutingFinding?.costEffect?.gap.burden, 0,
  'Capacity/Yield changes still produce a real total Burden cost gap')

const changedRoutingPce = calculateRoutingParameterCostEffects(
  {
    manning: 1,
    capacity: 600,
    yield: 0.9,
    laborRate: 105.29,
    burdenRate: 138.48,
    exactInputs: { yield: '90', laborRate: '105.29' }
  },
  {
    manning: 1,
    capacity: 610,
    yield: 0.99,
    laborRate: 105.29,
    burdenRate: 138.48,
    exactInputs: { yield: '99', laborRate: '105.29', burdenRate: '138.47999999999999' }
  }
)
check.equal(changedRoutingPce.status, 'available', 'changed Routing PCE remains available')
if (changedRoutingPce.status === 'available') {
  check.notEqual(changedRoutingPce.effects.burden.capacity, 0, 'Capacity still has a real Burden PCE')
  check.notEqual(changedRoutingPce.effects.burden.yield, 0, 'Yield still has a real Burden PCE')
  check.equal(changedRoutingPce.effects.burden.burdenRate, 0,
    'machine-equivalent Burden Rate has exact zero PCE beside real Capacity/Yield changes')
}

const explicitDifferencePair = makePair()
explicitDifferencePair.reference.rates[0] = {
  ...explicitDifferencePair.reference.rates[0],
  burdenRate: 138.48,
  exactDecimalInputs: { burdenRate: '138.48' }
}
explicitDifferencePair.current.rates[0] = {
  ...explicitDifferencePair.current.rates[0],
  burdenRate: 138.48000000000002,
  exactDecimalInputs: { burdenRate: '138.48000000000001' }
}
const explicitDifferenceComparison = compareSnapshots(explicitDifferencePair.reference, explicitDifferencePair.current)
const explicitDifferenceFinding = explicitDifferenceComparison.workCenterFindings.find(finding => finding.referenceId === 'Cutting')
check.equal(getCanonicalComparisonStatus(explicitDifferenceFinding), 'CHANGED',
  'two explicitly owned exact rate inputs remain CHANGED')
check.equal(explicitDifferenceFinding?.fieldDiffs.burdenRate?.reference, '138.48',
  'negative control preserves the explicit Reference decimal')
check.equal(explicitDifferenceFinding?.fieldDiffs.burdenRate?.current, '138.48000000000001',
  'negative control preserves the explicit Current decimal')

const explicitDifferencePce = calculateRoutingParameterCostEffects(
  {
    manning: 1,
    capacity: 600,
    yield: 0.9,
    laborRate: 105.29,
    burdenRate: 138.48,
    exactInputs: { yield: '90', laborRate: '105.29', burdenRate: '138.48' }
  },
  {
    manning: 1,
    capacity: 600,
    yield: 0.9,
    laborRate: 105.29,
    burdenRate: 138.48000000000002,
    exactInputs: { yield: '90', laborRate: '105.29', burdenRate: '138.48000000000001' }
  }
)
check.equal(explicitDifferencePce.status, 'available', 'negative-control exact PCE remains available')
if (explicitDifferencePce.status === 'available') {
  check.notEqual(explicitDifferencePce.effects.burden.burdenRate, 0,
    'different authoritative exact Burden Rates retain a real nonzero PCE')
}

console.log(`Numeric pair equivalence regression: PASS (${assertions} assertions)`)
