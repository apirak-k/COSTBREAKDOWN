import type { ComparisonFinding } from '../../../core'
import { formatComparisonFieldDiffs } from './comparison-field-details'

interface ComparisonFieldDetailsProps {
  finding?: ComparisonFinding
  fieldLabelOverrides?: Record<string, string>
}

export function ComparisonFieldDetails({ finding, fieldLabelOverrides }: ComparisonFieldDetailsProps) {
  const changes = formatComparisonFieldDiffs(finding?.fieldDiffs ?? {}, fieldLabelOverrides)
  if (changes.length === 0) return null

  return (
    <details className="font-sans text-[11px] text-slate-600">
      <summary className="cursor-pointer whitespace-nowrap font-medium hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">
        Changed fields ({changes.length})
      </summary>
      <ul className="mt-1 max-w-[280px] space-y-0.5 break-words">
        {changes.map(change => (
          <li key={change.field}>
            <span className="font-medium">{change.label}:</span> {change.reference} → {change.current}
          </li>
        ))}
      </ul>
    </details>
  )
}
