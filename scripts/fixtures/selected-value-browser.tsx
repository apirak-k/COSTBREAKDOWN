import React, { useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { AppProvider } from '../../src/state'
import { AppLayout } from '../../src/shared/layout/AppLayout'
import { NumericInput } from '../../src/shared/ui/NumericInput'
import { SelectedNumber, useSelectedValue, useSelectedValueSource } from '../../src/shared/ui/selected-value'
import '../../src/index.css'

function EditableSample({ value, onValueChange, locked, identity }: {
  value: number | null
  onValueChange: (value: number | null) => void
  locked: boolean
  identity: string
}) {
  const source = useSelectedValueSource(locked
    ? { value, editable: false }
    : { value, editable: true, domain: { min: 0, max: 100000 }, onValueChange }, identity)
  return <NumericInput aria-label="Foundation decimal" value={value} onValueChange={onValueChange} min={0} max={100000} readOnly={locked} onFocus={source.select} />
}

function IntegerSample({ value, onValueChange }: { value: number | null; onValueChange: (value: number | null) => void }) {
  const source = useSelectedValueSource({ value, editable: true, domain: { integer: true, min: 1, max: 200 }, onValueChange }, 'integer-source')
  return <NumericInput aria-label="Foundation integer" value={value} onValueChange={onValueChange} integer min={1} max={200} onFocus={source.select} />
}

function PercentageSample({ value, onValueChange }: { value: number | null; onValueChange: (value: number | null) => void }) {
  const source = useSelectedValueSource({ value, editable: true, percentage: true, domain: { min: 0, max: 100 }, onValueChange }, 'percentage-source')
  return <NumericInput aria-label="Foundation percentage" value={value} onValueChange={onValueChange} min={0} max={100} onFocus={source.select} />
}

function PositiveSample({ value, onValueChange }: { value: number | null; onValueChange: (value: number | null) => void }) {
  const source = useSelectedValueSource({ value, editable: true, domain: { min: 0, minExclusive: true }, allowSubMinimumDraft: true, stopAtMinimum: true, onValueChange }, 'positive-source')
  return <NumericInput aria-label="Foundation positive" value={value} onValueChange={onValueChange} min={0} minExclusive allowSubMinimumDraft stopAtMinimum onFocus={source.select} />
}

function FoundationFixture() {
  const [decimal, setDecimal] = useState<number | null>(12.3456789123)
  const [integer, setInteger] = useState<number | null>(3)
  const [percentage, setPercentage] = useState<number | null>(12.3456789)
  const [positive, setPositive] = useState<number | null>(0.000123)
  const [visible, setVisible] = useState(true)
  const [locked, setLocked] = useState(false)
  const [identity, setIdentity] = useState('decimal-source-1')
  const [rowClicks, setRowClicks] = useState(0)
  const [writerVersion, setWriterVersion] = useState(1)
  const [lastWriter, setLastWriter] = useState(0)
  const capturedWriter = useRef<((value: number | null) => void) | undefined>()
  const { selection, clearSelection, selectValue } = useSelectedValue()
  return (
    <section className="space-y-4 p-3" aria-label="Selected value foundation fixture">
      <div onClick={() => setRowClicks(count => count + 1)} className="flex flex-wrap items-center gap-4">
        <SelectedNumber value={12.3456789123} selectionId="readonly-one" aria-label="Select precise result" />
        <SelectedNumber value={0.00456789123} selectionId="readonly-two" aria-label="Select tiny result" />
        <SelectedNumber value={null} selectionId="readonly-missing" aria-label="Missing result" />
        <SelectedNumber value={3} integer selectionId="readonly-count" aria-label="Select count" />
      </div>
      <div className="grid max-w-full grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block max-w-xs">Decimal{visible && <EditableSample value={decimal} onValueChange={next => { setDecimal(next); setLastWriter(writerVersion) }} locked={locked} identity={identity} />}</label>
        <label className="block max-w-xs">Integer<IntegerSample value={integer} onValueChange={setInteger} /></label>
        <label className="block max-w-xs">Percentage<PercentageSample value={percentage} onValueChange={setPercentage} /></label>
        <label className="block max-w-xs">Positive<PositiveSample value={positive} onValueChange={setPositive} /></label>
      </div>
      <div className="flex flex-wrap gap-3">
        <button type="button" onMouseDown={event => event.preventDefault()} onClick={() => setDecimal(98.7654321)}>External update</button>
        <button type="button" onClick={() => setDecimal(12.3456789123)}>Reset decimal</button>
        <button type="button" onClick={() => setVisible(value => !value)}>Toggle source</button>
        <button type="button" onClick={() => setLocked(value => !value)}>Toggle readonly</button>
        <button type="button" onClick={() => setIdentity(value => value === 'decimal-source-1' ? 'decimal-source-2' : 'decimal-source-1')}>Change source identity</button>
        <button type="button" onClick={() => clearSelection()}>Clear selected value</button>
        <button type="button" onClick={() => { capturedWriter.current = selection?.editable ? selection.onValueChange : undefined }}>Capture writer</button>
        <button type="button" onClick={() => capturedWriter.current?.(77)}>Invoke captured writer</button>
        <button type="button" onClick={() => setWriterVersion(version => version + 1)}>Change writer</button>
        <button type="button" onClick={() => selectValue({ id: 'long-readonly', value: Number.MAX_VALUE, editable: false })}>Select longest value</button>
        <button type="button" onClick={() => selectValue({ id: 'long-editable', value: Number.MAX_VALUE, editable: true, domain: {}, onValueChange: setDecimal })}>Edit longest value</button>
      </div>
      <output data-testid="decimal-model">{decimal === null ? 'null' : String(decimal)}</output>
      <output data-testid="integer-model">{integer === null ? 'null' : String(integer)}</output>
      <output data-testid="percentage-model">{percentage === null ? 'null' : String(percentage)}</output>
      <output data-testid="positive-model">{positive === null ? 'null' : String(positive)}</output>
      <output data-testid="last-writer">{lastWriter}</output>
      <output data-testid="row-clicks">{rowClicks}</output>
    </section>
  )
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><AppProvider><AppLayout><FoundationFixture /></AppLayout></AppProvider></React.StrictMode>)
