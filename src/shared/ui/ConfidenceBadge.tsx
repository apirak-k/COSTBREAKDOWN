import React from 'react'
import { DataConfidence } from '../../core'

interface ConfidenceBadgeProps {
  status: DataConfidence
  showLabel?: boolean
  className?: string
}

/**
 * Compact status marker for source confidence in dense comparison tables.
 */
export const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({
  status,
  showLabel = false,
  className = ''
}) => {
  if (status === 'verified') {
    return (
      <span
        className={`inline-flex items-center gap-2 select-none ${className}`}
        title="Verified"
      >
        <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-600" />
        {showLabel && <span className="text-xs text-slate-700">Verified</span>}
      </span>
    )
  }

  if (status === 'estimated') {
    return (
      <span
        className={`inline-flex items-center gap-2 select-none ${className}`}
        title="Estimated"
      >
        <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-amber-600" />
        {showLabel && <span className="text-xs text-slate-700">Estimated</span>}
      </span>
    )
  }

  return (
    <span
      className={`inline-flex items-center gap-2 select-none ${className}`}
      title="Missing"
    >
      <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-rose-600" />
      {showLabel && <span className="text-xs text-slate-700">Missing</span>}
    </span>
  )
}
