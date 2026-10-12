import React from 'react'
import { formatNumber, formatPercent } from '../../../core'
import type { CandidateParameterData } from './candidate-detail-data'

interface CandidateParameterTableProps {
  data: CandidateParameterData
  compact?: boolean
}

function formatNullable(value: number | null | undefined, formatter: (value: number) => string): string {
  return value === null || value === undefined ? '—' : formatter(value)
}

export const CandidateParameterTable: React.FC<CandidateParameterTableProps> = ({ data, compact = false }) => {
  const rows: Array<[string, string, string]> = data.type === 'bom'
    ? [
        ['Usage', formatNullable(data.reference?.consumption, value => formatNumber(value, 4)), formatNullable(data.current?.consumption, value => formatNumber(value, 4))],
        ['Unit', data.reference?.unit || '—', data.current?.unit || '—'],
        ['Price', formatNullable(data.reference?.price, value => formatNumber(value, 4)), formatNullable(data.current?.price, value => formatNumber(value, 4))],
        ['Loss', formatNullable(data.reference?.loss, value => formatPercent(value, 2)), formatNullable(data.current?.loss, value => formatPercent(value, 2))]
      ]
    : [
        ['Work Center', data.reference?.workCenterId?.trim() || '—', data.current?.workCenterId?.trim() || '—'],
        ['Manning', formatNullable(data.reference?.manning, value => formatNumber(value, 2)), formatNullable(data.current?.manning, value => formatNumber(value, 2))],
        ['Capacity', formatNullable(data.reference?.capacity, value => formatNumber(value, 2)), formatNullable(data.current?.capacity, value => formatNumber(value, 2))],
        ['Yield', formatNullable(data.reference?.yield, value => formatPercent(value, 2)), formatNullable(data.current?.yield, value => formatPercent(value, 2))],
        ['Labor Rate', formatNullable(data.referenceRate?.laborRate, value => formatNumber(value, 4)), formatNullable(data.currentRate?.laborRate, value => formatNumber(value, 4))],
        ['Burden Rate', formatNullable(data.referenceRate?.burdenRate, value => formatNumber(value, 4)), formatNullable(data.currentRate?.burdenRate, value => formatNumber(value, 4))]
      ]

  return (
    <div className="overflow-x-auto">
      <table className={`w-full text-left ${compact ? 'min-w-[360px] text-[11px]' : 'min-w-[460px] text-xs'}`}>
        <caption className="sr-only">Candidate Reference and Current parameter values</caption>
        <thead>
          <tr className="bg-slate-100 font-semibold text-slate-700">
            <th scope="col" className="px-2.5 py-1.5">Parameter</th>
            <th scope="col" className="px-2.5 py-1.5 text-right">Reference</th>
            <th scope="col" className="px-2.5 py-1.5 text-right">Current</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 font-mono tabular-nums">
          {rows.map(([label, reference, current]) => (
            <tr key={label}>
              <th scope="row" className="px-2.5 py-1.5 font-sans font-medium text-slate-700">{label}</th>
              <td className="px-2.5 py-1.5 text-right text-slate-700">{reference}</td>
              <td className="px-2.5 py-1.5 text-right text-slate-950">{current}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
