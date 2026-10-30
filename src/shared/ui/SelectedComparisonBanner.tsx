import React from 'react'
import type { SelectedComparisonSelection } from '../../core/types'

interface SelectedComparisonBannerProps {
  selection: SelectedComparisonSelection
  onExit: () => void
}

export const SelectedComparisonBanner: React.FC<SelectedComparisonBannerProps> = ({ selection, onExit }) => (
  <aside aria-label="Selected Comparison scope" className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-blue-200 pb-2 text-xs">
    <span className="font-semibold text-blue-900">Selected Comparison</span>
    <span className="font-mono tabular-nums text-slate-600">{selection.bomFindingKeys.length} BOM · {selection.routingFindingKeys.length} Routing</span>
    <button
      type="button"
      onClick={onExit}
      className="ml-auto min-h-7 px-2 text-xs font-medium text-blue-900 underline decoration-blue-300 underline-offset-2 hover:text-blue-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
    >
      Full Comparison
    </button>
  </aside>
)
