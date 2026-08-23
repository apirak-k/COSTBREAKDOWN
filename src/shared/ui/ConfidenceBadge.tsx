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
  showLabel = true,
  className = ''
}) => {
  if (status === 'verified') {
    return (
      <span
        className={`inline-flex items-center px-1.5 py-0.2 text-[9px] font-mono font-bold uppercase tracking-tight bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-none select-none ${className}`}
        title="Verified: Data confirmed with authoritative source reference"
      >
        {showLabel ? 'VERIFIED' : 'VER'}
      </span>
    )
  }

  if (status === 'estimated') {
    return (
      <span
        className={`inline-flex items-center px-1.5 py-0.2 text-[9px] font-mono font-bold uppercase tracking-tight bg-amber-100 text-amber-900 border border-amber-300 rounded-none select-none ${className}`}
        title="Estimated: Placeholder or unconfirmed assumption"
      >
        {showLabel ? 'ESTIMATED' : 'EST'}
      </span>
    )
  }

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.2 text-[9px] font-mono font-bold uppercase tracking-tight bg-rose-100 text-rose-900 border border-rose-300 rounded-none select-none ${className}`}
      title="Missing: Data not yet provided"
    >
      {showLabel ? 'MISSING' : 'MIS'}
    </span>
  )
}
