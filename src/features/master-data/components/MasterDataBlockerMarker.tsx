import React from 'react'

interface MasterDataBlockerMarkerProps {
  label?: string
  className?: string
}

export const MasterDataBlockerMarker: React.FC<MasterDataBlockerMarkerProps> = ({
  label = 'Missing required value',
  className = 'right-1 top-0.5'
}) => (
  <span
    aria-label={label}
    title={label}
    className={`pointer-events-none absolute z-10 text-[11px] font-bold leading-none text-rose-600 ${className}`}
  >
    *
  </span>
)
