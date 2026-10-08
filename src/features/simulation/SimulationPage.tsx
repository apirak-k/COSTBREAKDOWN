import React, { useMemo } from 'react'
import { formatNumber } from '../../core'
import type { CostSnapshot, MasterDataRole, SnapshotBOMItem, SnapshotRoutingStep } from '../../core/types'
import { PageHeading } from '../../shared'
import { EconomicSimulationPanel } from './EconomicSimulationPanel'
import type { EconomicSimulationField } from './simulation-economics'
import type { ParameterSimulationResult, SimulationComparisonRow, SimulationRecordKind } from './simulation-engine'
import { calculateParameterSimulation } from './simulation-engine'
import type { SimulationFactor, SimulationWorkspaceState } from './simulation-state'
import { SIMULATION_FACTORS } from './simulation-state'

interface SimulationPageProps {
  state: SimulationWorkspaceState
  currentSnapshot: CostSnapshot
  onStartFrom: (role: MasterDataRole) => void
  onReset: () => void
  onSelectFactors: (factors: SimulationFactor[]) => void
  onUpdateParameter: (recordId: string, factor: SimulationFactor, value: number | null) => void
  onUpdateEconomicInput: (field: EconomicSimulationField, value: string) => void
}

const SOURCES: Array<{ role: MasterDataRole; label: string }> = [
  { role: 'reference', label: 'Reference' },
  { role: 'current', label: 'Current' },
  { role: 'custom', label: 'Custom' }
]

const FACTOR_DETAILS: Record<SimulationFactor, { label: string; kind: SimulationRecordKind; displayScale: number }> = {
  'bom.price': { label: 'Price', kind: 'bom', displayScale: 1 },
  'bom.consumption': { label: 'Usage', kind: 'bom', displayScale: 1 },
  'bom.loss': { label: 'Loss', kind: 'bom', displayScale: 100 },
  'routing.manning': { label: 'Manning', kind: 'routing', displayScale: 1 },
  'routing.capacity': { label: 'Capacity', kind: 'routing', displayScale: 1 },
  'routing.yield': { label: 'Yield', kind: 'routing', displayScale: 100 }
}

function formatParameter(value: number | null, factor: SimulationFactor): string {
  if (value === null || !Number.isFinite(value)) return '—'
  const { displayScale } = FACTOR_DETAILS[factor]
  const displayedValue = value * displayScale
  return displayScale === 100
    ? `${formatNumber(displayedValue, 1)}%`
    : formatNumber(displayedValue, 4)
}

function formatCost(value: number | null): string {
  return value === null || !Number.isFinite(value) ? '—' : formatNumber(value, 4)
}

function rowStatus(row: SimulationComparisonRow): string {
  if (row.identityIssue === 'ambiguous') return 'Ambiguous identity'
  if (row.identityIssue === 'unmatched') return 'Missing identity'
  return row.status ?? '—'
}

interface CostSummaryProps {
  result: ParameterSimulationResult
}

const CostSummary: React.FC<CostSummaryProps> = ({ result }) => {
  const lines = [
    { label: 'Material', current: result.currentCost.material, simulation: result.simulationCost.material },
    { label: 'Labor', current: result.currentCost.labor, simulation: result.simulationCost.labor },
    { label: 'Burden', current: result.currentCost.burden, simulation: result.simulationCost.burden },
    { label: 'Standard Cost', current: result.currentCost.total, simulation: result.simulationCost.total }
  ]
  const warnings = result.comparison.warnings.map(warning => warning.message)

  return (
    <section className="border border-slate-300 bg-white" aria-labelledby="simulation-result-title">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 px-3 py-2.5">
        <div>
          <h2 id="simulation-result-title" className="font-sans text-sm font-semibold text-slate-950">Current vs SIM</h2>
          <p className="mt-0.5 text-[11px] text-slate-600">Full snapshot calculation · THB/pc</p>
        </div>
        <dl className="border-l-2 border-slate-900 py-0.5 pl-3 text-right">
          <dt className="font-sans text-[11px] font-semibold text-slate-600">Parameter Saving / pc</dt>
          <dd className={`mt-0.5 font-mono text-base font-semibold tabular-nums ${result.parameterSavingPerPiece === null ? 'text-slate-500' : result.parameterSavingPerPiece >= 0 ? 'text-emerald-800' : 'text-rose-800'}`}>
            {result.parameterSavingPerPiece === null ? 'Unavailable' : formatNumber(result.parameterSavingPerPiece, 4)}
          </dd>
        </dl>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[440px] text-left text-xs">
          <thead className="bg-slate-100 text-[11px] font-semibold text-slate-700">
            <tr>
              <th scope="col" className="px-3 py-2">Cost element</th>
              <th scope="col" className="px-3 py-2 text-right">Current</th>
              <th scope="col" className="px-3 py-2 text-right">SIM</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {lines.map(line => (
              <tr key={line.label} className={line.label === 'Standard Cost' ? 'font-semibold text-slate-950' : 'text-slate-700'}>
                <th scope="row" className="px-3 py-2 text-left">{line.label}</th>
                <td className="px-3 py-2 text-right font-mono tabular-nums">{formatCost(line.current)}</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">{formatCost(line.simulation)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {(result.currentCost.status !== 'complete' || result.simulationCost.status !== 'complete') && (
        <p role="status" className="border-t border-slate-200 px-3 py-2 text-xs text-amber-800">
          Saving is unavailable until both Current and SIM Standard Cost can be calculated.
        </p>
      )}
      {warnings.length > 0 && (
        <details className="border-t border-slate-200 px-3 py-2 text-xs text-slate-600">
          <summary className="cursor-pointer font-medium">Calculation notes ({warnings.length})</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {[...new Set(warnings)].map((warning, index) => <li key={`${index}-${warning}`}>{warning}</li>)}
          </ul>
        </details>
      )}
    </section>
  )
}

interface ParameterTableProps {
  kind: SimulationRecordKind
  rows: SimulationComparisonRow[]
  currentSnapshot: CostSnapshot
  simulationSnapshot: CostSnapshot
  selectedFactors: SimulationFactor[]
  onUpdate: (recordId: string, factor: SimulationFactor, value: number | null) => void
}

const ParameterTable: React.FC<ParameterTableProps> = ({
  kind,
  rows,
  currentSnapshot,
  simulationSnapshot,
  selectedFactors,
  onUpdate
}) => {
  const factors = SIMULATION_FACTORS.filter(factor => FACTOR_DETAILS[factor].kind === kind)
  const currentRows = kind === 'bom' ? currentSnapshot.bom : currentSnapshot.routing
  const simulationRows = kind === 'bom' ? simulationSnapshot.bom : simulationSnapshot.routing
  const title = kind === 'bom' ? 'BOM' : 'Process Routing'

  return (
    <section className="border border-slate-300 bg-white" aria-labelledby={`${kind}-simulation-title`}>
      <div className="border-b border-slate-200 px-3 py-2">
        <h3 id={`${kind}-simulation-title`} className="font-sans text-xs font-semibold text-slate-950">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse text-left text-xs">
          <caption className="sr-only">{title} values and identity-aware status in Current compared with SIM.</caption>
          <thead className="bg-slate-900 text-[11px] font-semibold text-white">
            <tr>
              <th scope="col" className="min-w-48 px-3 py-2">{kind === 'bom' ? 'Material' : 'Process'}</th>
              <th scope="col" className="w-32 px-3 py-2">Status</th>
              {factors.map(factor => (
                <React.Fragment key={factor}>
                  <th scope="col" className="min-w-28 px-3 py-2 text-right">{FACTOR_DETAILS[factor].label} · Current</th>
                  <th scope="col" className="min-w-32 px-3 py-2 text-right">{FACTOR_DETAILS[factor].label} · SIM</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows.length === 0 ? (
              <tr><td colSpan={2 + factors.length * 2} className="px-3 py-5 text-center text-xs text-slate-600">No {title} records.</td></tr>
            ) : rows.map((row, rowIndex) => {
              const currentRecord = row.currentRecordId
                ? currentRows.find(record => record.id === row.currentRecordId)
                : undefined
              const simulationRecord = row.simulationRecordId
                ? simulationRows.find(record => record.id === row.simulationRecordId)
                : undefined
              const canEdit = row.status !== null && row.status !== 'REMOVED' && row.identityIssue === null && Boolean(row.simulationRecordId)

              return (
                <tr key={`${row.currentRecordId ?? '—'}:${row.simulationRecordId ?? '—'}:${rowIndex}`} className="align-top hover:bg-slate-50/60">
                  <th scope="row" className="px-3 py-2 text-left font-medium text-slate-900">
                    <span className="break-words">{row.name}</span>
                    {kind === 'bom' && (simulationRecord as SnapshotBOMItem | undefined)?.unit && (
                      <span className="mt-0.5 block font-normal text-[10px] text-slate-500">{(simulationRecord as SnapshotBOMItem).unit}</span>
                    )}
                    {kind === 'routing' && (simulationRecord as SnapshotRoutingStep | undefined)?.workCenterId && (
                      <span className="mt-0.5 block font-normal text-[10px] text-slate-500">WC {(simulationRecord as SnapshotRoutingStep).workCenterId}</span>
                    )}
                  </th>
                  <td className="px-3 py-2">
                    <span className={`inline-flex border px-1.5 py-0.5 text-[10px] font-mono font-semibold ${row.status === 'CHANGED' ? 'border-amber-300 bg-amber-50 text-amber-800' : row.status === 'ADDED' ? 'border-blue-300 bg-blue-50 text-blue-800' : row.status === 'REMOVED' ? 'border-rose-300 bg-rose-50 text-rose-800' : row.status === 'UNCHANGED' ? 'border-slate-200 bg-slate-50 text-slate-600' : 'border-slate-300 bg-slate-100 text-slate-700'}`}>
                      {rowStatus(row)}
                    </span>
                  </td>
                  {factors.map(factor => {
                    const field = FACTOR_DETAILS[factor].label.toLocaleLowerCase()
                    const currentValue = currentRecord ? (currentRecord as unknown as Record<string, number | null>)[FACTOR_FIELDS[factor]] ?? null : null
                    const simulationValue = simulationRecord ? (simulationRecord as unknown as Record<string, number | null>)[FACTOR_FIELDS[factor]] ?? null : null
                    const editorVisible = selectedFactors.includes(factor) && canEdit

                    return (
                      <React.Fragment key={factor}>
                        <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-600">
                          {currentRecord ? formatParameter(currentValue, factor) : '—'}
                        </td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-900">
                          {!simulationRecord ? '—' : editorVisible ? (
                            <input
                              type="number"
                              step="any"
                              value={simulationValue === null ? '' : String(simulationValue * FACTOR_DETAILS[factor].displayScale)}
                              onChange={event => {
                                const raw = event.currentTarget.value
                                if (raw === '') onUpdate(simulationRecord.id, factor, null)
                                else {
                                  const displayedValue = Number(raw)
                                  if (Number.isFinite(displayedValue)) {
                                    onUpdate(simulationRecord.id, factor, displayedValue / FACTOR_DETAILS[factor].displayScale)
                                  }
                                }
                              }}
                              className="min-h-8 w-28 border border-blue-500 bg-white px-2 text-right font-mono text-xs tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-200"
                              aria-label={`${row.name} ${field} SIM value`}
                            />
                          ) : formatParameter(simulationValue, factor)}
                        </td>
                      </React.Fragment>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

const FACTOR_FIELDS: Record<SimulationFactor, string> = {
  'bom.price': 'price',
  'bom.consumption': 'consumption',
  'bom.loss': 'loss',
  'routing.manning': 'manning',
  'routing.capacity': 'capacity',
  'routing.yield': 'yield'
}

export const SimulationPage: React.FC<SimulationPageProps> = ({
  state,
  currentSnapshot,
  onStartFrom,
  onReset,
  onSelectFactors,
  onUpdateParameter,
  onUpdateEconomicInput
}) => {
  const sourceLabel = SOURCES.find(source => source.role === state.sourceRole)?.label
  const result = useMemo(
    () => state.snapshot ? calculateParameterSimulation(currentSnapshot, state.snapshot) : null,
    [currentSnapshot, state.snapshot]
  )
  const bomRows = result?.records.filter(row => row.kind === 'bom') ?? []
  const routingRows = result?.records.filter(row => row.kind === 'routing') ?? []

  const toggleFactor = (factor: SimulationFactor, selected: boolean) => {
    const next = new Set(state.selectedFactors)
    if (selected) next.add(factor)
    else next.delete(factor)
    onSelectFactors([...next])
  }

  return (
    <div className="space-y-4">
      <PageHeading
        title="Simulation"
        description="Compare a temporary SIM with Current and test selected BOM or process parameters."
        actions={state.snapshot ? (
          <button type="button" onClick={onReset} className="min-h-9 border border-slate-400 bg-white px-3 text-xs font-medium text-slate-800 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">
            Reset SIM
          </button>
        ) : undefined}
      />

      {!state.snapshot ? (
        <section className="border border-slate-300 bg-white p-3" aria-labelledby="simulation-start-title">
          <h2 id="simulation-start-title" className="font-sans text-sm font-semibold text-slate-950">Start SIM From</h2>
          <p className="mt-1 text-xs text-slate-600">SIM uses an isolated copy. Changes here do not update any Master Data workspace.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {SOURCES.map(source => (
              <button
                key={source.role}
                type="button"
                onClick={() => onStartFrom(source.role)}
                className="min-h-9 border border-slate-900 bg-slate-900 px-3 text-xs font-medium text-white hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
              >
                Start SIM From {source.label}
              </button>
            ))}
          </div>
        </section>
      ) : result && (
        <>
          <section className="flex flex-wrap items-baseline gap-x-4 gap-y-2 border border-slate-300 border-l-4 border-l-slate-900 bg-white px-3 py-3" aria-label="Simulation basis">
            <dl>
              <dt className="font-sans text-[11px] font-semibold text-slate-600">SIM source</dt>
              <dd className="mt-0.5 text-sm font-semibold text-slate-950">{sourceLabel}</dd>
            </dl>
            <dl>
              <dt className="font-sans text-[11px] font-semibold text-slate-600">Comparison basis</dt>
              <dd className="mt-0.5 text-sm font-semibold text-slate-950">Current Working</dd>
            </dl>
            <p className="min-w-56 flex-1 text-xs leading-5 text-slate-600">
              Temporary SIM snapshot · {state.snapshot.bom.length} BOM · {state.snapshot.routing.length} Routing · {state.snapshot.rates.length} Work Centers. Structure is locked; Master Data remains unchanged.
            </p>
          </section>

          <CostSummary result={result} />

          <EconomicSimulationPanel
            currentSnapshot={currentSnapshot}
            simulationCost={result.simulationCost}
            parameterSavingPerPiece={result.parameterSavingPerPiece}
            draft={state.economicInputs}
            onUpdate={onUpdateEconomicInput}
          />

          <section className="border border-slate-300 bg-white p-3" aria-labelledby="simulation-factors-title">
            <h2 id="simulation-factors-title" className="font-sans text-sm font-semibold text-slate-950">Factors to Simulate</h2>
            <p className="mt-1 text-xs text-slate-600">Selected factors show editable SIM values. Every edit recalculates the full snapshot.</p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
              {SIMULATION_FACTORS.map(factor => (
                <label key={factor} className="inline-flex min-h-8 items-center gap-2 text-xs text-slate-800">
                  <input
                    type="checkbox"
                    checked={state.selectedFactors.includes(factor)}
                    onChange={event => toggleFactor(factor, event.target.checked)}
                    className="h-4 w-4 accent-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                  />
                  <span>{FACTOR_DETAILS[factor].kind === 'bom' ? 'BOM' : 'Routing'} · {FACTOR_DETAILS[factor].label}</span>
                </label>
              ))}
            </div>
            {state.selectedFactors.length === 0 && (
              <p className="mt-2 text-[11px] text-slate-500">Select a factor to show its editable SIM values.</p>
            )}
          </section>

          <ParameterTable
            kind="bom"
            rows={bomRows}
            currentSnapshot={currentSnapshot}
            simulationSnapshot={state.snapshot}
            selectedFactors={state.selectedFactors}
            onUpdate={onUpdateParameter}
          />
          <ParameterTable
            kind="routing"
            rows={routingRows}
            currentSnapshot={currentSnapshot}
            simulationSnapshot={state.snapshot}
            selectedFactors={state.selectedFactors}
            onUpdate={onUpdateParameter}
          />
        </>
      )}
    </div>
  )
}
