import React from 'react'
import { createRoot } from 'react-dom/client'
import { compareSnapshots } from '../../src/core'
import type { CostBreakdownComparisonPair, CostSnapshot, SnapshotBOMItem, SnapshotRoutingStep, SnapshotWorkCenterRate } from '../../src/core'
import { ItemizedComparisonTable } from '../../src/features/cost-breakdown/components/ItemizedComparisonTable'
import { SnapshotComparisonCard } from '../../src/features/cost-breakdown/components/SnapshotComparisonCard'
import { WorkCenterProcessingTable } from '../../src/features/cost-breakdown/components/WorkCenterProcessingTable'
import { SelectedValueProvider } from '../../src/shared/ui/selected-value'
import '../../src/index.css'

function rate(id: string, code: string, burdenRate: number, exactBurdenRate: string): SnapshotWorkCenterRate {
  return {
    id,
    workCenterCode: code,
    description: code,
    laborRate: 105.29,
    exactDecimalInputs: { laborRate: '105.29', burdenRate: exactBurdenRate },
    burdenRate,
    effectiveDate: '',
    confidence: {}
  }
}

function route(id: string, processName: string, workCenterId: string, capacity = 2520): SnapshotRoutingStep {
  return {
    id,
    processName,
    operationCode: id,
    sequence: 10,
    workCenterId,
    manning: 1,
    exactDecimalInputs: { manning: '1', capacity: String(capacity), yield: '70' },
    capacity,
    yield: 0.7,
    confidence: {}
  }
}

const product = {
  productCode: 'NUMERIC-TEST',
  productDescription: 'Numeric integrity browser fixture',
  uom: 'PC',
  customer: '',
  effectiveDate: ''
}
const referenceRoutes = [
  route('same', 'Annealing same', 'WC-SAME'),
  route('capacity', 'Annealing capacity', 'WC-CAPACITY'),
  route('rate', 'Annealing rate', 'WC-RATE'),
  route('tiny-rate', 'Annealing tiny rate', 'WC-TINY'),
  route('moved', 'Annealing moved', 'WC-MOVE-OLD')
]
const currentRoutes = [
  route('same', 'Annealing same', 'WC-SAME'),
  route('capacity', 'Annealing capacity', 'WC-CAPACITY', 2600),
  route('rate', 'Annealing rate', 'WC-RATE'),
  route('tiny-rate', 'Annealing tiny rate', 'WC-TINY'),
  route('moved', 'Annealing moved', 'WC-MOVE-NEW')
]
const rateCodes = ['WC-SAME', 'WC-CAPACITY', 'WC-RATE', 'WC-TINY', 'WC-MOVE-OLD', 'WC-MOVE-NEW']
const referenceRates = rateCodes.map(code => rate(`ref-${code}`, code, 138.48, '138.48'))
const currentRates = rateCodes.map(code => rate(
  `cur-${code}`,
  code,
  code === 'WC-RATE' ? 140 : 138.48,
  code === 'WC-RATE' ? '140.00' : code === 'WC-TINY' ? '138.480000000000001' : '138.48'
))
const bom = (id: string, description: string, price: number, loss: number): SnapshotBOMItem => ({
  id,
  itemCode: 'MAT-1',
  description,
  consumption: 1,
  exactDecimalInputs: { consumption: '1', price: String(price) },
  unit: 'KG',
  price,
  loss,
  confidence: {}
})
const referenceBOM = [
  bom('bom-residue-reference', 'BOM residue', 10, 0.09),
  bom('bom-factor-reference', 'BOM factor', 10, 0.09)
]
const currentBOM = [
  bom('bom-residue-current', 'BOM residue', 10, 0.09000000000000004),
  bom('bom-factor-current', 'BOM factor', 12, 0.09000000000000004)
]
const reference: CostSnapshot = {
  id: 'numeric-reference', comparisonRole: 'reference', status: 'draft', sourceRef: 'Fixture',
  product, effectiveDate: '', rates: referenceRates, bom: referenceBOM, routing: referenceRoutes, warnings: []
}
const current: CostSnapshot = {
  id: 'numeric-current', comparisonRole: 'current', status: 'draft', sourceRef: 'Fixture',
  product, effectiveDate: '', rates: currentRates, bom: currentBOM, routing: currentRoutes, warnings: []
}
const pair: CostBreakdownComparisonPair = {
  beforeRole: 'reference', afterRole: 'current', before: reference, after: current,
  fingerprint: 'numeric-integrity-browser-fixture'
}
const comparison = compareSnapshots(reference, current)

createRoot(document.getElementById('root')!).render(
  <SelectedValueProvider scopeKey="numeric-integrity-browser-fixture">
    <main className="min-h-screen bg-slate-50 p-4">
      <div className="grid grid-cols-2 gap-2">
        <SnapshotComparisonCard comparison={comparison} gapDirection="After − Before" pairFingerprint={pair.fingerprint} />
        <WorkCenterProcessingTable comparison={comparison} gapDirection="After − Before" pairFingerprint={pair.fingerprint} />
      </div>
      <ItemizedComparisonTable
        comparison={comparison}
        pair={pair}
        typeTab="all"
        viewMode={['UNCHANGED', 'CHANGED', 'ADDED', 'REMOVED']}
        sortMode="absolute-gap-desc"
        selectedBOMKeys={new Set()}
        selectedRoutingKeys={new Set()}
        manualOrders={{ bom: null, routing: null }}
        onManualOrderChange={() => {}}
        onResetManualOrderHistory={() => {}}
        onSetFindingSelection={() => {}}
      />
    </main>
  </SelectedValueProvider>
)
