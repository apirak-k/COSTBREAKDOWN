import { formatNumber } from '../../core'
import { NumericInput } from '../../shared/ui/NumericInput'
import type { EconomicSimulationDraft, EconomicSimulationResult, EconomicSimulationField } from './simulation-economics'

interface EconomicSimulationPanelProps {
  result: EconomicSimulationResult
  draft: EconomicSimulationDraft
  onUpdate: (field: EconomicSimulationField, value: string) => void
}

const INPUTS: Array<{
  field: EconomicSimulationField
  label: string
  unit: string
  precision: number
  integer?: boolean
  placeholder?: string
  minExclusive?: boolean
  min?: number
  max?: number
}> = [
  { field: 'fixedActionCost', label: 'Fixed Action Cost', unit: 'THB', precision: 2 },
  { field: 'variableActionCostPerPiece', label: 'Variable Action Cost / pc', unit: 'THB/pc', precision: 2 },
  { field: 'batchSize', label: 'Batch Size', unit: 'pcs', precision: 0, integer: true, min: 1 },
  { field: 'sellingPriceOverride', label: 'Selling Price', unit: 'THB/pc', precision: 2, placeholder: 'Current' },
  { field: 'sgaPercentOverride', label: 'SG&A', unit: '%', precision: 2, placeholder: 'Current', max: 100 }
]

function formatValue(value: number | null): string {
  return value === null || !Number.isFinite(value) ? '—' : formatNumber(value, 2)
}

export function EconomicSimulationPanel({ result, draft, onUpdate }: EconomicSimulationPanelProps) {
  const margin = result.economicMarginPerPiece
  const outputs = [
    { label: 'Fixed Cost / pc', value: result.fixedCostPerPiece, className: 'text-slate-900' },
    { label: 'Required Saving / pc', value: result.requiredSavingPerPiece, className: 'text-slate-900' },
    { label: 'Parameter Saving / pc', value: result.parameterSavingPerPiece, className: 'text-slate-900' },
    {
      label: 'Economic Margin / pc',
      value: margin,
      className: margin === null ? 'text-slate-500' : margin >= 0 ? 'text-emerald-800' : 'text-rose-800'
    },
    { label: 'SG&A / pc', value: result.sgaPerPiece, className: 'text-slate-900' },
    {
      label: 'OP / pc',
      value: result.operatingProfitPerPiece,
      className: result.operatingProfitPerPiece === null ? 'text-slate-500' : result.operatingProfitPerPiece >= 0 ? 'text-emerald-800' : 'text-rose-800'
    }
  ]

  return (
    <section className="min-w-0 border border-slate-300 bg-white px-3 py-2.5" aria-labelledby="economic-simulation-title">
      <div className="flex items-baseline justify-between gap-2 border-b border-slate-200 pb-1.5">
        <h2 id="economic-simulation-title" className="text-xs font-semibold text-slate-900">Economic</h2>
        <span className="text-[10px] text-slate-500">Separate from Standard Cost</span>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
        {INPUTS.map(({ field, label, unit, precision, integer, placeholder, minExclusive, min, max }) => (
          <label key={field} className="block min-w-0 text-[10px] font-medium text-slate-700">
            <span className="flex min-w-0 items-baseline justify-between gap-1">
              <span className="truncate">{label}</span>
              <span className="shrink-0 font-normal text-slate-500">{unit}</span>
            </span>
            <NumericInput
              value={draft[field].trim() === '' ? null : Number(draft[field])}
              precision={precision}
              integer={integer}
              min={min ?? 0}
              max={max}
              minExclusive={minExclusive}
              allowSubMinimumDraft={minExclusive}
              placeholder={placeholder}
              onValueChange={value => onUpdate(field, value === null ? '' : String(value))}
              className="mt-0.5 h-7 w-full border border-slate-300 bg-white px-1.5 text-right text-[11px] text-slate-950 focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-100"
            />
          </label>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 border-t border-slate-200 pt-2 sm:grid-cols-3">
        {outputs.map(({ label, value, className }) => (
          <div key={label} className="flex min-w-0 items-baseline justify-between gap-2 py-0.5">
            <span className="truncate text-[10px] text-slate-600">{label}</span>
            <span className={`shrink-0 font-mono text-[11px] font-semibold tabular-nums ${className}`}>{formatValue(value)}</span>
          </div>
        ))}
      </div>

      {result.warnings.length > 0 && (
        <details className="mt-1 border-t border-slate-100 pt-1 text-[10px] text-slate-600">
          <summary className="cursor-pointer font-medium">Calculation notes ({result.warnings.length})</summary>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">{result.warnings.map(warning => <li key={warning}>{warning}</li>)}</ul>
        </details>
      )}
    </section>
  )
}
