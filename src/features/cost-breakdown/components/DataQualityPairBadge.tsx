import React from 'react'
import { dataQualityClass, getSnapshotDataQuality } from './data-quality'
import type { DataQualityLabel, SnapshotRow } from './data-quality'

interface DataQualityPairBadgeProps {
  reference?: SnapshotRow
  current?: SnapshotRow
}

function SideBadge({ role, label }: { role: 'Ref' | 'Current'; label: DataQualityLabel }): React.ReactElement {
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[9px] font-mono font-bold whitespace-nowrap ${dataQualityClass(label)}`}
      title={`${role} data quality: ${label}`}
    >
      {role}: {label}
    </span>
  )
}

export function DataQualityPairBadge({ reference, current }: DataQualityPairBadgeProps): React.ReactElement {
  const referenceQuality = getSnapshotDataQuality(reference)
  const currentQuality = getSnapshotDataQuality(current)

  return (
    <div className="flex flex-wrap gap-1 min-w-[120px]" aria-label={`Data quality — Reference: ${referenceQuality ?? 'Not present'}; Current: ${currentQuality ?? 'Not present'}`}>
      {referenceQuality ? <SideBadge role="Ref" label={referenceQuality} /> : <span className="text-[10px] text-slate-400">Ref: —</span>}
      {currentQuality ? <SideBadge role="Current" label={currentQuality} /> : <span className="text-[10px] text-slate-400">Current: —</span>}
    </div>
  )
}
