import { useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'
import { formatNumber } from '../../core'
import type { CostSnapshot } from '../../core/types'
import { NumericInput } from '../../shared/ui/NumericInput'
import { SimulationHistoryInputBoundary } from './SimulationHistoryInputBoundary'
import type { EconomicSimulationDraft, EconomicSimulationResult, EconomicSimulationField } from './simulation-economics'

interface EconomicSimulationPanelProps {
  result: EconomicSimulationResult
  draft: EconomicSimulationDraft
  currentSnapshot: CostSnapshot
  unit: string
  onUpdate: (field: EconomicSimulationField, value: string) => void
  onBeginEdit: () => void
  onCommitEdit: () => void
}

function formatValue(value: number | null): string {
  return value === null || !Number.isFinite(value) ? '—' : formatNumber(value, 2)
}

function formatQuantity(value: number | null, unit: string): string {
  return value === null || !Number.isSafeInteger(value) ? '—' : `${formatNumber(value, 0)} ${unit}`
}

function effectiveInputValue(
  field: EconomicSimulationField,
  draft: EconomicSimulationDraft,
  currentSnapshot: CostSnapshot
): number | null {
  if (draft[field].trim() !== '') return Number(draft[field])
  if (field === 'sellingPriceOverride') {
    const value = currentSnapshot.product.sellingPrice
    return value !== null && value !== undefined && Number.isFinite(value) && value >= 0 ? value : null
  }
  if (field === 'sgaPercentOverride') {
    const value = currentSnapshot.product.sgaPercent
    return value !== null && value !== undefined && Number.isFinite(value) && value >= 0 && value <= 100 ? value : null
  }
  return null
}

function BreakEvenGraph({
  result,
  unit,
  onBatchSizeChange
}: {
  result: EconomicSimulationResult
  unit: string
  onBatchSizeChange: (value: string) => void
}) {
  const [markerFocused, setMarkerFocused] = useState(false)
  const width = 560
  const height = 152
  const plot = { left: 56, right: 540, top: 13, bottom: 112 }
  const batchSize = result.batchSize
  const referenceQuantity = result.preciseBreakEvenQuantity ?? 0
  const baseMax = Math.max(1, batchSize ?? 0, referenceQuantity)
  const xMax = Number.isFinite(baseMax * 1.12) ? Math.max(5, baseMax * 1.12) : baseMax
  const toX = (quantity: number) => plot.left + (quantity / xMax) * (plot.right - plot.left)
  const savingAtEnd = result.parameterSavingPerPiece === null
    ? null
    : result.parameterSavingPerPiece * xMax
  const actionCostAtEnd = result.fixedActionCost === null || result.variableActionCostPerPiece === null
    ? null
    : result.fixedActionCost + result.variableActionCostPerPiece * xMax
  const validSavingAtEnd = savingAtEnd !== null && Number.isFinite(savingAtEnd) ? savingAtEnd : null
  const validActionCostAtEnd = actionCostAtEnd !== null && Number.isFinite(actionCostAtEnd) ? actionCostAtEnd : null
  const finiteYValues = [0, validSavingAtEnd, validActionCostAtEnd].filter((value): value is number => value !== null)
  const rawMin = Math.min(...finiteYValues)
  const rawMax = Math.max(...finiteYValues)
  const span = rawMax - rawMin || 1
  const yMin = rawMin - span * 0.08
  const yMax = rawMax + span * 0.08
  const toY = (value: number) => plot.top + ((yMax - value) / (yMax - yMin)) * (plot.bottom - plot.top)
  const savingLine = validSavingAtEnd === null || result.parameterSavingPerPiece === null
    ? null
    : `M ${toX(0)} ${toY(0)} L ${toX(xMax)} ${toY(validSavingAtEnd)}`
  const actionCostLine = validActionCostAtEnd === null || result.fixedActionCost === null || result.variableActionCostPerPiece === null
    ? null
    : `M ${toX(0)} ${toY(result.fixedActionCost)} L ${toX(xMax)} ${toY(validActionCostAtEnd)}`
  const breakEvenQuantity = result.preciseBreakEvenQuantity
  const breakEvenValue = breakEvenQuantity === null || result.parameterSavingPerPiece === null
    ? null
    : result.parameterSavingPerPiece * breakEvenQuantity
  const finiteBreakEvenValue = breakEvenValue !== null && Number.isFinite(breakEvenValue) ? breakEvenValue : null
  const markerX = batchSize === null ? null : toX(batchSize)
  const batchMax = Math.min(Number.MAX_SAFE_INTEGER, Math.max(1, Math.ceil(xMax)))

  const updateBatchFromPointer = (event: PointerEvent<SVGGElement>) => {
    const bounds = event.currentTarget.ownerSVGElement?.getBoundingClientRect()
    if (!bounds || bounds.width <= 0) return
    const svgX = ((event.clientX - bounds.left) / bounds.width) * width
    const ratio = Math.max(0, Math.min(1, (svgX - plot.left) / (plot.right - plot.left)))
    onBatchSizeChange(String(Math.max(1, Math.min(batchMax, Math.round(ratio * xMax)))))
  }

  const handleBatchKeyDown = (event: KeyboardEvent<SVGGElement>) => {
    if (batchSize === null) return
    const step = event.shiftKey ? 10 : 1
    const increments: Record<string, number> = {
      ArrowRight: step,
      ArrowUp: step,
      ArrowLeft: -step,
      ArrowDown: -step,
      PageUp: 10,
      PageDown: -10
    }
    if (event.key === 'Home') {
      event.preventDefault()
      onBatchSizeChange('1')
    } else if (event.key === 'End') {
      event.preventDefault()
      onBatchSizeChange(String(batchMax))
    } else if (increments[event.key] !== undefined) {
      event.preventDefault()
      onBatchSizeChange(String(Math.max(1, Math.min(batchMax, batchSize + increments[event.key]))))
    }
  }

  return (
    <figure aria-labelledby="break-even-graph-title" className="mt-1 border-t border-slate-200 pt-1">
      <figcaption id="break-even-graph-title" className="mb-0.5 text-[10px] font-semibold text-slate-700">Break-even Graph</figcaption>
      <svg
        role="group"
        aria-labelledby="break-even-graph-title"
        aria-describedby="break-even-graph-description"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="block h-[112px] w-full"
      >
        <title>Break-even graph</title>
        <desc id="break-even-graph-description">Cumulative Parameter Saving compared with Total Action Cost by production quantity. The vertical Batch Size marker is draggable and keyboard accessible.</desc>
        {[0, 1, 2, 3].map(index => {
          const ratio = index / 3
          const value = yMin + (yMax - yMin) * ratio
          const y = toY(value)
          return <g key={index}>
            <line x1={plot.left} x2={plot.right} y1={y} y2={y} stroke="#e2e8f0" strokeWidth="1" />
            <text x={plot.left - 5} y={y + 3} textAnchor="end" fill="#64748b" fontSize="8" fontFamily="ui-monospace, monospace">{formatNumber(value, 0)}</text>
          </g>
        })}
        <line x1={plot.left} x2={plot.left} y1={plot.top} y2={plot.bottom} stroke="#94a3b8" strokeWidth="1" />
        <line x1={plot.left} x2={plot.right} y1={plot.bottom} y2={plot.bottom} stroke="#64748b" strokeWidth="1" />
        {savingLine && <path d={savingLine} fill="none" stroke="#2563eb" strokeWidth="2">
          <title>{`Cumulative Parameter Saving: ${formatValue(result.parameterSavingPerPiece)} THB/${unit} × quantity`}</title>
        </path>}
        {actionCostLine && <path d={actionCostLine} fill="none" stroke="#c2410c" strokeWidth="2">
          <title>{`Total Action Cost: ${formatValue(result.fixedActionCost)} THB + ${formatValue(result.variableActionCostPerPiece)} THB/${unit} × quantity`}</title>
        </path>}
        {breakEvenQuantity !== null && finiteBreakEvenValue !== null && (
          <circle cx={toX(breakEvenQuantity)} cy={toY(finiteBreakEvenValue)} r="3.5" fill="#111827" stroke="white" strokeWidth="1.5">
            <title>{`Break-even Quantity: ${formatQuantity(result.breakEvenQuantity, unit)}`}</title>
          </circle>
        )}
        {batchSize !== null && markerX !== null && (
          <g
            role="slider"
            tabIndex={0}
            aria-label="Batch Size"
            aria-orientation="horizontal"
            aria-valuemin={1}
            aria-valuemax={batchMax}
            aria-valuenow={batchSize}
            aria-valuetext={`${formatNumber(batchSize, 0)} ${unit}`}
            aria-describedby="break-even-graph-description"
            onPointerDown={event => {
              if (event.button !== 0) return
              event.currentTarget.setPointerCapture(event.pointerId)
              updateBatchFromPointer(event)
            }}
            onPointerMove={event => { if (event.buttons !== 0) updateBatchFromPointer(event) }}
            onPointerUp={event => {
              updateBatchFromPointer(event)
              if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
            }}
            onPointerCancel={event => {
              if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
            }}
            onKeyDown={handleBatchKeyDown}
            onFocus={() => setMarkerFocused(true)}
            onBlur={() => setMarkerFocused(false)}
            className="cursor-ew-resize touch-none focus-visible:outline-none"
          >
            <title>{`Batch Size: ${formatQuantity(batchSize, unit)}. Drag horizontally or use arrow keys to adjust.`}</title>
            <line x1={markerX} x2={markerX} y1={plot.top} y2={plot.bottom} stroke="transparent" strokeWidth="12" pointerEvents="stroke" />
            <line x1={markerX} x2={markerX} y1={plot.top} y2={plot.bottom} stroke="#0f766e" strokeWidth="1.5" strokeDasharray="3 3" pointerEvents="none" />
            <circle cx={markerX} cy={plot.bottom} r={markerFocused ? 5 : 4} fill="#0f766e" stroke={markerFocused ? '#0f172a' : 'white'} strokeWidth="1.5" pointerEvents="none" />
            <text x={markerX} y={plot.top + 8} textAnchor="middle" fill="#0f766e" fontSize="8" fontWeight="700" pointerEvents="none">Batch</text>
          </g>
        )}
        {[0, 0.5, 1].map(ratio => {
          const x = plot.left + ratio * (plot.right - plot.left)
          return <text key={ratio} x={x} y={plot.bottom + 12} textAnchor={ratio === 0 ? 'start' : ratio === 1 ? 'end' : 'middle'} fill="#64748b" fontSize="8" fontFamily="ui-monospace, monospace">{formatNumber(xMax * ratio, 0)}</text>
        })}
        <text x={plot.left} y={height - 3} fill="#64748b" fontSize="8">Quantity ({unit})</text>
        <text x={plot.left} y={plot.top - 3} fill="#64748b" fontSize="8">THB</text>
      </svg>
      <div className="flex flex-wrap gap-x-3 text-[9px] text-slate-600" aria-label="Break-even graph legend">
        <span className="inline-flex items-center gap-1"><i aria-hidden="true" className="h-0.5 w-3 bg-blue-600" />Cumulative Parameter Saving</span>
        <span className="inline-flex items-center gap-1"><i aria-hidden="true" className="h-0.5 w-3 bg-orange-700" />Total Action Cost</span>
      </div>
    </figure>
  )
}

export function EconomicSimulationPanel({ result, draft, currentSnapshot, unit, onUpdate, onBeginEdit, onCommitEdit }: EconomicSimulationPanelProps) {
  const normalizedUnit = unit.trim() || 'Unit'
  const inputs: Array<{
    field: EconomicSimulationField
    label: string
    unit: string
    precision: number
    integer?: boolean
    placeholder?: string
    min?: number
    max?: number
  }> = [
    { field: 'fixedActionCost', label: 'Fixed Action Cost', unit: 'THB', precision: 2, min: 0 },
    { field: 'batchSize', label: 'Batch Size', unit: normalizedUnit, precision: 0, integer: true, min: 1 },
    { field: 'variableActionCostPerPiece', label: 'Variable Action Cost / Unit', unit: `THB/${normalizedUnit}`, precision: 2, min: 0 },
    { field: 'sellingPriceOverride', label: 'Selling Price', unit: `THB/${normalizedUnit}`, precision: 2, placeholder: 'Current', min: 0 },
    { field: 'sgaPercentOverride', label: 'SG&A', unit: '%', precision: 2, placeholder: 'Current', min: 0, max: 100 }
  ]

  const economicOutputs = [
    {
      label: 'Parameter Saving / Unit', formula: 'Current Standard Cost − SIM Standard Cost', value: result.parameterSavingPerPiece,
      className: result.parameterSavingPerPiece === null ? 'text-slate-500'
        : result.parameterSavingPerPiece > 0 ? 'text-emerald-800'
          : result.parameterSavingPerPiece < 0 ? 'text-rose-800' : 'text-slate-600'
    },
    {
      label: 'Required Saving / Unit', formula: '(Fixed Action Cost ÷ Batch Size) + Variable Action Cost / Unit', value: result.requiredSavingPerPiece,
      className: 'text-slate-900'
    },
    {
      label: 'Economic Margin / Unit', formula: 'Parameter Saving / Unit − Required Saving / Unit', value: result.economicMarginPerPiece,
      className: result.economicMarginPerPiece === null ? 'text-slate-500'
        : result.economicMarginPerPiece > 0 ? 'text-emerald-800'
          : result.economicMarginPerPiece < 0 ? 'text-rose-800' : 'text-slate-600'
    }
  ]
  const businessOutputs = [
    { label: 'SIM Standard Cost', value: result.simulationStandardCost, className: 'text-slate-900' },
    { label: 'SG&A / Unit', value: result.sgaPerPiece, className: 'text-slate-900' },
    {
      label: 'Operating Profit / Unit', value: result.operatingProfitPerPiece,
      className: result.operatingProfitPerPiece === null ? 'text-slate-500'
        : result.operatingProfitPerPiece > 0 ? 'text-emerald-800'
          : result.operatingProfitPerPiece < 0 ? 'text-rose-800' : 'text-slate-600'
    }
  ]

  return (
    <div data-safe-workspace-interaction="true" className="min-w-0 border border-slate-300 bg-white" aria-label="Economic and Business">
      <div className="grid min-w-0 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,.9fr)]">
        <section className="min-w-0 px-2.5 py-1.5 lg:border-r lg:border-slate-200" aria-labelledby="economic-simulation-title">
          <h2 id="economic-simulation-title" className="border-b border-slate-200 pb-1 text-xs font-semibold text-slate-900">Economic</h2>
          <div className="mt-1 grid grid-cols-1 gap-x-2 gap-y-1.5 sm:grid-cols-3">
            {inputs.slice(0, 3).map(({ field, label, unit: fieldUnit, precision, integer, placeholder, min, max }) => (
              <label key={field} className="flex min-w-0 items-center gap-1 text-[9px] font-medium text-slate-700">
                <span className="min-w-0 flex-1 leading-3">{label}<span className="ml-1 font-normal text-slate-500">{fieldUnit}</span></span>
                <span className="w-[5.25rem] shrink-0">
                  <SimulationHistoryInputBoundary onBegin={onBeginEdit} onCommit={onCommitEdit}>
                    <NumericInput
                      value={effectiveInputValue(field, draft, currentSnapshot)}
                      precision={precision}
                      integer={integer}
                      min={min}
                      max={max}
                      placeholder={placeholder}
                      onValueChange={value => onUpdate(field, value === null ? '' : String(value))}
                      aria-label={label}
                      className="h-7 w-full border border-slate-300 bg-white px-1.5 text-right text-[11px] text-slate-950 focus:border-blue-700 focus:ring-1 focus:ring-blue-100"
                    />
                  </SimulationHistoryInputBoundary>
                </span>
              </label>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-1 gap-x-3 gap-y-0 border-t border-slate-200 pt-0.5 sm:grid-cols-2">
            {economicOutputs.map(({ label, formula, value, className }) => (
              <div key={label} className="flex min-w-0 items-baseline justify-between gap-1 py-0.5" title={formula}>
                <span className="truncate text-[9px] text-slate-600">{label}</span>
                <span className={`shrink-0 font-mono text-[10px] font-semibold tabular-nums ${className}`}>{formatValue(value)}<span className="ml-0.5 text-[8px] font-normal text-slate-500">THB/{normalizedUnit}</span></span>
              </div>
            ))}
            <div className="flex min-w-0 items-baseline justify-between gap-1 py-0.5" title="Fixed Action Cost ÷ (Parameter Saving / Unit − Variable Action Cost / Unit)">
              <span className="truncate text-[9px] text-slate-600">Break-even Quantity</span>
              <span className={`shrink-0 font-mono text-[10px] font-semibold tabular-nums ${result.breakEvenNotAchievable ? 'text-slate-500' : 'text-slate-900'}`}>
                {result.breakEvenNotAchievable ? 'Not achievable' : formatQuantity(result.breakEvenQuantity, normalizedUnit)}
              </span>
            </div>
          </div>
          <SimulationHistoryInputBoundary onBegin={onBeginEdit} onCommit={onCommitEdit}>
            <BreakEvenGraph result={result} unit={normalizedUnit} onBatchSizeChange={value => onUpdate('batchSize', value)} />
          </SimulationHistoryInputBoundary>
        </section>

        <section className="min-w-0 border-t border-slate-200 px-2.5 py-1.5 lg:border-t-0" aria-labelledby="simulation-business-title">
          <h2 id="simulation-business-title" className="border-b border-slate-200 pb-1 text-xs font-semibold text-slate-900">Business</h2>
          <div className="mt-1 grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-1">
            {inputs.slice(3).map(({ field, label, unit: fieldUnit, precision, placeholder, min, max }) => (
              <label key={field} className="flex min-w-0 items-center justify-between gap-2 text-[9px] font-medium text-slate-700">
                <span>{label}<span className="ml-1 font-normal text-slate-500">{fieldUnit}</span></span>
                <span className="w-[5.25rem] shrink-0">
                  <SimulationHistoryInputBoundary onBegin={onBeginEdit} onCommit={onCommitEdit}>
                    <NumericInput
                      value={effectiveInputValue(field, draft, currentSnapshot)}
                      precision={precision}
                      min={min}
                      max={max}
                      placeholder={placeholder}
                      onValueChange={value => onUpdate(field, value === null ? '' : String(value))}
                      aria-label={label}
                      className="h-7 w-full border border-slate-300 bg-white px-1.5 text-right text-[11px] text-slate-950 focus:border-blue-700 focus:ring-1 focus:ring-blue-100"
                    />
                  </SimulationHistoryInputBoundary>
                </span>
              </label>
            ))}
          </div>
          <div className="mt-1 border-t border-slate-200 pt-1">
            {businessOutputs.map(({ label, value, className }) => (
              <div key={label} className="flex min-w-0 items-baseline justify-between gap-1 py-0.5">
                <span className="truncate text-[9px] text-slate-600">{label}</span>
                <span className={`shrink-0 font-mono text-[10px] font-semibold tabular-nums ${className}`}>{formatValue(value)}<span className="ml-0.5 text-[8px] font-normal text-slate-500">THB/{normalizedUnit}</span></span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
