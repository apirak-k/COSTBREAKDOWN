import React, { useEffect, useState } from 'react'
import type { ComparisonFinding, CostComparison, SnapshotPair } from '../../../core'
import {
  getComparisonSortLabel,
  getComparisonViewLabel,
  isVisibleInComparisonView,
  sortComparisonRows
} from './comparison-view'
import type { ComparisonSortMode, ComparisonViewMode } from './comparison-view'
import { buildBOMItemizedRows } from './BOMDetailedTable'
import type { BOMItemizedRow } from './BOMDetailedTable'
import { buildRoutingItemizedRows } from './RoutingDetailedTable'
import type { RoutingItemizedRow } from './RoutingDetailedTable'
import { CandidateFindingsTable } from './CandidateFindingsTable'
import type { CandidateTableRow, CandidateTableType } from './CandidateFindingsTable'

export type ItemizedTypeTab = 'all' | 'bom' | 'rtg'

interface ItemizedComparisonTableProps {
  comparison: CostComparison
  pair: SnapshotPair
  typeTab: ItemizedTypeTab
  viewMode: ComparisonViewMode
  sortMode: ComparisonSortMode
  sortResetToken?: number
  selectedBOMKeys?: Set<string>
  selectedRoutingKeys?: Set<string>
  onToggleFinding?: (type: 'bom' | 'routing', key: string) => void
  onSetFindingSelection?: (type: CandidateTableType, nextKeys: ReadonlySet<string>) => void
}

interface ManualOrder {
  sortMode: ComparisonSortMode
  resetToken: number
  keys: string[]
}

interface ItemizedRow {
  key: string
  type: 'BOM' | 'RTG'
  finding?: ComparisonFinding
  label: string
  gap: number | null
  detail: BOMItemizedRow | RoutingItemizedRow
}

function toRows(comparison: CostComparison, pair: SnapshotPair): { bom: ItemizedRow[]; routing: ItemizedRow[] } {
  const bom = buildBOMItemizedRows(pair.reference.bom, pair.current.bom, comparison.bomFindings).map(detail => ({
    key: detail.key,
    type: 'BOM' as const,
    finding: detail.finding,
    label: detail.current?.description ?? detail.reference?.description ?? 'Unnamed material',
    gap: detail.gap,
    detail
  }))
  const routing = buildRoutingItemizedRows(
    pair.reference.routing,
    pair.current.routing,
    comparison.routingFindings,
    pair.reference.rates,
    pair.current.rates
  ).map(detail => ({
    key: detail.key,
    type: 'RTG' as const,
    finding: detail.finding,
    label: detail.current?.processName ?? detail.reference?.processName ?? 'Unnamed process',
    gap: detail.conversionGap,
    detail
  }))
  return { bom, routing }
}

function applyManualOrder(rows: CandidateTableRow[], order: ManualOrder | null, mode: ComparisonSortMode, resetToken: number): CandidateTableRow[] {
  if (!order || order.sortMode !== mode || order.resetToken !== resetToken) return rows
  const rowByKey = new Map(rows.map(row => [row.key, row]))
  const result = order.keys.flatMap(key => {
    const row = rowByKey.get(key)
    if (!row) return []
    rowByKey.delete(key)
    return [row]
  })
  rows.forEach(row => {
    if (rowByKey.has(row.key)) {
      result.push(row)
      rowByKey.delete(row.key)
    }
  })
  return result
}

export const ItemizedComparisonTable: React.FC<ItemizedComparisonTableProps> = ({
  comparison,
  pair,
  typeTab,
  viewMode,
  sortMode,
  sortResetToken = 0,
  selectedBOMKeys,
  selectedRoutingKeys,
  onToggleFinding,
  onSetFindingSelection
}) => {
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [manualOrders, setManualOrders] = useState<Record<CandidateTableType, ManualOrder | null>>({ bom: null, routing: null })
  const { bom, routing } = toRows(comparison, pair)
  const visibleBOMRows = sortComparisonRows(bom.filter(row => isVisibleInComparisonView(row.finding, viewMode)), sortMode)
  const visibleRoutingRows = sortComparisonRows(routing.filter(row => isVisibleInComparisonView(row.finding, viewMode)), sortMode)
  const displayedBOMRows = applyManualOrder(visibleBOMRows, manualOrders.bom, sortMode, sortResetToken)
  const displayedRoutingRows = applyManualOrder(visibleRoutingRows, manualOrders.routing, sortMode, sortResetToken)
  const visibleRows = typeTab === 'bom'
    ? displayedBOMRows
    : typeTab === 'rtg' ? displayedRoutingRows : [...displayedBOMRows, ...displayedRoutingRows]
  const totalRows = visibleRows.length
  const selectedBOM = selectedBOMKeys ?? new Set<string>()
  const selectedRouting = selectedRoutingKeys ?? new Set<string>()

  useEffect(() => {
    setManualOrders({ bom: null, routing: null })
  }, [sortMode, sortResetToken])

  const setManualOrder = (type: CandidateTableType, keys: string[]) => {
    setManualOrders(previous => ({
      ...previous,
      [type]: { sortMode, resetToken: sortResetToken, keys }
    }))
  }

  const toggleExpanded = (rowKey: string) => {
    setExpandedRow(current => current === rowKey ? null : rowKey)
  }

  const asCandidateRows = (rows: ItemizedRow[]): CandidateTableRow[] => rows.map(row => ({
    key: row.key,
    type: row.type,
    finding: row.finding,
    label: row.label,
    gap: row.gap,
    detail: row.detail
  }))

  return (
    <section aria-labelledby="itemized-comparison-title" className="overflow-hidden rounded-md border border-slate-200 bg-white">
      <div className="border-b border-slate-200 bg-slate-50 px-3 py-3">
        <h2 id="itemized-comparison-title" tabIndex={-1} className="font-sans text-sm font-semibold text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">Candidates</h2>
        <p className="mt-0.5 text-[11px] text-slate-500">{getComparisonViewLabel(viewMode)} status view · {totalRows} shown · {getComparisonSortLabel(sortMode)}</p>
      </div>

      {typeTab !== 'rtg' && <CandidateFindingsTable
        type="bom"
        rows={asCandidateRows(displayedBOMRows)}
        selectedKeys={selectedBOM}
        totalGap={comparison.totalGap}
        pair={pair}
        expandedRow={expandedRow}
        onToggleExpanded={toggleExpanded}
        onToggleFinding={onToggleFinding}
        onSetFindingSelection={onSetFindingSelection}
        onManualOrderChange={keys => setManualOrder('bom', keys)}
      />}

      {typeTab !== 'bom' && <CandidateFindingsTable
        type="routing"
        rows={asCandidateRows(displayedRoutingRows)}
        selectedKeys={selectedRouting}
        totalGap={comparison.totalGap}
        pair={pair}
        expandedRow={expandedRow}
        onToggleExpanded={toggleExpanded}
        onToggleFinding={onToggleFinding}
        onSetFindingSelection={onSetFindingSelection}
        onManualOrderChange={keys => setManualOrder('routing', keys)}
      />}
    </section>
  )
}
