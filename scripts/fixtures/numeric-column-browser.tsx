import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BusinessNumber } from '../../src/shared/ui/BusinessNumber'
import { NumericInput } from '../../src/shared/ui/NumericInput'
import { NumericColumnHeader } from '../../src/shared/ui/NumericColumnHeader'
import '../../src/index.css'

const values = [1, 35, 100, 1000, 10000, 100000, 0.0045, 1e300, -1e300, Number.MIN_VALUE, Number.MAX_VALUE]

function EditableValue({ initial, width }: { initial: number; width: number }) {
  const [value, setValue] = useState<number | null>(initial)
  return <NumericInput numericColumn value={value} onValueChange={setValue} aria-label={`Measured ${initial} at ${width}`} />
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
  </main>
}

createRoot(document.getElementById('root')!).render(<Fixture />)
