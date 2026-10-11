import React from 'react'

interface MasterDataBlockerMarkerProps {
  label?: string
}

export const MasterDataBlockerMarker: React.FC<MasterDataBlockerMarkerProps> = ({
  label = 'Missing required value'
}) => (
  <span
    aria-label={label}
    title={label}
    className="pointer-events-none absolute right-1 top-1/2 z-10 -translate-y-1/2 text-[11px] font-bold leading-none text-rose-600"
  >
    *
  </span>
)
