import React, { useMemo } from 'react'
import { formatNumber } from '../../core'
import type { CostSnapshot, SnapshotCost } from '../../core/types'
import {
  calculateEconomicSimulation,
  type EconomicSimulationDraft,
  type EconomicSimulationField
} from './simulation-economics'

interface EconomicSimulationPanelProps {
  currentSnapshot: CostSnapshot
  simulationCost: SnapshotCost | null
  parameterSavingPerPiece: number | null
  draft: EconomicSimulationDraft
  onUpdate: (field: EconomicSimulationField, value: string) => void
}

function formatValue(value: number | null, decimals = 4): string {
  return value === null || !Number.isFinite(value) ? 'Unavailable' : formatNumber(value, decimals)
}

const INPUTS: Array<{ field: EconomicSimulationField; label: string; unit: string; placeholder?: string }> = [
  { field: 'actionCost', label: 'Action Cost', unit: 'THB' },
  { field: 'evaluationQuantity', label: 'Evaluation Quantity', unit: 'pcs' },
  { field: 'sellingPriceOverride', label: 'Selling Price override', unit: 'THB/pc', placeholder: 'Use Current' },
  { field: 'sgaPercentOverride', label: 'SG&A override', unit: '%', placeholder: 'Use Current' }
]

export const EconomicSimulationPanel: React.FC<EconomicSimulationPanelProps> = ({
  currentSnapshot,
  simulationCost,
  parameterSavingPerPiece,
  draft,
  onUpdate
}) => {
  const result = useMemo(
    () => calculateEconomicSimulation(currentSnapshot, simulationCost, parameterSavingPerPiece, draft),
    [currentSnapshot, simulationCost, parameterSavingPerPiece, draft]
  )
  const margin = result.economicMarginPerPiece
  const warnings = result.warnings.filter(warning => /finite number|greater than zero|could not be calculated/i.test(warning))
  const businessMetrics = [
    { label: 'Selling Price · THB/pc', value: result.business.sellingPrice === null ? null : formatValue(result.business.sellingPrice) },
    { label: 'SG&A %', value: result.business.sgaPercent === null ? null : `${formatNumber(result.business.sgaPercent, 2)}%` },
    { label: 'SG&A · THB/pc', value: result.business.sgaAmountPerPiece === null ? null : formatValue(result.business.sgaAmountPerPiece) },
    {
      label: 'OP · THB/pc',
      value: result.business.operatingProfitPerPiece === null ? null : formatValue(result.business.operatingProfitPerPiece),
      negative: result.business.operatingProfitPerPiece !== null && result.business.operatingProfitPerPiece < 0
    }
  ].filter((metric): metric is { label: string; value: string; negative?: boolean } => metric.value !== null)

  return (
    <section className="border border-slate-300 bg-white" aria-labelledby="economic-simulation-title">
      <div className="border-b border-slate-200 px-3 py-2.5">
        <h2 id="economic-simulation-title" className="font-sans text-sm font-semibold text-slate-950">Economic Simulation</h2>
        <p className="mt-0.5 text-[11px] text-slate-600">Estimate break-even independently; parameter edits are optional.</p>
      </div>
      <div className="grid gap-4 p-3 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,0.9fr)]">
        <div>
          <div className="grid gap-3 sm:grid-cols-2">
            {INPUTS.map(({ field, label, unit, placeholder }) => (
              <label key={field} className="block text-xs font-medium text-slate-800">
                <span className="flex items-baseline justify-between gap-2">
                  <span>{label}</span>
                  <span className="font-normal text-[10px] text-slate-500">{unit}</span>
                </span>
                <input
                  type="number"
                  step="any"
                  value={draft[field]}
                  placeholder={placeholder}
                  onChange={event => onUpdate(field, event.currentTarget.value)}
                  className="mt-1 min-h-9 w-full border border-slate-400 bg-white px-2 font-mono text-xs tabular-nums text-slate-950 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </label>
            ))}
          </div>
          {result.requiredSavingPerPiece === null && (
            <p className="mt-2 text-[11px] text-slate-500">Enter Action Cost and a positive Evaluation Quantity to calculate break-even.</p>
          )}
        </div>

        <div className="grid content-start gap-3 sm:grid-cols-2">
          <div className="border-l-2 border-slate-900 bg-slate-50 px-3 py-2">
            <p className="text-[11px] font-semibold text-slate-600">Required Saving / pc</p>
            <p className="mt-1 font-mono text-base font-semibold tabular-nums text-slate-950">
              {formatValue(result.requiredSavingPerPiece)} <span className="text-[11px] font-normal text-slate-500">THB/pc</span>
            </p>
          </div>
          <div className={`border-l-2 px-3 py-2 ${margin === null ? 'border-slate-300 bg-slate-50' : margin >= 0 ? 'border-emerald-700 bg-emerald-50' : 'border-rose-700 bg-rose-50'}`}>
            <p className="text-[11px] font-semibold text-slate-600">Economic Margin / pc</p>
            <p className={`mt-1 font-mono text-base font-semibold tabular-nums ${margin === null ? 'text-slate-500' : margin >= 0 ? 'text-emerald-900' : 'text-rose-900'}`}>
              {formatValue(margin)} <span className="text-[11px] font-normal text-slate-500">THB/pc</span>
            </p>
            <p className="mt-1 text-[10px] text-slate-600">
              {margin === null
                ? result.parameterSavingPerPiece === null ? 'Needs an available Parameter Saving.' : 'Enter valid economic inputs.'
                : margin >= 0 ? 'At or above break-even.' : 'Below break-even.'}
            </p>
          </div>
          {businessMetrics.length > 0 && (
            <dl className="col-span-full grid grid-cols-2 gap-x-4 gap-y-1 border-t border-slate-200 pt-2 text-[11px] sm:grid-cols-4">
              {businessMetrics.map(metric => (
                <div key={metric.label}>
                  <dt className="text-slate-500">{metric.label}</dt>
                  <dd className={`font-mono tabular-nums ${metric.negative ? 'font-semibold text-rose-800' : ''}`}>{metric.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>
      {warnings.length > 0 && (
        <details className="border-t border-slate-200 px-3 py-2 text-xs text-slate-600">
          <summary className="cursor-pointer font-medium">Calculation notes ({warnings.length})</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5">{warnings.map(warning => <li key={warning}>{warning}</li>)}</ul>
        </details>
      )}
    </section>
  )
}
