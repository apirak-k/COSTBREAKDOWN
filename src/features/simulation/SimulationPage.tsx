import React, { useMemo } from 'react'
import { compareSnapshots, formatNumber } from '../../core'
import { calculateScenarioBusinessMetrics } from '../../core/calculations/scenario-business'
import { createScenarioFinancialResult, createScenarioStory } from '../../core/calculations/scenario-story'
import type { CostSnapshot, MasterDataRole, SnapshotBOMItem, SnapshotRoutingStep } from '../../core/types'
import { PageHeading } from '../../shared'
import { EconomicSimulationPanel } from './EconomicSimulationPanel'
import { SimulationStoryGraph } from './SimulationStoryGraph'
import { calculateEconomicSimulation, type EconomicSimulationField } from './simulation-economics'
import type { SimulationComparisonRow, SimulationRecordKind } from './simulation-engine'
import { calculateParameterSimulation } from './simulation-engine'
import type { SimulationFactor, SimulationParameter, SimulationWorkspaceState } from './simulation-state'
import { SIMULATION_PARAMETERS, simulationFactorId } from './simulation-state'
import type { RcaSimulationHandoffContext } from '../../state/rca-cases'

interface SimulationPageProps {
  state: SimulationWorkspaceState
  referenceSnapshot: CostSnapshot
  currentSnapshot: CostSnapshot
  rcaContext?: RcaSimulationHandoffContext | null
  onStartFrom: (role: MasterDataRole) => void
  onReset: () => void
  onSelectFactors: (factors: SimulationFactor[]) => void
  onUpdateParameter: (recordId: string, parameter: SimulationParameter, value: number | null) => void
  onUpdateEconomicInput: (field: EconomicSimulationField, value: string) => void
}

const SOURCES: Array<{ role: MasterDataRole; label: string }> = [
  { role: 'reference', label: 'Reference' },
  { role: 'current', label: 'Current' },
  { role: 'custom', label: 'Custom' }
]

function sourceChoicesForRcaHandoff() {
  return [
    ...SOURCES.filter(source => source.role === 'current'),
    ...SOURCES.filter(source => source.role !== 'current')
  ]
}

const PARAMETER_DETAILS: Record<SimulationParameter, { label: string; kind: SimulationRecordKind; displayScale: number }> = {
  'bom.price': { label: 'Price', kind: 'bom', displayScale: 1 },
  'bom.consumption': { label: 'Usage', kind: 'bom', displayScale: 1 },
  'bom.loss': { label: 'Loss', kind: 'bom', displayScale: 100 },
  'routing.manning': { label: 'Manning', kind: 'routing', displayScale: 1 },
  'routing.capacity': { label: 'Capacity', kind: 'routing', displayScale: 1 },
  'routing.yield': { label: 'Yield', kind: 'routing', displayScale: 100 }
}

function formatParameter(value: number | null, parameter: SimulationParameter): string {
  if (value === null || !Number.isFinite(value)) return '—'
  const { displayScale } = PARAMETER_DETAILS[parameter]
  const displayedValue = value * displayScale
  return displayScale === 100
    ? `${formatNumber(displayedValue, 1)}%`
    : formatNumber(displayedValue, 4)
}

function rowStatus(row: SimulationComparisonRow): string {
  if (row.identityIssue === 'ambiguous') return 'Ambiguous identity'
  if (row.identityIssue === 'unmatched') return 'Missing identity'
  return row.status ?? '—'
}

interface ParameterTableProps {
  kind: SimulationRecordKind
  rows: SimulationComparisonRow[]
  currentSnapshot: CostSnapshot
  simulationSnapshot: CostSnapshot
  selectedFactors: SimulationFactor[]
  onUpdate: (recordId: string, parameter: SimulationParameter, value: number | null) => void
}

const ParameterTable: React.FC<ParameterTableProps> = ({
  kind,
  rows,
  currentSnapshot,
  simulationSnapshot,
  selectedFactors,
  onUpdate
}) => {
  const parameters = SIMULATION_PARAMETERS.filter(parameter => PARAMETER_DETAILS[parameter].kind === kind)
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
              {parameters.map(parameter => (
                <React.Fragment key={parameter}>
                  <th scope="col" className="min-w-28 px-3 py-2 text-right">{PARAMETER_DETAILS[parameter].label} · Current</th>
                  <th scope="col" className="min-w-32 px-3 py-2 text-right">{PARAMETER_DETAILS[parameter].label} · SIM</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows.length === 0 ? (
              <tr><td colSpan={2 + parameters.length * 2} className="px-3 py-5 text-center text-xs text-slate-600">No {title} records.</td></tr>
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
                  {parameters.map(parameter => {
                    const field = PARAMETER_DETAILS[parameter].label.toLocaleLowerCase()
                    const currentValue = currentRecord ? (currentRecord as unknown as Record<string, number | null>)[PARAMETER_FIELDS[parameter]] ?? null : null
                    const simulationValue = simulationRecord ? (simulationRecord as unknown as Record<string, number | null>)[PARAMETER_FIELDS[parameter]] ?? null : null
                    const factor = simulationRecord ? simulationFactorId(kind, simulationRecord.id) : null
                    const editorVisible = factor !== null && selectedFactors.includes(factor) && canEdit

                    return (
                      <React.Fragment key={parameter}>
                        <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-600">
                          {currentRecord ? formatParameter(currentValue, parameter) : '—'}
                        </td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-900">
                          {!simulationRecord ? '—' : editorVisible ? (
                            <input
                              type="number"
                              step="any"
                              value={simulationValue === null ? '' : String(simulationValue * PARAMETER_DETAILS[parameter].displayScale)}
                              onChange={event => {
                                const raw = event.currentTarget.value
                                if (raw === '') onUpdate(simulationRecord.id, parameter, null)
                                else {
                                  const displayedValue = Number(raw)
                                  if (Number.isFinite(displayedValue)) {
                                    onUpdate(simulationRecord.id, parameter, displayedValue / PARAMETER_DETAILS[parameter].displayScale)
                                  }
                                }
                              }}
                              className="min-h-8 w-28 border border-blue-500 bg-white px-2 text-right font-mono text-xs tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-200"
                              aria-label={`${row.name} ${field} SIM value`}
                            />
                          ) : formatParameter(simulationValue, parameter)}
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

const PARAMETER_FIELDS: Record<SimulationParameter, string> = {
  'bom.price': 'price',
  'bom.consumption': 'consumption',
  'bom.loss': 'loss',
  'routing.manning': 'manning',
  'routing.capacity': 'capacity',
  'routing.yield': 'yield'
}

export const SimulationPage: React.FC<SimulationPageProps> = ({
  state,
  referenceSnapshot,
  currentSnapshot,
  rcaContext = null,
  onStartFrom,
  onReset,
  onSelectFactors,
  onUpdateParameter,
  onUpdateEconomicInput
}) => {
  const sourceLabel = SOURCES.find(source => source.role === state.sourceRole)?.label
  const startSources = rcaContext ? sourceChoicesForRcaHandoff() : SOURCES
  const result = useMemo(
    () => state.snapshot ? calculateParameterSimulation(currentSnapshot, state.snapshot) : null,
    [currentSnapshot, state.snapshot]
  )
  const referenceCurrent = useMemo(
    () => compareSnapshots(referenceSnapshot, currentSnapshot),
    [referenceSnapshot, currentSnapshot]
  )
  const economicResult = useMemo(
    () => calculateEconomicSimulation(
      currentSnapshot,
      result?.simulationCost ?? null,
      result?.parameterSavingPerPiece ?? null,
      state.economicInputs
    ),
    [currentSnapshot, result, state.economicInputs]
  )
  const story = useMemo(() => {
    if (!result || !economicResult) return null
    const referenceBusiness = calculateScenarioBusinessMetrics({
      sellingPrice: referenceSnapshot.product.sellingPrice ?? null,
      sgaPercent: referenceSnapshot.product.sgaPercent ?? null
    }, referenceCurrent.referenceCost.total)
    const currentBusiness = calculateScenarioBusinessMetrics({
      sellingPrice: currentSnapshot.product.sellingPrice ?? null,
      sgaPercent: currentSnapshot.product.sgaPercent ?? null
    }, referenceCurrent.currentCost.total)
    return createScenarioStory(
      createScenarioFinancialResult(referenceCurrent.referenceCost, referenceBusiness),
      createScenarioFinancialResult(referenceCurrent.currentCost, currentBusiness),
      createScenarioFinancialResult(result.simulationCost, economicResult.business)
    )
  }, [currentSnapshot, economicResult, referenceCurrent, referenceSnapshot, result])
  const bomRows = result?.records.filter(row => row.kind === 'bom') ?? []
  const routingRows = result?.records.filter(row => row.kind === 'routing') ?? []
  const selectableFactors = useMemo(() => {
    const seen = new Set<SimulationFactor>()
    return (result?.records ?? []).flatMap(row => {
      if (!row.simulationRecordId || !row.status || row.status === 'REMOVED' || row.identityIssue) return []
      const factor = simulationFactorId(row.kind, row.simulationRecordId)
      if (seen.has(factor)) return []
      seen.add(factor)
      return [{ factor, kind: row.kind, name: row.name }]
    })
  }, [result])

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
        description="What-if cost evaluation · Reference → Current → Simulated"
        actions={state.snapshot ? (
          <button type="button" onClick={onReset} className="min-h-8 border border-slate-300 bg-white px-3 text-xs font-medium text-slate-800 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">
            Reset
          </button>
        ) : undefined}
      />

      {rcaContext && (
        <section className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-slate-300 pb-2 text-xs" aria-label="RCA Case context">
          <span className="font-semibold text-slate-800">RCA Case {rcaContext.caseId}</span>
          <span className="text-slate-600">{rcaContext.candidateKeys.length} {rcaContext.candidateKeys.length === 1 ? 'Candidate' : 'Candidates'}{rcaContext.candidateKeys.length > 0 && <> · {rcaContext.candidateKeys.join(', ')}</>}</span>
          {(rcaContext.rootCause.trim() || rcaContext.action.trim()) && (
            <details className="ml-auto">
              <summary className="min-h-7 cursor-pointer text-[11px] font-medium text-slate-600 hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">RCA notes</summary>
              <div className="absolute right-4 z-20 mt-1 max-w-lg border border-slate-300 bg-white p-3 text-xs shadow-lg">
                {rcaContext.rootCause.trim() && <p><span className="font-semibold">Root Cause / Why?</span> · {rcaContext.rootCause}</p>}
                {rcaContext.action.trim() && <p className="mt-2"><span className="font-semibold">Action</span> · {rcaContext.action}</p>}
              </div>
            </details>
          )}
        </section>
      )}

      {!state.snapshot ? (
        <>
          <section className="border border-slate-300 bg-white p-3" aria-labelledby="simulation-start-title">
            <h2 id="simulation-start-title" className="font-sans text-sm font-semibold text-slate-950">Start SIM From</h2>
            <p className="mt-1 text-xs text-slate-600">SIM uses an isolated copy. Changes here do not update any Master Data workspace.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {startSources.map(source => (
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
          <EconomicSimulationPanel
            result={economicResult}
            draft={state.economicInputs}
            hasParameterSimulation={false}
            onUpdate={onUpdateEconomicInput}
          />
        </>
      ) : result && economicResult && (
        <>
          <section className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-slate-300 pb-2 text-xs" aria-label="Simulation basis">
            <span><span className="text-slate-500">SIM source</span> <strong className="font-semibold text-slate-900">{sourceLabel}</strong></span>
            <span><span className="text-slate-500">Compared with</span> <strong className="font-semibold text-slate-900">Current Working</strong></span>
            <span className="ml-auto text-[11px] text-slate-500">Temporary snapshot · structure locked · Master Data unchanged</span>
          </section>

          {story && (
            <SimulationStoryGraph
              story={story}
              parameterSaving={result.parameterSavingPerPiece}
              requiredSaving={economicResult.requiredSavingPerPiece}
              economicMargin={economicResult.economicMarginPerPiece}
              warnings={result.comparison.warnings.map(warning => warning.message)}
            />
          )}

          <EconomicSimulationPanel
            result={economicResult}
            draft={state.economicInputs}
            hasParameterSimulation
            showResults={false}
            onUpdate={onUpdateEconomicInput}
          />

          <section className="border-t border-slate-300 pt-2" aria-labelledby="simulation-factors-title">
            <h2 id="simulation-factors-title" className="font-sans text-xs font-semibold text-slate-950">Factors to Simulate</h2>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
              {selectableFactors.map(({ factor, kind, name }) => (
                <label key={factor} className="inline-flex min-h-8 items-center gap-2 text-xs text-slate-800">
                  <input
                    type="checkbox"
                    checked={state.selectedFactors.includes(factor)}
                    onChange={event => toggleFactor(factor, event.target.checked)}
                    aria-label={`Select ${kind === 'bom' ? 'Material' : 'Process'} factor ${name}`}
                    className="h-4 w-4 accent-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                  />
                  <span>{kind === 'bom' ? 'Material' : 'Process'} · {name}</span>
                </label>
              ))}
            </div>
            {state.selectedFactors.length === 0 && selectableFactors.length > 0 && (
              <p className="mt-2 text-[11px] text-slate-500">Select one or more records to show their editable SIM values.</p>
            )}
            {selectableFactors.length === 0 && <p className="mt-2 text-[11px] text-slate-500">No editable SIM records are available to select.</p>}
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
