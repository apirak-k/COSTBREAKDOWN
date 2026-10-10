import React, { ReactNode } from 'react'
import { Navbar } from './Navbar'
import { useAppStore } from '../../state'
import { formatNumber } from '../../core'
import { AlertTriangle } from 'lucide-react'
import { buildMasterDataWarningItems } from '../../features/master-data/prepare-dataset'

interface AppLayoutProps {
  children: ReactNode
  masterDataSearchQuery: string
  onMasterDataSearchQueryChange: (query: string) => void
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children, masterDataSearchQuery, onMasterDataSearchQueryChange }) => {
  const {
    snapshotPair,
    fullSnapshotComparison,
    masterDataHandoff,
    masterDataSnapshots,
    requestMasterDataPrepareDataset,
  } = useAppStore()
  const warningItems = buildMasterDataWarningItems(masterDataSnapshots)
  const warningCount = warningItems.length
  const hasMissingReferenceOrCurrentValue = warningItems.some(item =>
    item.category === 'missing-value' && item.role !== 'custom'
  )
  const datasetsReady = masterDataHandoff.datasetsPrepared && !hasMissingReferenceOrCurrentValue
  const referenceStandardCost = fullSnapshotComparison.referenceCost.total
  const currentStandardCost = fullSnapshotComparison.currentCost.total
  const totalGap = fullSnapshotComparison.totalGap
  const hasNetGap = totalGap !== null && Number.isFinite(totalGap)
  const formatCost = (value: number | null) => value === null || !Number.isFinite(value) ? '—' : formatNumber(value, 4)
  const formattedGap = hasNetGap ? `${totalGap > 0 ? '+' : ''}${formatNumber(totalGap, 4)}` : '—'
  const gapTextClass = !hasNetGap
    ? 'text-slate-500'
    : totalGap > 0
      ? 'text-rose-300'
      : totalGap < 0
        ? 'text-emerald-300'
        : 'text-slate-300'

  return (
    <div className="min-h-dvh w-full bg-slate-100/70 text-slate-900 flex flex-col font-sans text-[13px] antialiased">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-white focus:px-4 focus:py-3 focus:font-medium focus:text-slate-900 focus:shadow-lg"
      >
        Skip to main content
      </a>
      <Navbar
        masterDataSearchQuery={masterDataSearchQuery}
        onMasterDataSearchQueryChange={onMasterDataSearchQueryChange}
      />
      <main
        id="main-content"
        tabIndex={-1}
        className="app-workspace-frame min-w-0 flex-1 py-3"
      >
        {children}
      </main>
      <footer aria-label="Dataset and comparison status" className="mt-auto w-full border-t border-slate-800 bg-slate-900 py-2 font-sans text-[11px] text-slate-400">
        <div className="app-workspace-frame flex flex-wrap items-center justify-between gap-x-5 gap-y-1.5 xl:flex-nowrap">
          <div role="group" aria-label="Reference and Current dataset structure" className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 tabular-nums">
            <span aria-label={`Reference dataset: ${snapshotPair.reference.bom.length} BOM items, ${snapshotPair.reference.rates.length} work centers, ${snapshotPair.reference.routing.length} routing operations`} className="whitespace-nowrap">
              <span className="mr-1 font-bold text-slate-300">REF</span>
              BOM {snapshotPair.reference.bom.length} · WC {snapshotPair.reference.rates.length} · RTG {snapshotPair.reference.routing.length}
            </span>
            <span className="hidden text-slate-700 sm:inline" aria-hidden="true">|</span>
            <span aria-label={`Current dataset: ${snapshotPair.current.bom.length} BOM items, ${snapshotPair.current.rates.length} work centers, ${snapshotPair.current.routing.length} routing operations`} className="whitespace-nowrap">
              <span className="mr-1 font-bold text-slate-300">CUR</span>
              BOM {snapshotPair.current.bom.length} · WC {snapshotPair.current.rates.length} · RTG {snapshotPair.current.routing.length}
            </span>
          </div>
          <div role="group" aria-label="Dataset readiness, product comparison, and warnings" className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${datasetsReady ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              <span className={datasetsReady ? 'text-emerald-300' : 'text-amber-300'}>
                {datasetsReady ? 'Datasets Ready' : 'Datasets Incomplete'}
              </span>
            </span>
            <span aria-hidden="true" className="text-slate-700">|</span>
            <button
              type="button"
              onClick={() => requestMasterDataPrepareDataset('comparison')}
              aria-label={`Open Prepare Dataset comparison details: Product ${masterDataHandoff.productMismatch ? 'Mismatch' : 'Match'}`}
              title="Open Prepare Dataset comparison details"
              className="min-h-7 whitespace-nowrap text-slate-300 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300"
            >
              Product {masterDataHandoff.productMismatch ? 'Mismatch' : 'Match'}
            </button>
            <span aria-hidden="true" className="text-slate-700">|</span>
            <button
              type="button"
              onClick={() => requestMasterDataPrepareDataset('all-warnings')}
              aria-label={`Open Prepare Dataset showing all ${warningCount} warnings`}
              title="Show all warnings in Prepare Dataset"
              className="inline-flex min-h-7 items-center gap-1 whitespace-nowrap text-amber-300 transition-colors hover:text-amber-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300"
            >
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="font-mono tabular-nums">{warningCount}</span>
            </button>
          </div>
          <div role="group" aria-label="Full Reference and Current standard costs and net gap" className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 font-mono tabular-nums">
            <span className="whitespace-nowrap"><span className="mr-1 font-sans font-bold text-slate-300">REF STD</span>{formatCost(referenceStandardCost)}</span>
            <span aria-hidden="true" className="text-slate-700">|</span>
            <span className="whitespace-nowrap"><span className="mr-1 font-sans font-bold text-slate-300">CUR STD</span>{formatCost(currentStandardCost)}</span>
            <span aria-hidden="true" className="text-slate-700">|</span>
            <span className="flex items-center gap-1 whitespace-nowrap">
              <span className="font-sans font-bold text-slate-300">NET GAP</span>
              <span className={`font-semibold ${gapTextClass}`}>{formattedGap}</span>
              <span className="font-sans text-slate-500">THB/pc</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
