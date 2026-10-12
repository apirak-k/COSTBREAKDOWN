import React from 'react'
import { formatNumber, formatVariance } from '../../../core'
import type { WorkCenterProcessingFinding } from '../../../core'

interface WorkCenterProcessingTableProps {
  findings: WorkCenterProcessingFinding[]
}

function formatNullable(value: number | null): string {
  return value === null ? '—' : formatNumber(value, 4)
}

function gapClass(value: number | null): string {
  if (value === null || Math.abs(value) < 0.00005) return 'text-slate-500'
  return value > 0 ? 'text-rose-700' : 'text-emerald-700'
}

export const WorkCenterProcessingTable: React.FC<WorkCenterProcessingTableProps> = ({ findings }) => {
  const rows = findings
    .map(finding => ({
      finding,
      conversionGap: finding.costEffect.gap.total
    }))
    .sort((left, right) => {
      if (left.conversionGap === null) return right.conversionGap === null ? 0 : 1
      if (right.conversionGap === null) return -1
      return Math.abs(right.conversionGap) - Math.abs(left.conversionGap)
    })

  return (
    <section aria-labelledby="work-center-net-summary-title" className="overflow-hidden border border-slate-300 bg-white">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-slate-200 px-3 py-2">
        <h2 id="work-center-net-summary-title" className="font-sans text-xs font-semibold tracking-tight text-slate-950">Work Center Net Summary</h2>
        <p className="text-[11px] text-slate-500">Full Reference / Current snapshot pair · THB/pc</p>
      </div>
      <p className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-[11px] leading-4 text-slate-600">
        Process costs follow each snapshot&apos;s Work Center assignment. Work Center totals provide aggregate context and are not comparison candidates.
      </p>
      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-xs">
          <caption className="sr-only">Conversion, labor, and burden cost gaps aggregated by Work Center</caption>
          <thead>
            <tr className="bg-slate-800 font-semibold text-white">
              <th scope="col" className="px-3 py-2">Work Center</th>
              <th scope="col" className="px-3 py-2 text-right">REF Conversion</th>
              <th scope="col" className="px-3 py-2 text-right">CUR Conversion</th>
              <th scope="col" className="px-3 py-2 text-right">Conversion Gap</th>
              <th scope="col" className="px-3 py-2 text-right">Labor Gap</th>
              <th scope="col" className="px-3 py-2 text-right">Burden Gap</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
            {rows.length === 0 ? (
              <tr><td colSpan={6} className="px-3 py-6 text-center font-sans italic text-slate-500">No Work Center processing data.</td></tr>
            ) : rows.map(({ finding, conversionGap }) => (
              <tr key={finding.sourceId} className="hover:bg-slate-50/70">
                <th scope="row" className="px-3 py-2 font-sans font-semibold text-slate-900">
                  <span>{finding.workCenterCode}</span>
                  {finding.workCenterDescription && <span className="ml-2 font-normal text-slate-500">{finding.workCenterDescription}</span>}
                </th>
                <td className="px-3 py-2 text-right text-slate-600">{formatNullable(finding.costEffect.reference.total)}</td>
                <td className="px-3 py-2 text-right font-semibold text-slate-900">{formatNullable(finding.costEffect.current.total)}</td>
                <td className={`px-3 py-2 text-right font-semibold ${gapClass(conversionGap)}`}>{conversionGap === null ? '—' : formatVariance(conversionGap, 4)}</td>
                <td className={`px-3 py-2 text-right ${gapClass(finding.costEffect.gap.labor)}`}>{finding.costEffect.gap.labor === null ? '—' : formatVariance(finding.costEffect.gap.labor, 4)}</td>
                <td className={`px-3 py-2 text-right ${gapClass(finding.costEffect.gap.burden)}`}>{finding.costEffect.gap.burden === null ? '—' : formatVariance(finding.costEffect.gap.burden, 4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
