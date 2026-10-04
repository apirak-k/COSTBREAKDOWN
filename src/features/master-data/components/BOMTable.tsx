import React, { useMemo, useRef, useState } from 'react'
import { CheckSquare, Plus, Search, Trash2 } from 'lucide-react'
import { SnapshotBOMItem } from '../../../core'
import { useDragSelect } from '../hooks/useDragSelect'
import { useTableKeyboardNav } from '../hooks/useTableKeyboardNav'
import { duplicateIdentityIds, hasInvalidNumber } from '../table-validation'

interface BOMTableProps {
  bom: SnapshotBOMItem[]
  isEditMode?: boolean
  onAddBOMItem: () => void
  onUpdateBOMItem: (id: string, partial: Partial<Omit<SnapshotBOMItem, 'id' | 'confidence'>>) => void
  onDeleteBOMItem: (id: string) => void
}

const numberValue = (value: number | null): string => value === null ? '' : String(value)
const parseNumber = (value: string): number | null => value.trim() === '' ? null : Number(value)
const displayNumber = (value: number | null, digits = 4): string => value === null ? '—' : value.toFixed(digits)

export const BOMTable: React.FC<BOMTableProps> = ({
  bom,
  isEditMode = false,
  onAddBOMItem,
  onUpdateBOMItem,
  onDeleteBOMItem
}) => {
  const tableRef = useRef<HTMLTableElement | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const duplicateNameIds = useMemo(() => duplicateIdentityIds(bom, item => item.id, item => item.description), [bom])
  const rowIssues = useMemo(() => {
    const issuesById = new Map<string, string[]>()
    bom.forEach(item => {
      const issues: string[] = []
      if (!item.isGeneratedSizingPlaceholder) {
        if (!item.description.trim()) issues.push('Name is required.')
        else if (duplicateNameIds.has(item.id)) issues.push('Name must be unique.')
        if (item.consumption === null) issues.push('Usage is missing.')
        else if (hasInvalidNumber(item.consumption)) issues.push('Usage must be a non-negative number.')
        if (!item.unit.trim()) issues.push('Unit is missing.')
        if (item.price === null) issues.push('Price is missing.')
        else if (hasInvalidNumber(item.price)) issues.push('Price must be a non-negative number.')
        if (item.loss === null) issues.push('Loss is missing.')
        else if (hasInvalidNumber(item.loss)) issues.push('Loss must be a non-negative percentage.')
      }
      issuesById.set(item.id, issues)
    })
    return issuesById
  }, [bom, duplicateNameIds])

  const query = searchTerm.trim().toLocaleLowerCase()
  const filteredBOM = useMemo(() => bom.filter(item =>
    [item.description, item.consumption, item.unit, item.price, item.loss, item.note]
      .some(value => String(value ?? '').toLocaleLowerCase().includes(query))
  ), [bom, query])

  const {
    selectedIds,
    clearSelection,
    startDrag,
    toggleRow,
    onMouseEnterRow
  } = useDragSelect({
    items: filteredBOM,
    getItemId: item => item.id,
    isEditMode
  })

  useTableKeyboardNav({ tableRef, isEditMode })

  const handleDeleteSelected = () => {
    selectedIds.forEach(id => onDeleteBOMItem(id))
    clearSelection()
  }

  return (
    <section aria-label="BOM rows" className="overflow-hidden bg-white select-none">
      <div className="flex flex-col gap-3 border-b border-slate-300 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
          <input
            value={searchTerm}
            onChange={event => setSearchTerm(event.target.value)}
            placeholder="Search BOM"
            aria-label="Search BOM rows"
            className="min-h-9 w-full border border-slate-300 bg-white py-1 pl-9 pr-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-700"
          />
        </div>
        {isEditMode && (
          <button
            type="button"
            onClick={onAddBOMItem}
            className="flex min-h-9 shrink-0 items-center justify-center gap-1.5 bg-slate-900 px-3 text-sm font-medium text-white transition-colors hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            <Plus className="h-3 w-3" aria-hidden="true" /> Add row
          </button>
        )}
      </div>

      {isEditMode && selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 border-b border-blue-200 bg-blue-50 px-4 py-2 text-xs text-slate-800">
          <span className="flex items-center gap-1 font-semibold text-slate-900">
            <CheckSquare className="h-3.5 w-3.5 text-blue-700" aria-hidden="true" />
            {selectedIds.size} row{selectedIds.size === 1 ? '' : 's'} selected
          </span>
          <button
            type="button"
            onClick={handleDeleteSelected}
            className="flex min-h-9 items-center gap-1.5 px-3 text-sm text-rose-800 hover:bg-rose-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
            title="Delete selected rows"
          >
            <Trash2 className="h-3 w-3" aria-hidden="true" /> Delete
          </button>
          <button
            type="button"
            onClick={clearSelection}
            className="ml-auto min-h-9 px-3 text-sm text-slate-700 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            Cancel
          </button>
        </div>
      )}

      <div className="max-h-[520px] overflow-x-auto">
        <table ref={tableRef} className="w-full min-w-[820px] border-collapse text-left text-xs">
          <thead className="sticky top-0 z-10 border-y-2 border-slate-400 bg-slate-100 text-[11px] font-semibold uppercase tracking-wide text-slate-800">
            <tr>
              <th scope="col" className="w-12 px-3 py-2.5 text-center">#</th>
              <th scope="col" className="px-3 py-2.5">Name</th>
              <th scope="col" className="px-3 py-2.5 text-right">Usage</th>
              <th scope="col" className="px-3 py-2.5">Unit</th>
              <th scope="col" className="px-3 py-2.5 text-right">Price</th>
              <th scope="col" className="px-3 py-2.5 text-right">Loss</th>
              <th scope="col" className="px-3 py-2.5">Note</th>
              {isEditMode && <th scope="col" className="w-12 px-2 py-2.5 text-center">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-sm">
            {filteredBOM.map(item => {
              const isSelected = selectedIds.has(item.id)
              const issues = rowIssues.get(item.id) || []
              const identityInvalid = !item.isGeneratedSizingPlaceholder && (!item.description.trim() || duplicateNameIds.has(item.id))
              const rowNumber = bom.findIndex(row => row.id === item.id) + 1
              const numericClass = 'min-h-9 rounded-sm border border-slate-300 bg-white px-2 text-right text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-700'

              return (
                <tr
                  key={item.id}
                  onMouseEnter={() => onMouseEnterRow(item.id)}
                  className={`${issues.length > 0 ? 'bg-amber-50/50 ' : ''}${isSelected ? 'border-l-2 border-l-blue-700 bg-blue-50 hover:bg-blue-100' : 'hover:bg-slate-50'}`}
                  title={issues.length > 0 ? issues.join(' ') : undefined}
                >
                  <th scope="row" className="px-2 py-2 text-center font-mono font-normal text-slate-600">
                    {isEditMode ? (
                      <button
                        type="button"
                        aria-label={`Select BOM row ${rowNumber}`}
                        aria-pressed={isSelected}
                        onMouseDown={event => startDrag(item.id, event)}
                        onClick={event => { if (event.detail === 0) toggleRow(item.id) }}
                        className={`min-h-8 min-w-8 rounded-sm px-1 font-mono ${isSelected ? 'bg-blue-700 text-white' : 'text-slate-600 hover:bg-slate-200'} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700`}
                      >
                        {rowNumber}
                      </button>
                    ) : rowNumber}
                  </th>
                  <td className="px-3 py-2 font-sans text-slate-800">
                    <div className="min-w-[170px]">
                      {isEditMode ? (
                        <input
                          value={item.description}
                          onChange={event => onUpdateBOMItem(item.id, { description: event.target.value })}
                          aria-label={`Name for BOM row ${rowNumber}`}
                          aria-invalid={identityInvalid}
                          className={`min-h-9 w-full rounded-sm border bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-700 ${identityInvalid ? 'border-amber-600' : 'border-slate-300'}`}
                        />
                      ) : item.description || <span className="text-amber-700">—</span>}
                      {issues.length > 0 && <p className="mt-1 text-xs leading-4 text-amber-800">{issues.join(' ')}</p>}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">
                    {isEditMode ? (
                      <input
                        type="number"
                        step="any"
                        value={numberValue(item.consumption)}
                        onChange={event => onUpdateBOMItem(item.id, { consumption: parseNumber(event.target.value) })}
                        aria-label={`Usage for ${item.description || `BOM row ${rowNumber}`}`}
                        aria-invalid={!item.isGeneratedSizingPlaceholder && (item.consumption === null || hasInvalidNumber(item.consumption))}
                        className={`${numericClass} w-28`}
                      />
                    ) : displayNumber(item.consumption)}
                  </td>
                  <td className="px-3 py-2 font-mono">
                    {isEditMode ? (
                      <input
                        value={item.unit}
                        onChange={event => onUpdateBOMItem(item.id, { unit: event.target.value })}
                        aria-label={`Unit for ${item.description || `BOM row ${rowNumber}`}`}
                        aria-invalid={!item.isGeneratedSizingPlaceholder && !item.unit.trim()}
                        className={`min-h-9 w-20 rounded-sm border bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-700 ${!item.isGeneratedSizingPlaceholder && !item.unit.trim() ? 'border-amber-600' : 'border-slate-300'}`}
                      />
                    ) : item.unit || <span className="text-amber-700">—</span>}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">
                    {isEditMode ? (
                      <input
                        type="number"
                        step="any"
                        value={numberValue(item.price)}
                        onChange={event => onUpdateBOMItem(item.id, { price: parseNumber(event.target.value) })}
                        aria-label={`Price for ${item.description || `BOM row ${rowNumber}`}`}
                        aria-invalid={!item.isGeneratedSizingPlaceholder && (item.price === null || hasInvalidNumber(item.price))}
                        className={`${numericClass} w-28`}
                      />
                    ) : displayNumber(item.price, 2)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">
                    {isEditMode ? (
                      <div className="flex items-center justify-end gap-1">
                        <input
                          type="number"
                          step="any"
                          value={item.loss === null ? '' : String(item.loss * 100)}
                          onChange={event => {
                            const value = event.target.value.trim()
                            onUpdateBOMItem(item.id, { loss: value === '' ? null : Number(value) / 100 })
                          }}
                          aria-label={`Loss percentage for ${item.description || `BOM row ${rowNumber}`}`}
                          aria-invalid={!item.isGeneratedSizingPlaceholder && (item.loss === null || hasInvalidNumber(item.loss))}
                          className={`${numericClass} w-20`}
                        />
                        <span className="text-slate-400">%</span>
                      </div>
                    ) : item.loss === null ? <span className="text-amber-700">—</span> : `${(item.loss * 100).toFixed(1)}%`}
                  </td>
                  <td className="px-3 py-2 font-sans text-slate-600">
                    {isEditMode ? (
                      <input
                        value={item.note || ''}
                        onChange={event => onUpdateBOMItem(item.id, { note: event.target.value })}
                        aria-label={`Note for ${item.description || `BOM row ${rowNumber}`}`}
                        className="min-h-9 w-full min-w-[160px] rounded-sm border border-slate-300 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-700"
                      />
                    ) : item.note || '—'}
                  </td>
                  {isEditMode && (
                    <td className="px-2 py-1 text-center">
                      <button
                        type="button"
                        onClick={() => onDeleteBOMItem(item.id)}
                        aria-label={`Delete BOM row ${rowNumber}`}
                        className="inline-flex h-9 w-9 items-center justify-center text-slate-600 hover:bg-rose-50 hover:text-rose-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                        title="Delete row"
                      >
                        <Trash2 className="h-3 w-3" aria-hidden="true" />
                      </button>
                    </td>
                  )}
                </tr>
              )
            })}
            {filteredBOM.length === 0 && (
              <tr>
                <td colSpan={isEditMode ? 8 : 7} className="py-6 text-center font-sans text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <p className="text-xs italic text-slate-500">{bom.length === 0 ? 'No BOM rows in this dataset yet.' : 'No rows match your search.'}</p>
                    {isEditMode && bom.length === 0 && (
                      <button type="button" onClick={onAddBOMItem} className="mt-1 flex min-h-9 items-center gap-1.5 border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 hover:bg-slate-100">
                        <Plus className="h-3.5 w-3.5 text-slate-600" aria-hidden="true" /> Add first row
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {(query || filteredBOM.some(item => (rowIssues.get(item.id) || []).length > 0)) && (
        <div role="status" className="border-t border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-600">
          {query && `Showing ${filteredBOM.length} of ${bom.length} rows. `}
          {filteredBOM.filter(item => (rowIssues.get(item.id) || []).length > 0).length} rows need review.
        </div>
      )}
    </section>
  )
}
