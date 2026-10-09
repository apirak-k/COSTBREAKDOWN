import React, { ReactNode } from 'react'
import { Navbar } from './Navbar'
import { useAppStore } from '../../state'
import { formatVariance } from '../../core'
import { AlertTriangle } from 'lucide-react'
import { buildMasterDataWarningItems } from '../../features/master-data/prepare-dataset'

interface AppLayoutProps {
  children: ReactNode
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const {
    snapshotPair,
    snapshotComparison,
    masterDataHandoff,
    masterDataSnapshots,
    requestMasterDataPrepareDataset,
    isSelectedComparisonActive
  } = useAppStore()
  const warningCount = buildMasterDataWarningItems(masterDataSnapshots).length
  const totalGap = snapshotComparison.totalGap
  const gapTextClass = totalGap === null
    ? 'text-slate-400'
    : totalGap > 0
      ? 'text-rose-300'
      : totalGap < 0
        ? 'text-emerald-300'
        : 'text-slate-200'

  return (
    <div className="h-dvh min-h-0 overflow-hidden bg-slate-100/70 text-slate-900 flex flex-col font-sans text-[13px] antialiased">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-white focus:px-4 focus:py-3 focus:font-medium focus:text-slate-900 focus:shadow-lg"
      >
        Skip to main content
      </a>
      <Navbar />
      <main
        id="main-content"
        tabIndex={-1}
        className="min-h-0 w-full flex-1 overflow-y-auto px-3 py-3 sm:px-4 lg:px-6"
      >
        {children}
      </main>
      <footer aria-label="Dataset and comparison status" className="mt-auto border-t border-slate-800 bg-slate-900 py-2 font-sans text-[11px] text-slate-400">
        <div className="flex w-full flex-col gap-2 px-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-4 lg:px-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span role="group" aria-label={`Reference dataset: ${snapshotPair.reference.bom.length} BOM items, ${snapshotPair.reference.routing.length} routing operations, ${snapshotPair.reference.rates.length} work centers`}>
              <span className="mr-1 font-bold text-slate-300">REF</span>
              BOM {snapshotPair.reference.bom.length} · RTG {snapshotPair.reference.routing.length} · WC {snapshotPair.reference.rates.length}
            </span>
            <span className="hidden text-slate-700 sm:inline" aria-hidden="true">|</span>
            <span role="group" aria-label={`Current dataset: ${snapshotPair.current.bom.length} BOM items, ${snapshotPair.current.routing.length} routing operations, ${snapshotPair.current.rates.length} work centers`}>
              <span className="mr-1 font-bold text-slate-300">CUR</span>
              BOM {snapshotPair.current.bom.length} · RTG {snapshotPair.current.routing.length} · WC {snapshotPair.current.rates.length}
            </span>
          </div>
          <div role="group" aria-label="Dataset preparation and comparison state" className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="flex items-center gap-2">
              <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${masterDataHandoff.datasetsPrepared ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              <span className={`font-semibold tracking-wide ${masterDataHandoff.datasetsPrepared ? 'text-emerald-300' : 'text-amber-300'}`}>
                {masterDataHandoff.datasetsPrepared ? 'Both datasets prepared' : 'Dataset preparation incomplete'}
              </span>
            </span>
            <span className="whitespace-nowrap">
              <span className="mr-1 font-bold text-slate-300">{isSelectedComparisonActive ? 'SELECTED GAP' : 'GAP'}</span>
              <span className={`font-semibold tabular-nums ${gapTextClass}`}>
                {totalGap === null ? '—' : formatVariance(totalGap, 4)}
              </span>
              <span className="ml-1 text-slate-500">THB/pc</span>
            </span>
            <button
              type="button"
              onClick={requestMasterDataPrepareDataset}
              aria-label={`Open Prepare Dataset: ${warningCount} warnings`}
              title="Open Prepare Dataset"
              className="inline-flex min-h-7 items-center gap-1 px-1 text-amber-300 transition-colors hover:text-amber-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300"
            >
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="font-mono tabular-nums">{warningCount}</span>
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}
