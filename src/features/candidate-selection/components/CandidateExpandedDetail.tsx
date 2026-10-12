import React from 'react'
import { formatNumber, formatPercent } from '../../../core'
import type { PrioritizationCandidate } from '../../../core'
import { CandidateParameterTable } from './CandidateParameterTable'
import type { CandidateParameterData } from './candidate-detail-data'

interface CandidateExpandedDetailProps {
  candidate: PrioritizationCandidate
  parameters: CandidateParameterData
}

function displayChangeValue(field: string, value: unknown): string {
  if (value === undefined) return 'Not set'
  if (value === null) return '—'
  if (typeof value === 'string') return value
  if (typeof value === 'number') {
    return field.trim().toLowerCase().includes('loss') ? formatPercent(value, 2) : formatNumber(value, 4)
  }
  if (typeof value === 'boolean') return String(value)
  try {
    return JSON.stringify(value) ?? String(value)
  } catch {
    return String(value)
  }
}

function formatNullable(value: number | null, formatter: (value: number) => string): string {
  return value === null ? '—' : formatter(value)
}

export const CandidateExpandedDetail: React.FC<CandidateExpandedDetailProps> = ({ candidate, parameters }) => (
  <div className="space-y-3 border-l-2 border-slate-300 pl-3">
    <section aria-label={`${candidate.candidateName} parameter comparison`}>
      <h3 className="mb-1 font-sans text-[11px] font-semibold text-slate-700">Parameter comparison</h3>
      <CandidateParameterTable data={parameters} compact />
    </section>

    {candidate.changeDetails && candidate.changeDetails.length > 0 && (
      <section aria-label={`${candidate.candidateName} changed fields`}>
        <h3 className="mb-1 font-sans text-[11px] font-semibold text-slate-700">Changed fields</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[360px] text-left text-[11px]">
            <thead>
              <tr className="bg-slate-100 font-semibold text-slate-700">
                <th scope="col" className="px-2.5 py-1.5">Field</th>
                <th scope="col" className="px-2.5 py-1.5 text-right">Reference</th>
                <th scope="col" className="px-2.5 py-1.5 text-right">Current</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {candidate.changeDetails.map((detail, index) => (
                <tr key={`${detail.field}-${index}`}>
                  <th scope="row" className="px-2.5 py-1.5 font-sans font-medium text-slate-700">{detail.field}</th>
                  <td className="px-2.5 py-1.5 text-right font-mono tabular-nums text-slate-700">{displayChangeValue(detail.field, detail.reference)}</td>
                  <td className="px-2.5 py-1.5 text-right font-mono tabular-nums text-slate-950">{displayChangeValue(detail.field, detail.current)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    )}

    {candidate.processBreakdown && (
      <section aria-label={`${candidate.candidateName} existing processing cost detail`}>
        <h3 className="mb-1 font-sans text-[11px] font-semibold text-slate-700">Processing Cost Detail</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {([
            { key: 'reference', label: 'Reference', rows: candidate.processBreakdown.reference },
            { key: 'current', label: 'Current', rows: candidate.processBreakdown.current }
          ] as const).map(({ key, label, rows }) => (
            <section key={key} aria-label={`${label} Routing Processes`} className="border-t border-slate-200 pt-1.5">
              <h4 className="font-sans text-[11px] font-semibold text-slate-600">{label}</h4>
              {rows.length === 0 ? (
                <p className="mt-1 text-[11px] text-slate-500">—</p>
              ) : (
                <ul className="mt-1 space-y-1.5">
                  {rows.map(process => (
                    <li key={process.id} className="border-l border-slate-300 pl-2">
                      <p className="break-words text-[11px] font-semibold text-slate-800">{process.processName}</p>
                      <p className="font-mono text-[11px] leading-4 text-slate-600">
                        Manning {formatNullable(process.manning, value => formatNumber(value, 2))}
                        {' · '}Capacity {formatNullable(process.capacity, value => formatNumber(value, 2))}
                        {' · '}Yield {formatNullable(process.yield, value => formatPercent(value, 2))}
                      </p>
                      <p className="font-mono text-[11px] leading-4 text-slate-600">
                        Labor {formatNullable(process.laborCost, value => formatNumber(value, 4))}
                        {' · '}Burden {formatNullable(process.burdenCost, value => formatNumber(value, 4))}
                        {' · '}Processing {formatNullable(process.totalCost, value => formatNumber(value, 4))} THB/pc
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      </section>
    )}
  </div>
)
