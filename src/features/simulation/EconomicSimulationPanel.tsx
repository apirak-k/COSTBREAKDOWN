import { Info } from 'lucide-react'
import { formatNumber } from '../../core'
import type { CostSnapshot } from '../../core/types'
import { NumericInput } from '../../shared/ui/NumericInput'
import { Tooltip } from '../../shared/ui/Tooltip'
import type { EconomicSimulationDraft, EconomicSimulationResult, EconomicSimulationField } from './simulation-economics'

interface EconomicSimulationPanelProps {
  result: EconomicSimulationResult
  draft: EconomicSimulationDraft
  currentSnapshot: CostSnapshot
  onUpdate: (field: EconomicSimulationField, value: string) => void
}

const INPUTS: Array<{
  field: EconomicSimulationField
  label: string
  compactLabel: string
  unit: string
  precision: number
  integer?: boolean
  placeholder?: string
  minExclusive?: boolean
  min?: number
  max?: number
}> = [
  { field: 'fixedActionCost', label: 'Fixed Action Cost', compactLabel: 'Fixed Action Cost', unit: 'THB', precision: 2 },
  { field: 'variableActionCostPerPiece', label: 'Variable Action Cost / pc', compactLabel: 'Variable Action', unit: 'THB/pc', precision: 2 },
  { field: 'batchSize', label: 'Batch Size', compactLabel: 'Batch Size', unit: 'pcs', precision: 0, integer: true, min: 1 },
  { field: 'sellingPriceOverride', label: 'Selling Price', compactLabel: 'Selling Price', unit: 'THB/pc', precision: 2, placeholder: 'Current' },
  { field: 'sgaPercentOverride', label: 'SG&A', compactLabel: 'SG&A', unit: '%', precision: 2, placeholder: 'Current', max: 100 }
]

function formatValue(value: number | null): string {
  return value === null || !Number.isFinite(value) ? '—' : formatNumber(value, 2)
}

export function EconomicSimulationPanel({ result, draft, currentSnapshot, onUpdate }: EconomicSimulationPanelProps) {
  const margin = result.economicMarginPerPiece
  const outputs = [
    { label: 'Fixed Cost / pc', formula: 'Fixed Action Cost ÷ Batch Size', value: result.fixedCostPerPiece, className: 'text-slate-900' },
    { label: 'Required Saving / pc', formula: 'Fixed Cost / pc + Variable Action Cost / pc', value: result.requiredSavingPerPiece, className: 'text-slate-900' },
    {
      label: 'Parameter Saving / pc',
      formula: 'Current Standard Cost − SIM Standard Cost',
      value: result.parameterSavingPerPiece,
      className: result.parameterSavingPerPiece === null ? 'text-slate-500'
        : result.parameterSavingPerPiece > 0 ? 'text-emerald-800'
          : result.parameterSavingPerPiece < 0 ? 'text-rose-800' : 'text-slate-600'
    },
    {
      label: 'Economic Margin / pc',
      formula: 'Parameter Saving / pc − Required Saving / pc',
      value: margin,
      className: margin === null ? 'text-slate-500' : margin >= 0 ? 'text-emerald-800' : 'text-rose-800'
    },
    { label: 'SG&A / pc', formula: 'Selling Price × SG&A %', value: result.sgaPerPiece, className: 'text-slate-900' },
    {
      label: 'OP / pc',
      formula: 'Selling Price − SIM Standard Cost − SG&A / pc',
      value: result.operatingProfitPerPiece,
      className: result.operatingProfitPerPiece === null ? 'text-slate-500' : result.operatingProfitPerPiece >= 0 ? 'text-emerald-800' : 'text-rose-800'
    }
  ]

  return (
    <section data-safe-workspace-interaction="true" className="min-w-0 border border-slate-300 bg-white px-3 py-1" aria-labelledby="economic-simulation-title">
      <div className="flex items-baseline justify-between gap-2 border-b border-slate-200 pb-1">
        <h2 id="economic-simulation-title" className="text-xs font-semibold text-slate-900">Economic</h2>
      </div>

      <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1.5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1.35fr)_minmax(0,.8fr)_minmax(0,1.1fr)_minmax(0,.65fr)] xl:gap-x-2 xl:gap-y-1">
        {INPUTS.map(({ field, label, compactLabel, unit, precision, integer, placeholder, minExclusive, min, max }) => (
          <label key={field} title={label} className="block min-w-0 text-[9px] font-medium text-slate-700">
            <span className="flex h-7 min-w-0 items-end justify-between gap-0.5 leading-3">
              <span className="min-w-0 break-words">{compactLabel}</span>
              <span className="shrink-0 font-normal text-slate-500">{unit}</span>
            </span>
            <NumericInput
              value={draft[field].trim() !== ''
                ? Number(draft[field])
                : field === 'sellingPriceOverride'
                  ? currentSnapshot.product.sellingPrice !== null && currentSnapshot.product.sellingPrice !== undefined
                    && Number.isFinite(currentSnapshot.product.sellingPrice) && currentSnapshot.product.sellingPrice >= 0
                    ? currentSnapshot.product.sellingPrice
                    : null
                  : field === 'sgaPercentOverride'
                    ? currentSnapshot.product.sgaPercent !== null && currentSnapshot.product.sgaPercent !== undefined
                      && Number.isFinite(currentSnapshot.product.sgaPercent) && currentSnapshot.product.sgaPercent >= 0 && currentSnapshot.product.sgaPercent <= 100
                      ? currentSnapshot.product.sgaPercent
                      : null
                    : null}
              precision={precision}
              integer={integer}
              min={min ?? 0}
              max={max}
              minExclusive={minExclusive}
              allowSubMinimumDraft={minExclusive}
              placeholder={placeholder}
              onValueChange={value => onUpdate(field, value === null ? '' : String(value))}
              aria-label={label}
              className="mt-0.5 h-7 w-full border border-slate-300 bg-white px-1.5 text-right text-[11px] text-slate-950 focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-100"
            />
          </label>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0 border-t border-slate-200 pt-1 sm:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3">
        {outputs.map(({ label, formula, value, className }) => (
          <div key={label} className="flex min-w-0 items-baseline justify-between gap-2 py-0.5">
            <span className="flex min-w-0 flex-1 items-baseline gap-1">
              <span className="truncate text-[10px] text-slate-600">{label}</span>
              <Tooltip label={formula}>
                <button
                  type="button"
                  aria-label={`Formula for ${label}`}
                  className="inline-grid h-4 w-4 shrink-0 place-items-center text-slate-500 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-700"
                ><Info aria-hidden="true" className="h-3 w-3" /></button>
              </Tooltip>
            </span>
            <span className={`shrink-0 font-mono text-[11px] font-semibold tabular-nums ${className}`}>{formatValue(value)}</span>
          </div>
        ))}
      </div>

    </section>
  )
}
