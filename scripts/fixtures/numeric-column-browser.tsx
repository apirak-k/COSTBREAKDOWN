import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BusinessNumber } from '../../src/shared/ui/BusinessNumber'
import { NumericInput } from '../../src/shared/ui/NumericInput'
import { NumericColumnSlot } from '../../src/shared/ui/NumericColumnSlot'
import { NumericColumnHeader } from '../../src/shared/ui/NumericColumnHeader'
import { compareSnapshots, type CostSnapshot } from '../../src/core'
import { SnapshotComparisonCard } from '../../src/features/cost-breakdown/components/SnapshotComparisonCard'
import { WorkCenterProcessingTable } from '../../src/features/cost-breakdown/components/WorkCenterProcessingTable'
import { SelectedValueProvider } from '../../src/shared/ui/selected-value'
import '../../src/index.css'

const values = [1, 35, 100, 1000, 10000, 100000, 0.0045, 1e300, -1e300, Number.MIN_VALUE, Number.MAX_VALUE]

function EditableValue({ initial, width }: { initial: number; width: number }) {
  const [value, setValue] = useState<number | null>(initial)
  return <NumericInput numericColumn value={value} onValueChange={setValue} aria-label={`Measured ${initial} at ${width}`} />
}

// Actual summary callers exercise scientific percentages without annotation collisions.
function summarySnapshot(id: string, price: number): CostSnapshot {
  return {
    id, status: 'draft', effectiveDate: '', sourceRef: 'synthetic-layout-fixture',
    product: { productCode: 'LAYOUT', productDescription: 'Synthetic layout fixture', uom: 'PC', customer: '', effectiveDate: '' },
    bom: [{ id: 'material', itemCode: 'M', description: 'Material', consumption: 1, unit: 'EA', price, loss: 0, confidence: {} }],
    rates: [{ id: 'rate', workCenterCode: 'WC', description: '', laborRate: price, burdenRate: price, effectiveDate: '', confidence: {} }],
    routing: [{ id: 'routing', processName: 'Process', workCenterId: 'WC', manning: 1, capacity: 1, yield: 1, confidence: {} }]
  }
}
const scientificSummary = compareSnapshots(summarySnapshot('before', 1e-10), summarySnapshot('after', 1))

function SuffixPairs() {
  return <table data-suffix-pairs="true" aria-label="Suffix-independent numeric regions" className="table-fixed font-mono text-xs" style={{ width: 136 * 4 + 13.6 * 2 }}>
    <colgroup>{[136,149.6,136,149.6].map((width,index)=><col key={index} style={{width}} />)}</colgroup>
    <thead><tr>{[false,true,false,true].map((percent,index)=><th key={index} className="p-0"><NumericColumnSlot percentage={percent} showSuffix={false}><NumericColumnHeader>{index<2?'Read only':'Editable'}</NumericColumnHeader></NumericColumnSlot></th>)}</tr></thead>
    <tbody>{[5,98,1234,0.0045,-1234,1e300].map(value=><tr key={value} data-suffix-pair-value={value}>
      <td className="p-0"><BusinessNumber numericColumn value={value} /></td>
      <td className="p-0"><BusinessNumber numericColumn value={value} percent /></td>
      <td className="p-0"><NumericInput numericColumn value={value} onValueChange={()=>{}} aria-label={`No suffix ${value}`} /></td>
      <td className="p-0"><NumericInput numericColumn value={value} onValueChange={()=>{}} percentSuffix aria-label={`With suffix ${value}`} /></td>
    </tr>)}</tbody>
  </table>
}

function Fixture() {
  return <main aria-label="Measured numeric column fixture" className="flex flex-wrap items-start gap-6 p-4">
    {[77, 96, 136].map(width => <table key={width} aria-label={`${width}px measured numeric regions`} className="table-fixed border-collapse font-mono text-xs" style={{ width: width * 2 }}>
      <caption className="py-2">{width}px fixed regions</caption>
      <colgroup><col style={{ width }} /><col style={{ width }} /></colgroup>
      <thead className="font-sans text-[11px]"><tr>
        <th className="p-0"><NumericColumnHeader>Read only</NumericColumnHeader></th>
        <th className="p-0"><NumericColumnHeader>Editable</NumericColumnHeader></th>
      </tr></thead>
      <tbody>{values.map(value => <tr key={value} data-initial-value={String(value)}>
        <td className="h-8 p-0"><BusinessNumber numericColumn value={value} /></td>
        <td className="h-8 p-0"><EditableValue initial={value} width={width} /></td>
      </tr>)}</tbody>
    </table>)}
    <SelectedValueProvider scopeKey="scientific-summary-layout">
      <div data-scientific-summary-fixture="true" className="w-[652px] shrink-0">
        <SnapshotComparisonCard comparison={scientificSummary} gapDirection="After − Before" />
        <WorkCenterProcessingTable comparison={scientificSummary} gapDirection="After − Before" />
      </div>
    </SelectedValueProvider>
    <SuffixPairs />
  </main>
}

createRoot(document.getElementById('root')!).render(<Fixture />)
