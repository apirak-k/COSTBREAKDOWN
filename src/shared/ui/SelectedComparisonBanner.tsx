import React from 'react'
import type { SelectedComparisonSelection } from '../../core/types'

interface SelectedComparisonBannerProps {
  selection: SelectedComparisonSelection
  onExit: () => void
}

export const SelectedComparisonBanner: React.FC<SelectedComparisonBannerProps> = ({ selection, onExit }) => (
  <aside aria-label="Selected Comparison scope" className="flex flex-col gap-3 border border-blue-200 border-l-4 border-l-blue-700 bg-blue-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h2 className="font-sans text-sm font-semibold text-blue-950">Selected Comparison active</h2>
      <p className="mt-1 text-xs leading-5 text-blue-900">
        {selection.bomFindingKeys.length} BOM and {selection.routingFindingKeys.length} Routing findings are in scope. All Reference and Current Work Center rates remain calculation inputs.
      </p>
    </div>
    <button
      type="button"
      onClick={onExit}
      className="min-h-9 shrink-0 border border-blue-300 bg-white px-3 text-sm font-medium text-blue-950 hover:bg-blue-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
    >
      Exit Selected Comparison
    </button>
  </aside>
)
