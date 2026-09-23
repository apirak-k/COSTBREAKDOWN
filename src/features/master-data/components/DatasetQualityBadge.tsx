import React from 'react'
import { DataQualityStatus, FieldEvidence } from '../../../core'

function qualityOf(evidence: FieldEvidence | undefined): DataQualityStatus {
  if (!evidence) return 'needs-review'
  if (evidence.quality) return evidence.quality
  return evidence.status === 'missing' ? 'missing' : 'valid'
}

function differs(source: unknown, working: unknown): boolean {
  if (source === undefined || working === undefined) return false
  return JSON.stringify(source) !== JSON.stringify(working)
}

export function DatasetQualityBadge({ evidences, sourceRef }: { evidences: FieldEvidence[]; sourceRef?: string }): React.ReactElement {
  const quality = evidences.map(qualityOf)
  const hasEditedValue = evidences.some(evidence => evidence !== undefined && differs(evidence.sourceValue, evidence.workingValue))
  const label = quality.includes('invalid')
    ? 'Invalid'
    : quality.includes('missing')
      ? 'Missing'
      : quality.includes('warning') || quality.includes('needs-review')
        ? 'Review'
        : hasEditedValue
          ? 'Edited'
          : 'Source'
  const className = label === 'Invalid'
    ? 'bg-rose-50 text-rose-700 border-rose-200'
    : label === 'Missing'
      ? 'bg-amber-50 text-amber-800 border-amber-200'
      : label === 'Review'
        ? 'bg-orange-50 text-orange-700 border-orange-200'
        : label === 'Edited'
          ? 'bg-sky-50 text-sky-700 border-sky-200'
          : 'bg-slate-50 text-slate-600 border-slate-200'

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[9px] font-mono font-bold uppercase ${className}`}
      title={`${label}${sourceRef ? ` · Source: ${sourceRef}` : ''}`}
    >
      {label}
    </span>
  )
}
