import React from 'react'
import { DataConfidence } from '../../core'

interface ConfidenceBadgeProps {
  status: DataConfidence
  showLabel?: boolean
  className?: string
}

/**
 * Pure Sharp Industrial UI Badge for Data Confidence Status.
 * Strict 0px border-radius, industrial color palette.
 */
export const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({
  status,
  showLabel = false,
  className = ''
}) => {
  if (status === 'verified') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 select-none ${className}`}
        title="Verified"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shrink-0 shadow-2xs" />
        {showLabel && <span className="text-[10px] font-mono text-slate-700">Verified</span>}
      </span>
    )
  }

  if (status === 'estimated') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 select-none ${className}`}
        title="Estimated"
      >
        <span className="w-2 h-2 rounded-full bg-amber-500 inline-block shrink-0 shadow-2xs" />
        {showLabel && <span className="text-[10px] font-mono text-slate-700">Estimated</span>}
      </span>
    )
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 select-none ${className}`}
      title="Missing"
    >
      <span className="w-2 h-2 rounded-full bg-rose-500 inline-block shrink-0 shadow-2xs" />
      {showLabel && <span className="text-[10px] font-mono text-slate-700">Missing</span>}
    </span>
  )
}
