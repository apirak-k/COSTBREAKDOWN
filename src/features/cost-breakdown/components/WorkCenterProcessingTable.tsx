import React from 'react'
import { formatNumber, formatVariance, safeAdd } from '../../../core'
import type { WorkCenterProcessingFinding } from '../../../core'

interface WorkCenterProcessingTableProps {
  findings: WorkCenterProcessingFinding[]
}

function formatNullable(value: number | null): string {
  return value === null ? '—' : formatNumber(value, 4)
}

function gapClass(value: number | null): string {
  if (value === null || !Number.isFinite(value) || Math.abs(value) < 0.00005) return 'text-slate-500'
  return value > 0 ? 'text-rose-700' : 'text-emerald-700'
}

function sumWhenComplete(values: Array<number | null>): number | null {
  if (values.length === 0) return null
  const completeValues = values.filter((value): value is number => value !== null && Number.isFinite(value))
  if (completeValues.length !== values.length) return null
  return completeValues.reduce<number | null>((total, value) => total === null ? null : safeAdd(total, value), 0)
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
  const totalReference = sumWhenComplete(findings.map(finding => finding.costEffect.reference.total))
  const totalCurrent = sumWhenComplete(findings.map(finding => finding.costEffect.current.total))
  const totalGap = sumWhenComplete(findings.map(finding => finding.costEffect.gap.total))

  return (
    <section aria-labelledby="work-center-context-title" className="overflow-hidden border border-slate-300 bg-white">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-slate-200 px-3 py-2">
        <h2 id="work-center-context-title" className="font-sans text-xs font-semibold tracking-tight text-slate-950">Work Center Context</h2>
        <span className="text-[11px] text-slate-500">Full snapshot · Conversion Cost · THB/pc</span>
      </div>
      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-xs">
          <caption className="sr-only">Full-snapshot Conversion Cost by Work Center for Reference, Current, and Gap</caption>
          <thead><tr className="bg-slate-800 font-semibold text-white">
            <th scope="col" className="px-3 py-2">Work Center</th>
            <th scope="col" className="px-3 py-2 text-right">REF</th>
            <th scope="col" className="px-3 py-2 text-right">CUR</th>
            <th scope="col" className="px-3 py-2 text-right">Gap</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
            {rows.length === 0 ? (
              <tr><td colSpan={4} className="px-3 py-6 text-center font-sans italic text-slate-500">No Work Center processing data.</td></tr>
            ) : <>
              {rows.map(({ finding, conversionGap }) => <tr key={finding.sourceId} className="hover:bg-slate-50/70">
                <th scope="row" className="px-3 py-2 text-left font-sans font-medium text-slate-800">
                  <span>{finding.workCenterCode}</span>
                  {finding.workCenterDescription && finding.workCenterDescription.trim().toLocaleLowerCase() !== finding.workCenterCode.trim().toLocaleLowerCase() && <span className="ml-2 font-normal text-slate-500">{finding.workCenterDescription}</span>}
                </th>
                <td className="px-3 py-2 text-right text-slate-600">{formatNullable(finding.costEffect.reference.total)}</td>
                <td className="px-3 py-2 text-right text-slate-900">{formatNullable(finding.costEffect.current.total)}</td>
                <td className={gapClass(conversionGap)}>{conversionGap === null ? '—' : formatVariance(conversionGap, 4)}</td>
              </tr>)}
              <tr className="border-t-2 border-slate-300 bg-slate-100 font-semibold">
                <th scope="row" className="px-3 py-2 text-left font-sans text-slate-950">Total</th>
                <td className="px-3 py-2 text-right">{formatNullable(totalReference)}</td>
                <td className="px-3 py-2 text-right">{formatNullable(totalCurrent)}</td>
                <td className={gapClass(totalGap)}>{totalGap === null ? '—' : formatVariance(totalGap, 4)}</td>
              </tr>
            </>}
          </tbody>
        </table>
      </div>
    </section>
  )
}
