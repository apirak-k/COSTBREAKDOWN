import { useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'
import { formatNumber } from '../../core'
import type { CostSnapshot } from '../../core/types'
import { BusinessNumber } from '../../shared/ui/BusinessNumber'
import { formatBusinessNumber } from '../../shared/ui/numeric-display'
import { NumericInput } from '../../shared/ui/NumericInput'
import { SimulationHistoryInputBoundary } from './SimulationHistoryInputBoundary'
import type { EconomicSimulationDraft, EconomicSimulationResult, EconomicSimulationField } from './simulation-economics'

interface EconomicSimulationPanelProps {
  result: EconomicSimulationResult
  draft: EconomicSimulationDraft
  afterSnapshot: CostSnapshot
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
  afterSnapshot: CostSnapshot
): number | null {
  if (draft[field].trim() !== '') return Number(draft[field])
  if (field === 'sellingPriceOverride') {
    const value = afterSnapshot.product.sellingPrice
    return value !== null && value !== undefined && Number.isFinite(value) && value >= 0 ? value : null
  }
  if (field === 'sgaPercentOverride') {
    const value = afterSnapshot.product.sgaPercent
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
  const [dragScaleMax, setDragScaleMax] = useState<number | null>(null)
  const dragStartRef = useRef<{ pointerId: number; pointerX: number; batchSize: number; xMax: number } | null>(null)
  const width = 560
  const height = 152
  const plot = { left: 52, right: 544, top: 12, bottom: 117 }
  const batchSize = result.batchSize
  const referenceQuantity = result.preciseBreakEvenQuantity ?? 0
  const baseMax = Math.max(1, batchSize ?? 0, referenceQuantity)
  const naturalXMax = Number.isFinite(baseMax * 1.12) ? Math.max(5, baseMax * 1.12) : baseMax
  const xMax = dragScaleMax ?? naturalXMax
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

  const getPointerSvgX = (event: PointerEvent<SVGGElement>) => {
    const bounds = event.currentTarget.ownerSVGElement?.getBoundingClientRect()
    if (!bounds || bounds.width <= 0) return null
    return ((event.clientX - bounds.left) / bounds.width) * width
  }

  const updateBatchFromPointer = (event: PointerEvent<SVGGElement>) => {
    const dragStart = dragStartRef.current
    const pointerX = getPointerSvgX(event)
    if (!dragStart || pointerX === null || dragStart.pointerId !== event.pointerId) return
    const delta = Math.round((pointerX - dragStart.pointerX) / (plot.right - plot.left) * dragStart.xMax)
    const dragBatchMax = Math.min(Number.MAX_SAFE_INTEGER, Math.max(1, Math.ceil(dragStart.xMax)))
    onBatchSizeChange(String(Math.max(1, Math.min(dragBatchMax, dragStart.batchSize + delta))))
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
    <figure data-safe-workspace-interaction="true" aria-labelledby="break-even-graph-title" className="min-w-0 border border-slate-300 bg-white px-2.5 py-1.5 xl:flex xl:min-h-0 xl:flex-col">
      <figcaption id="break-even-graph-title" className="mb-0.5 flex min-w-0 shrink-0 items-center justify-between gap-1 text-[10px] font-semibold text-slate-700 xl:mb-0">
        <span className="flex min-w-0 items-baseline gap-1 whitespace-nowrap">
          <span>Break-even</span>
          <span className="text-[9px] font-normal text-slate-500">({result.breakEvenNotAchievable ? 'Not achieved' : formatQuantity(result.breakEvenQuantity, unit)})</span>
        </span>
        <span role="group" aria-label="Break-even graph legend" className="flex shrink-0 items-center gap-1.5 text-[9px] font-normal text-slate-600">
          <span role="img" aria-label="Cumulative Parameter Saving" className="inline-flex items-center gap-1 whitespace-nowrap"><i aria-hidden="true" className="h-0.5 w-3 bg-blue-600" />Saving</span>
          <span role="img" aria-label="Total Action Cost" className="inline-flex items-center gap-1 whitespace-nowrap"><i aria-hidden="true" className="h-0.5 w-3 bg-orange-700" />Action Cost</span>
        </span>
      </figcaption>
      <div
        className="relative min-w-0 xl:min-h-0 xl:flex-1"
      >
        <svg
          role="group"
          aria-labelledby="break-even-graph-title"
          aria-describedby="break-even-graph-description"
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="block h-[112px] w-full xl:h-full xl:min-h-0 xl:flex-1"
        >
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
        {savingLine && <path
          role="img"
          aria-label={`Cumulative Parameter Saving: ${formatValue(result.parameterSavingPerPiece)} THB/${unit} × quantity`}
          d={savingLine}
          fill="none"
          stroke="#2563eb"
          strokeWidth="2"
        />}
        {actionCostLine && <path
          role="img"
          aria-label={`Total Action Cost: ${formatValue(result.fixedActionCost)} THB + ${formatValue(result.variableActionCostPerPiece)} THB/${unit} × quantity`}
          d={actionCostLine}
          fill="none"
          stroke="#c2410c"
          strokeWidth="2"
        />}
        {breakEvenQuantity !== null && finiteBreakEvenValue !== null && (
          <circle
            role="img"
            aria-label={`Break-even Quantity: ${formatQuantity(result.breakEvenQuantity, unit)}`}
            cx={toX(breakEvenQuantity)}
            cy={toY(finiteBreakEvenValue)}
            r="3.5"
            fill="#111827"
            stroke="white"
            strokeWidth="1.5"
          />
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
              event.currentTarget.focus()
              const pointerX = getPointerSvgX(event)
              if (pointerX === null) return
              dragStartRef.current = { pointerId: event.pointerId, pointerX, batchSize, xMax }
              setDragScaleMax(xMax)
            }}
            onPointerMove={updateBatchFromPointer}
            onPointerUp={event => {
              updateBatchFromPointer(event)
              dragStartRef.current = null
              setDragScaleMax(null)
              if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
            }}
            onPointerCancel={event => {
              dragStartRef.current = null
              setDragScaleMax(null)
              if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
            }}
            onKeyDown={handleBatchKeyDown}
            onFocus={() => setMarkerFocused(true)}
            onBlur={() => setMarkerFocused(false)}
            className="cursor-ew-resize touch-none outline-none focus-visible:outline-none"
          >
            <line x1={markerX} x2={markerX} y1={plot.top} y2={plot.bottom} stroke="transparent" strokeWidth="12" pointerEvents="stroke" />
            <line x1={markerX} x2={markerX} y1={plot.top} y2={plot.bottom} stroke="#0f766e" strokeWidth={markerFocused ? '2.5' : '1.5'} strokeDasharray="3 3" pointerEvents="none" />
            <circle cx={markerX} cy={plot.bottom} r={markerFocused ? 6 : 4} fill="#0f766e" stroke={markerFocused ? '#0f172a' : 'white'} strokeWidth={markerFocused ? '2' : '1.5'} pointerEvents="none" />
            <text x={markerX} y={plot.top + 8} textAnchor="middle" fill="#0f766e" fontSize="8" fontWeight="700" pointerEvents="none">Batch</text>
          </g>
        )}
        {[0, 0.5, 1].map(ratio => {
          const x = plot.left + ratio * (plot.right - plot.left)
          return <text key={ratio} x={x} y={plot.bottom + 12} textAnchor={ratio === 0 ? 'start' : ratio === 1 ? 'end' : 'middle'} fill="#64748b" fontSize="8" fontFamily="ui-monospace, monospace">{formatNumber(xMax * ratio, 0)}</text>
        })}
        <text x={plot.right} y={height - 3} textAnchor="end" fill="#64748b" fontSize="10">QTY ({unit})</text>
        <text x={plot.left} y={plot.top - 3} fill="#64748b" fontSize="8">THB</text>
        </svg>
      </div>
    </figure>
  )
}

export function EconomicBreakEvenGraphPanel({
  result,
  unit,
  onBatchSizeChange,
  onBeginEdit,
  onCommitEdit
}: {
  result: EconomicSimulationResult
  unit: string
  onBatchSizeChange: (value: string) => void
  onBeginEdit: () => void
  onCommitEdit: () => void
}) {
  return (
    <SimulationHistoryInputBoundary onBegin={onBeginEdit} onCommit={onCommitEdit}>
      <BreakEvenGraph result={result} unit={unit.trim() || 'Unit'} onBatchSizeChange={onBatchSizeChange} />
    </SimulationHistoryInputBoundary>
  )
}

export function EconomicSimulationPanel({ result, draft, afterSnapshot, unit, onUpdate, onBeginEdit, onCommitEdit }: EconomicSimulationPanelProps) {
  const normalizedUnit = unit.trim() || 'Unit'
  const inputs: Array<{
    field: EconomicSimulationField
    label: string
    ariaLabel?: string
    unit: string
    integer?: boolean
    min?: number
    max?: number
  }> = [
    { field: 'variableActionCostPerPiece', label: 'Variable Action Cost', ariaLabel: 'Variable Action Cost / Unit', unit: `THB/${normalizedUnit}`, min: 0 },
    { field: 'fixedActionCost', label: 'Fixed Action Cost', unit: 'THB', min: 0 },
    { field: 'batchSize', label: 'Batch Size', unit: normalizedUnit, integer: true, min: 1 },
    { field: 'sellingPriceOverride', label: 'Selling Price', unit: `THB/${normalizedUnit}`, min: 0 },
    { field: 'sgaPercentOverride', label: 'SG&A %', unit: '', min: 0, max: 100 }
  ]

  const economicOutputs: Array<{
    label: string
    ariaLabel: string
    formula: string
    value: number | null
    displayValue?: string
    className: string
  }> = [
    {
      label: 'Parameter Saving', ariaLabel: 'Parameter Saving / Unit', formula: 'Current Standard Cost − SIM Standard Cost', value: result.parameterSavingPerPiece,
      className: result.parameterSavingPerPiece === null ? 'text-slate-500'
        : result.parameterSavingPerPiece > 0 ? 'text-emerald-700'
          : result.parameterSavingPerPiece < 0 ? 'text-rose-800' : 'text-slate-600'
    },
    {
      label: 'Required Saving', ariaLabel: 'Required Saving / Unit', formula: '(Fixed Action Cost ÷ Batch Size) + Variable Action Cost / Unit', value: result.requiredSavingPerPiece,
      className: 'text-slate-900'
    },
    {
      label: 'Economic Margin', ariaLabel: 'Economic Margin / Unit', formula: 'Parameter Saving / Unit − Required Saving / Unit', value: result.economicMarginPerPiece,
      className: result.economicMarginPerPiece === null ? 'text-slate-500'
        : result.economicMarginPerPiece > 0 ? 'text-emerald-700'
          : result.economicMarginPerPiece < 0 ? 'text-rose-800' : 'text-slate-600'
    }
  ]
  economicOutputs.push({
    label: 'Operating Profit',
    ariaLabel: 'Operating Profit / Unit',
    formula: 'Effective After Selling Price − effective After Standard Cost − SG&A / Unit',
    value: result.operatingProfitPerPiece,
    className: result.operatingProfitPerPiece === null ? 'text-slate-500'
      : result.operatingProfitPerPiece > 0 ? 'text-emerald-700'
        : result.operatingProfitPerPiece < 0 ? 'text-rose-800' : 'text-slate-600'
  })
  economicOutputs.push({
    label: 'Break-even Qty',
    ariaLabel: 'Break-even Quantity',
    formula: 'Fixed Action Cost ÷ (Parameter Saving / Unit − Variable Action Cost / Unit)',
    value: null,
    displayValue: result.breakEvenNotAchievable ? 'Not achieved' : result.breakEvenQuantity === null || !Number.isSafeInteger(result.breakEvenQuantity) ? '—' : `${formatBusinessNumber(result.breakEvenQuantity, { integer: true })} ${normalizedUnit}`,
    className: 'text-slate-600'
  })
  return (
    <div data-safe-workspace-interaction="true" data-simulation-layout-column="inputs" aria-label="Economic and Business" className="grid min-w-0 divide-y divide-slate-200 border border-slate-300 bg-white xl:h-full xl:min-h-0 xl:grid-rows-[minmax(min-content,.95fr)_minmax(0,2.45fr)]">
      <section className="min-w-0 px-2.5 py-1.5 xl:min-h-0" aria-labelledby="simulation-business-inputs-title">
          <h2 id="simulation-business-inputs-title" className="text-xs font-semibold text-slate-900">Business</h2>
          <div className="mt-1 grid grid-cols-1 gap-y-1 xl:mt-0.5">
            {inputs.slice(3).map(({ field, label, ariaLabel, unit: fieldUnit, min, max }) => (
              <label key={field} className="flex min-w-0 flex-col gap-0.5 text-[9px] font-medium leading-3 text-slate-700">
                <span>{label}<span className="ml-1 font-normal text-slate-500">{fieldUnit}</span></span>
                <span className="w-full min-w-0">
                  <SimulationHistoryInputBoundary onBegin={onBeginEdit} onCommit={onCommitEdit}>
                    <NumericInput
                      value={effectiveInputValue(field, draft, afterSnapshot)}
                      min={min}
                      max={max}
                      onValueChange={value => onUpdate(field, value === null ? '' : String(value))}
                      aria-label={ariaLabel ?? label}
                      className="h-7 w-full border border-slate-300 bg-white px-1.5 text-right text-[11px] text-slate-950 focus:border-blue-700 focus:ring-1 focus:ring-blue-100 xl:h-6"
                    />
                  </SimulationHistoryInputBoundary>
                </span>
              </label>
            ))}
          </div>
      </section>

      <section className="min-w-0 px-2.5 py-1.5 xl:min-h-0" aria-labelledby="simulation-economic-inputs-title">
          <h2 id="simulation-economic-inputs-title" className="text-xs font-semibold text-slate-900">Economic</h2>
          <div className="mt-1 grid min-w-0 grid-cols-1 gap-y-1 xl:mt-0.5">
            {inputs.slice(0, 3).map(({ field, label, ariaLabel, unit: fieldUnit, integer, min, max }) => (
              <label key={field} className="flex min-w-0 flex-col gap-0.5 text-[9px] font-medium leading-3 text-slate-700">
                <span>{label}<span className="ml-1 font-normal text-slate-500">{fieldUnit}</span></span>
                <span className="w-full min-w-0">
                  <SimulationHistoryInputBoundary onBegin={onBeginEdit} onCommit={onCommitEdit}>
                    <NumericInput
                      value={effectiveInputValue(field, draft, afterSnapshot)}
                      integer={integer}
                      min={min}
                      max={max}
                      onValueChange={value => onUpdate(field, value === null ? '' : String(value))}
                      aria-label={ariaLabel ?? label}
                      className="h-7 w-full border border-slate-300 bg-white px-1.5 text-right text-[11px] text-slate-950 focus:border-blue-700 focus:ring-1 focus:ring-blue-100 xl:h-6"
                    />
                  </SimulationHistoryInputBoundary>
                </span>
              </label>
            ))}
          </div>
          <div role="group" aria-labelledby="simulation-economic-outcome-title" className="mt-2 border-t border-slate-200 pt-1">
            <div className="flex min-w-0 items-baseline justify-between gap-1 text-[9px] text-slate-500">
              <h3 id="simulation-economic-outcome-title" className="font-medium">Outcome</h3>
              <span>THB/{normalizedUnit}</span>
            </div>
            <div className="mt-1 grid grid-cols-1 gap-y-0">
              {economicOutputs.map(({ label, ariaLabel, formula, value, displayValue, className }) => (
                <div key={label} role="group" aria-label={ariaLabel} className={`flex min-w-0 items-baseline justify-between gap-1 py-0.5 xl:py-0 ${label === 'Break-even Qty' || label === 'Operating Profit' ? 'mt-1 border-t border-slate-200 pt-1' : ''}`} title={formula}>
                  <span className="text-[9px] text-slate-600">{label}</span>
                  <span className={`shrink-0 font-mono text-[10px] font-semibold tabular-nums ${className}`}>{displayValue ?? <BusinessNumber value={value} />}</span>
                </div>
              ))}
            </div>
          </div>
      </section>
    </div>
  )
}
