import React, { ReactNode, useEffect, useRef, useState } from 'react'
import { Navbar } from './Navbar'
import { useAppStore } from '../../state'
import { formatNumber } from '../../core'
import { AlertTriangle } from 'lucide-react'
import {
  areMasterDataDatasetsReady,
  buildMasterDataWarningItems,
  MASTER_DATA_WARNING_CATEGORY_DEFINITIONS
} from '../../features/master-data/prepare-dataset'

interface FooterTooltipProps {
  id: string
  title: string
  align?: 'left' | 'right'
  children: ReactNode
  content: ReactNode
}

const FooterTooltip: React.FC<FooterTooltipProps> = ({ id, title, align = 'left', children, content }) => {
  const [dismissed, setDismissed] = useState(false)
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null)
  const wrapperRef = useRef<HTMLSpanElement>(null)
  const positionTooltip = () => {
    const wrapperElement = wrapperRef.current
    if (!wrapperElement) return
    const wrapper = wrapperElement.getBoundingClientRect()
    const tooltipElement = wrapperElement.querySelector<HTMLElement>('[role="tooltip"]')
    if (!tooltipElement) return
    const previousDisplay = tooltipElement.style.display
    tooltipElement.style.display = 'block'
    const tooltipRect = tooltipElement.getBoundingClientRect()
    tooltipElement.style.display = previousDisplay
    const tooltipWidth = tooltipRect.width || Math.min(256, window.innerWidth - 16)
    const tooltipHeight = tooltipRect.height
    const preferredLeft = align === 'right' ? wrapper.right - tooltipWidth : wrapper.left
    const left = Math.max(8, Math.min(preferredLeft, window.innerWidth - tooltipWidth - 8))
    const footerTop = wrapperElement.closest('footer')?.getBoundingClientRect().top ?? wrapper.top
    setPosition({ left, top: Math.max(8, footerTop - tooltipHeight - 8) })
  }

  useEffect(() => {
    window.addEventListener('resize', positionTooltip)
    return () => window.removeEventListener('resize', positionTooltip)
  }, [align])

  return (
    <span
      ref={wrapperRef}
      className="group relative inline-flex"
      onPointerEnter={() => { setDismissed(false); positionTooltip() }}
      onFocusCapture={() => { setDismissed(false); positionTooltip() }}
      onKeyDown={event => {
        if (event.key === 'Escape') setDismissed(true)
      }}
    >
      {children}
      <span
        id={id}
        role="tooltip"
        style={position === null ? undefined : { left: `${position.left}px`, top: `${position.top}px` }}
        className={`pointer-events-none fixed z-50 hidden w-64 max-w-[calc(100vw-1rem)] border border-slate-300 bg-white p-2 text-xs leading-4 text-slate-800 shadow-md ${dismissed ? '' : 'group-hover:block group-focus-within:block'}`}
      >
        <span className="mb-1 block font-semibold text-slate-900">{title}</span>
        {content}
      </span>
    </span>
  )
}

interface AppLayoutProps {
  children: ReactNode
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const {
    snapshotPair,
    fullSnapshotComparison,
    masterDataHandoff,
    masterDataSnapshots,
    requestMasterDataPrepareDataset,
  } = useAppStore()
  const warningItems = buildMasterDataWarningItems(masterDataSnapshots)
  const warningCount = warningItems.length
  const warningBreakdown = MASTER_DATA_WARNING_CATEGORY_DEFINITIONS
    .map(({ category, label }) => ({
      label,
      count: warningItems.filter(item => item.category === category).length
    }))
    .filter(item => item.count > 0)
  const datasetReadiness = [
    {
      label: 'Reference',
      ready: masterDataHandoff.referenceReady && !warningItems.some(item => item.role === 'reference' && item.category === 'missing-value')
    },
    {
      label: 'Current',
      ready: masterDataHandoff.currentReady && !warningItems.some(item => item.role === 'current' && item.category === 'missing-value')
    }
  ]
  const datasetsReady = areMasterDataDatasetsReady(masterDataHandoff, warningItems)
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
  const productMetadata = (name?: string, uom?: string) => (
    <span className="min-w-0">
      <span className="block break-words"><span className="text-slate-500">Product Name</span> {name?.trim() || '—'}</span>
      <span className="block"><span className="text-slate-500">UOM</span> {uom?.trim() || '—'}</span>
    </span>
  )

  return (
    <div className="flex h-dvh min-h-0 w-full flex-col overflow-hidden bg-slate-100/70 font-sans text-[13px] text-slate-900 antialiased">
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
        className="min-h-0 min-w-0 flex-1 overflow-y-auto py-3"
      >
        <div className="app-workspace-frame">{children}</div>
      </main>
      <footer aria-label="Dataset and comparison status" className="w-full shrink-0 border-t border-slate-800 bg-slate-900 py-2 font-sans text-[11px] text-slate-400">
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
            <FooterTooltip
              id="footer-dataset-status-tooltip"
              title="Dataset status"
              content={(
                <span className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1">
                  {datasetReadiness.map(({ label, ready }) => (
                    <React.Fragment key={label}>
                      <span>{label}</span>
                      <span className={ready ? 'text-emerald-700' : 'text-amber-700'}>{ready ? 'Prepared' : 'Needs input'}</span>
                    </React.Fragment>
                  ))}
                </span>
              )}
            >
              <span
                tabIndex={0}
                aria-describedby="footer-dataset-status-tooltip"
                aria-label={`Datasets ${datasetsReady ? 'Ready' : 'Incomplete'}`}
                className="flex min-h-7 items-center gap-1.5 whitespace-nowrap rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300"
              >
                <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${datasetsReady ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                <span className={`font-semibold ${datasetsReady ? 'text-emerald-300' : 'text-amber-300'}`}>
                  Datasets {datasetsReady ? 'Ready' : 'Incomplete'}
                </span>
              </span>
            </FooterTooltip>
            <span aria-hidden="true" className="text-slate-700">|</span>
            <FooterTooltip
              id="footer-product-status-tooltip"
              title={`Product ${masterDataHandoff.productMismatch ? 'mismatch' : 'match'}`}
              content={(
                <span className="grid min-w-0 grid-cols-[4.5rem_minmax(0,1fr)] gap-x-2 gap-y-1">
                  <span className="text-slate-500">Reference</span>
                  {productMetadata(snapshotPair.reference.product.productName, snapshotPair.reference.product.uom)}
                  <span className="text-slate-500">Current</span>
                  {productMetadata(snapshotPair.current.product.productName, snapshotPair.current.product.uom)}
                </span>
              )}
            >
              <span
                tabIndex={0}
                aria-describedby="footer-product-status-tooltip"
                aria-label={`Product ${masterDataHandoff.productMismatch ? 'Mismatch' : 'Match'}`}
                className={`inline-flex min-h-7 items-center gap-1.5 whitespace-nowrap rounded-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300 ${masterDataHandoff.productMismatch ? 'text-amber-300' : 'text-emerald-300'}`}
              >
                <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${masterDataHandoff.productMismatch ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                Product {masterDataHandoff.productMismatch ? 'Mismatch' : 'Match'}
              </span>
            </FooterTooltip>
            <span aria-hidden="true" className="text-slate-700">|</span>
            <FooterTooltip
              id="footer-warning-tooltip"
              title="Warnings"
              align="right"
              content={warningBreakdown.length > 0 ? (
                <span className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1">
                  {warningBreakdown.map(({ label, count }) => (
                    <React.Fragment key={label}>
                      <span>{label}</span>
                      <span className="text-right font-mono tabular-nums">{count}</span>
                    </React.Fragment>
                  ))}
                </span>
              ) : <span>No warning items</span>}
            >
              <button
                type="button"
                onClick={() => requestMasterDataPrepareDataset('all-warnings')}
                aria-describedby="footer-warning-tooltip"
                aria-label={`Open Prepare Dataset showing all ${warningCount} warnings`}
                className="inline-flex min-h-7 items-center gap-1 whitespace-nowrap rounded-sm text-amber-300 transition-colors hover:text-amber-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300"
              >
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="font-mono tabular-nums">{warningCount}</span>
              </button>
            </FooterTooltip>
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
