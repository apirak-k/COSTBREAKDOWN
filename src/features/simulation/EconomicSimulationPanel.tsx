import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'
import { formatNumber } from '../../core'
import type { CostSnapshot } from '../../core/types'
import { NumericInput } from '../../shared/ui/NumericInput'
import { SimulationHistoryInputBoundary } from './SimulationHistoryInputBoundary'
import { positionGraphTooltip } from './SimulationStoryGraph'
import type { EconomicSimulationDraft, EconomicSimulationResult, EconomicSimulationField } from './simulation-economics'

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

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

interface ActiveBreakEvenTooltip {
  kind: 'graph' | 'batch'
  text: string
  anchor: { left: number; top: number; right: number; bottom: number }
  x: number
  y: number
  maxWidth: number
}

function isBreakEvenTooltipTarget(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest('[data-break-even-tooltip]') !== null
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
  const [activeTooltip, setActiveTooltip] = useState<ActiveBreakEvenTooltip | null>(null)
  const [dragScaleMax, setDragScaleMax] = useState<number | null>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const markerRef = useRef<SVGGElement>(null)
  const dragStartRef = useRef<{ pointerId: number; pointerX: number; batchSize: number; xMax: number } | null>(null)
  const width = 560
  const height = 152
  const plot = { left: 56, right: 540, top: 13, bottom: 112 }
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

  const relativeAnchor = (target: SVGElement, host: HTMLElement) => {
    const elementBounds = target.getBoundingClientRect()
    const hostBounds = host.getBoundingClientRect()
    return {
      left: elementBounds.left - hostBounds.left,
      top: elementBounds.top - hostBounds.top,
      right: elementBounds.right - hostBounds.left,
      bottom: elementBounds.bottom - hostBounds.top
    }
  }

  const showTooltipAt = (target: SVGElement, text: string, kind: ActiveBreakEvenTooltip['kind'] = 'graph') => {
    const host = target.ownerSVGElement?.parentElement
    if (!host) return
    const hostBounds = host.getBoundingClientRect()
    if (hostBounds.width <= 0 || hostBounds.height <= 0) return
    setActiveTooltip({
      kind,
      text,
      anchor: relativeAnchor(target, host),
      x: 8,
      y: 8,
      maxWidth: Math.max(0, Math.min(360, hostBounds.width - 16))
    })
  }

  const graphTooltipProps = (text: string) => ({
    'data-break-even-tooltip': 'true',
    role: 'img' as const,
    'aria-label': text,
    className: 'cursor-default',
    onPointerEnter: (event: PointerEvent<SVGElement>) => showTooltipAt(event.currentTarget, text),
    onPointerLeave: (event: PointerEvent<SVGElement>) => {
      if (!isBreakEvenTooltipTarget(event.relatedTarget)) setActiveTooltip(null)
    }
  })

  const tooltipText = activeTooltip?.kind === 'batch' && batchSize !== null
    ? `Batch Size · ${formatQuantity(batchSize, unit)}`
    : activeTooltip?.text

  useIsomorphicLayoutEffect(() => {
    const tooltip = tooltipRef.current
    const host = tooltip?.parentElement
    if (!activeTooltip || !tooltip || !host) return

    const marker = activeTooltip.kind === 'batch' ? markerRef.current?.querySelector('circle') ?? null : null
    const anchor = marker ? relativeAnchor(marker, host) : activeTooltip.anchor
    const hostBounds = host.getBoundingClientRect()
    const tooltipBounds = tooltip.getBoundingClientRect()
    const { x, y } = positionGraphTooltip(
      { width: hostBounds.width, height: hostBounds.height },
      anchor,
      { width: tooltipBounds.width, height: tooltipBounds.height }
    )
    const anchorChanged = anchor.left !== activeTooltip.anchor.left || anchor.top !== activeTooltip.anchor.top ||
      anchor.right !== activeTooltip.anchor.right || anchor.bottom !== activeTooltip.anchor.bottom
    if (anchorChanged || x !== activeTooltip.x || y !== activeTooltip.y) {
      setActiveTooltip(current => current ? { ...current, anchor, x, y } : current)
    }
  }, [activeTooltip, markerX, tooltipText])

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
        <span>Break-even Graph</span>
        <span role="group" aria-label="Break-even graph legend" className="flex shrink-0 items-center gap-1.5 text-[9px] font-normal text-slate-600">
          <span role="img" aria-label="Cumulative Parameter Saving" className="inline-flex items-center gap-1 whitespace-nowrap"><i aria-hidden="true" className="h-0.5 w-3 bg-blue-600" />Saving</span>
          <span role="img" aria-label="Total Action Cost" className="inline-flex items-center gap-1 whitespace-nowrap"><i aria-hidden="true" className="h-0.5 w-3 bg-orange-700" />Action Cost</span>
        </span>
      </figcaption>
      <div
        data-graph-tooltip-host="true"
        className="relative min-w-0 xl:min-h-0 xl:flex-1"
        onPointerLeave={() => { if (!markerFocused && !dragStartRef.current) setActiveTooltip(null) }}
      >
        <svg
          role="group"
          aria-labelledby="break-even-graph-title"
          aria-describedby="break-even-graph-description"
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="block h-[112px] w-full xl:h-full xl:min-h-0 xl:flex-1"
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
        {savingLine && <path
          {...graphTooltipProps(`Cumulative Parameter Saving: ${formatValue(result.parameterSavingPerPiece)} THB/${unit} × quantity`)}
          d={savingLine}
          fill="none"
          stroke="#2563eb"
          strokeWidth="2"
        />}
        {actionCostLine && <path
          {...graphTooltipProps(`Total Action Cost: ${formatValue(result.fixedActionCost)} THB + ${formatValue(result.variableActionCostPerPiece)} THB/${unit} × quantity`)}
          d={actionCostLine}
          fill="none"
          stroke="#c2410c"
          strokeWidth="2"
        />}
        {breakEvenQuantity !== null && finiteBreakEvenValue !== null && (
          <circle
            {...graphTooltipProps(`Break-even Quantity: ${formatQuantity(result.breakEvenQuantity, unit)}`)}
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
            ref={markerRef}
            data-break-even-tooltip="true"
            role="slider"
            tabIndex={0}
            aria-label="Batch Size"
            aria-orientation="horizontal"
            aria-valuemin={1}
            aria-valuemax={batchMax}
            aria-valuenow={batchSize}
            aria-valuetext={`${formatNumber(batchSize, 0)} ${unit}`}
            aria-describedby="break-even-graph-description"
            onPointerEnter={event => showTooltipAt(event.currentTarget, '', 'batch')}
            onPointerLeave={event => {
              if (!dragStartRef.current && !markerFocused && !isBreakEvenTooltipTarget(event.relatedTarget)) setActiveTooltip(null)
            }}
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
            onFocus={event => {
              setMarkerFocused(true)
              showTooltipAt(event.currentTarget, '', 'batch')
            }}
            onBlur={event => {
              setMarkerFocused(false)
              if (!dragStartRef.current && !isBreakEvenTooltipTarget(event.relatedTarget)) setActiveTooltip(null)
            }}
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
        <text x={plot.left} y={height - 3} fill="#64748b" fontSize="8">Quantity ({unit})</text>
        <text x={plot.left} y={plot.top - 3} fill="#64748b" fontSize="8">THB</text>
        </svg>
        {activeTooltip && tooltipText && (
          <div
            ref={tooltipRef}
            aria-hidden="true"
            className="pointer-events-none absolute z-20 break-words rounded-sm border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] leading-4 text-white shadow-sm"
            style={{ left: activeTooltip.x, top: activeTooltip.y, maxWidth: activeTooltip.maxWidth }}
          >
            {tooltipText}
          </div>
        )}
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

export function EconomicSimulationPanel({ result, draft, currentSnapshot, unit, onUpdate, onBeginEdit, onCommitEdit }: EconomicSimulationPanelProps) {
  const normalizedUnit = unit.trim() || 'Unit'
  const inputs: Array<{
    field: EconomicSimulationField
    label: string
    unit: string
    precision: number
    integer?: boolean
    min?: number
    max?: number
  }> = [
    { field: 'variableActionCostPerPiece', label: 'Variable Action Cost / Unit', unit: `THB/${normalizedUnit}`, precision: 2, min: 0 },
    { field: 'fixedActionCost', label: 'Fixed Action Cost', unit: 'THB', precision: 2, min: 0 },
    { field: 'batchSize', label: 'Batch Size', unit: normalizedUnit, precision: 0, integer: true, min: 1 },
    { field: 'sellingPriceOverride', label: 'Selling Price', unit: `THB/${normalizedUnit}`, precision: 2, min: 0 },
    { field: 'sgaPercentOverride', label: 'SG&A %', unit: '', precision: 2, min: 0, max: 100 }
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
  return (
    <div data-safe-workspace-interaction="true" data-simulation-layout-column="inputs" aria-label="Economic and Business" className="grid min-w-0 gap-2 xl:h-full xl:min-h-0 xl:grid-rows-[minmax(0,.95fr)_minmax(0,1.45fr)_minmax(0,1fr)]">
      <section className="min-w-0 border border-slate-300 bg-white px-2.5 py-1.5 xl:min-h-0" aria-labelledby="simulation-business-inputs-title">
          <h2 id="simulation-business-inputs-title" className="border-b border-slate-200 pb-1 text-xs font-semibold text-slate-900 xl:pb-0.5">Business Inputs</h2>
          <div className="mt-1 grid grid-cols-1 gap-y-1 xl:mt-0.5">
            {inputs.slice(3).map(({ field, label, unit: fieldUnit, precision, min, max }) => (
              <label key={field} className="flex min-w-0 flex-col gap-0.5 text-[9px] font-medium leading-3 text-slate-700">
                <span>{label}<span className="ml-1 font-normal text-slate-500">{fieldUnit}</span></span>
                <span className="w-full min-w-0">
                  <SimulationHistoryInputBoundary onBegin={onBeginEdit} onCommit={onCommitEdit}>
                    <NumericInput
                      value={effectiveInputValue(field, draft, currentSnapshot)}
                      precision={precision}
                      min={min}
                      max={max}
                      onValueChange={value => onUpdate(field, value === null ? '' : String(value))}
                      aria-label={label}
                      className="h-7 w-full border border-slate-300 bg-white px-1.5 text-right text-[11px] text-slate-950 focus:border-blue-700 focus:ring-1 focus:ring-blue-100 xl:h-6"
                    />
                  </SimulationHistoryInputBoundary>
                </span>
              </label>
            ))}
          </div>
      </section>

      <section className="min-w-0 border border-slate-300 bg-white px-2.5 py-1.5 xl:min-h-0" aria-labelledby="simulation-economic-inputs-title">
          <h2 id="simulation-economic-inputs-title" className="border-b border-slate-200 pb-1 text-xs font-semibold text-slate-900 xl:pb-0.5">Economic Inputs</h2>
          <div className="mt-1 grid min-w-0 grid-cols-1 gap-y-1 xl:mt-0.5">
            {inputs.slice(0, 3).map(({ field, label, unit: fieldUnit, precision, integer, min, max }) => (
              <label key={field} className="flex min-w-0 flex-col gap-0.5 text-[9px] font-medium leading-3 text-slate-700">
                <span>{label}<span className="ml-1 font-normal text-slate-500">{fieldUnit}</span></span>
                <span className="w-full min-w-0">
                  <SimulationHistoryInputBoundary onBegin={onBeginEdit} onCommit={onCommitEdit}>
                    <NumericInput
                      value={effectiveInputValue(field, draft, currentSnapshot)}
                      precision={precision}
                      integer={integer}
                      min={min}
                      max={max}
                      onValueChange={value => onUpdate(field, value === null ? '' : String(value))}
                      aria-label={label}
                      className="h-7 w-full border border-slate-300 bg-white px-1.5 text-right text-[11px] text-slate-950 focus:border-blue-700 focus:ring-1 focus:ring-blue-100 xl:h-6"
                    />
                  </SimulationHistoryInputBoundary>
                </span>
              </label>
            ))}
          </div>
      </section>

      <section className="min-w-0 border border-slate-300 bg-white px-2.5 py-1.5 xl:min-h-0" aria-labelledby="simulation-economic-outputs-title">
          <h2 id="simulation-economic-outputs-title" className="border-b border-slate-200 pb-1 text-xs font-semibold text-slate-900 xl:pb-0.5">Economic Outputs</h2>
          <div className="mt-1 grid grid-cols-1 gap-x-3 gap-y-0 sm:grid-cols-2 xl:grid-cols-1">
            {economicOutputs.map(({ label, formula, value, className }) => (
              <div key={label} className="flex min-w-0 items-baseline justify-between gap-1 py-0.5 xl:py-0" title={formula}>
                <span className="truncate text-[9px] text-slate-600">{label}</span>
                <span className={`shrink-0 font-mono text-[10px] font-semibold tabular-nums ${className}`}>{formatValue(value)}<span className="ml-0.5 text-[8px] font-normal text-slate-500">THB/{normalizedUnit}</span></span>
              </div>
            ))}
            <div className="flex min-w-0 items-baseline justify-between gap-1 py-0.5" title="Fixed Action Cost ÷ (Parameter Saving / Unit − Variable Action Cost / Unit)">
              <span className="min-w-0 text-[9px] text-slate-600">Break-even Quantity</span>
              <span className={`shrink-0 font-mono text-[10px] font-semibold tabular-nums ${result.breakEvenNotAchievable ? 'text-slate-500' : 'text-slate-900'}`}>
                {result.breakEvenNotAchievable ? 'Not achievable' : formatQuantity(result.breakEvenQuantity, normalizedUnit)}
              </span>
            </div>
          </div>
      </section>
    </div>
  )
}
