import React from 'react'
import { dataQualityClass, getSnapshotDataQuality } from './data-quality'
import type { DataQualityLabel, SnapshotRow } from './data-quality'

interface DataQualityPairBadgeProps {
  reference?: SnapshotRow
  current?: SnapshotRow
  referenceQualityOverride?: DataQualityLabel
  currentQualityOverride?: DataQualityLabel
}

function SideBadge({ role, label }: { role: 'Ref' | 'Current'; label: DataQualityLabel }): React.ReactElement {
  return (
    <span
      className={`inline-flex min-h-7 items-center rounded-sm border px-2 py-1 text-xs font-medium whitespace-nowrap ${dataQualityClass(label)}`}
      title={`${role} data quality: ${label}`}
    >
      {role}: {label}
    </span>
  )
}

export function DataQualityPairBadge({
  reference,
  current,
  referenceQualityOverride,
  currentQualityOverride
}: DataQualityPairBadgeProps): React.ReactElement {
  const referenceQuality = referenceQualityOverride ?? getSnapshotDataQuality(reference)
  const currentQuality = currentQualityOverride ?? getSnapshotDataQuality(current)

  return (
    <div className="flex min-w-[140px] flex-wrap gap-1" aria-label={`Data quality — Reference: ${referenceQuality ?? 'Not present'}; Current: ${currentQuality ?? 'Not present'}`}>
      {referenceQuality ? <SideBadge role="Ref" label={referenceQuality} /> : <span className="text-xs text-slate-600">Ref: —</span>}
      {currentQuality ? <SideBadge role="Current" label={currentQuality} /> : <span className="text-xs text-slate-600">Current: —</span>}
    </div>
  )
}
