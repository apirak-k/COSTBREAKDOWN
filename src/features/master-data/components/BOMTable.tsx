import React, { useMemo, useRef, useState } from 'react'
import { Plus, Search, Trash2, CheckSquare } from 'lucide-react'
import { SnapshotBOMItem } from '../../../core'
import { useDragSelect } from '../hooks/useDragSelect'
import { useTableKeyboardNav } from '../hooks/useTableKeyboardNav'

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

  const filteredBOM = useMemo(() => bom.filter(item =>
    `${item.itemCode} ${item.description}`.toLowerCase().includes(searchTerm.toLowerCase())
  ), [bom, searchTerm])

  const {
    selectedIds,
    toggleAll,
    clearSelection,
    startDrag,
    onMouseEnterRow
  } = useDragSelect({
    items: filteredBOM,
    getItemId: item => item.id,
    isEditMode
  })

  useTableKeyboardNav({
    tableRef,
    isEditMode
  })

  const handleDeleteSelected = () => {
    selectedIds.forEach(id => onDeleteBOMItem(id))
    clearSelection()
  }

  return (
    <section className="overflow-hidden rounded-md border border-slate-200 bg-white select-none">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-900">Bill of Materials</span>
          <span className="rounded-sm border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700">{bom.length} items</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
            <input
              value={searchTerm}
              onChange={event => setSearchTerm(event.target.value)}
              placeholder="Filter item / code..."
              aria-label="Filter bill of materials by item code or description"
              className="min-h-9 w-52 rounded-sm border border-slate-300 bg-white py-1 pl-9 pr-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-700"
            />
          </div>
          {isEditMode && (
            <button
              type="button"
              onClick={onAddBOMItem}
              className="flex min-h-9 items-center gap-1.5 rounded-sm bg-slate-900 px-3 text-sm font-medium text-white transition-colors hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 cursor-pointer"
            >
              <Plus className="w-3 h-3" /> Add Row
            </button>
          )}
        </div>
      </div>

      {isEditMode && selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 bg-slate-900 px-4 py-2 text-xs text-white animate-in fade-in duration-100">
          <span className="font-bold flex items-center gap-1 text-emerald-300">
            <CheckSquare className="w-3.5 h-3.5" />
            {selectedIds.size} row{selectedIds.size > 1 ? 's' : ''} selected
          </span>
          <button
            type="button"
            onClick={handleDeleteSelected}
            className="flex min-h-9 items-center gap-1.5 rounded-sm px-3 text-sm text-rose-200 transition-colors hover:bg-rose-950/60 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300 cursor-pointer"
            title="Delete selected rows"
          >
            <Trash2 className="w-3 h-3" /> Delete
          </button>

          <button
            type="button"
            onClick={clearSelection}
            className="min-h-9 rounded-sm px-3 text-sm text-slate-300 hover:bg-slate-800 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300 cursor-pointer ml-auto"
          >
            Cancel
          </button>
        </div>
      )}

      <div className="overflow-x-auto max-h-[520px]">
        <table ref={tableRef} className="w-full min-w-[820px] border-collapse text-left text-xs">
          <thead className="sticky top-0 z-10 border-b border-slate-300 bg-slate-100 text-xs font-semibold text-slate-700 select-none">
            <tr>
              {isEditMode && (
                <th scope="col" className="px-3 py-2.5 text-center w-10">
                  <input
                    type="checkbox"
                    checked={filteredBOM.length > 0 && selectedIds.size === filteredBOM.length}
                    onChange={event => toggleAll(event.target.checked)}
                    aria-label="Select all visible bill of materials rows"
                    className="h-4 w-4 cursor-pointer accent-slate-900"
                  />
                </th>
              )}
              <th scope="col" className="px-3 py-2.5">Item Code</th>
              <th scope="col" className="px-3 py-2.5">Description</th>
              <th scope="col" className="px-3 py-2.5 text-right">Consumption</th>
              <th scope="col" className="px-3 py-2.5">Unit</th>
              <th scope="col" className="px-3 py-2.5 text-right">Price</th>
              <th scope="col" className="px-3 py-2.5 text-right">Loss</th>
              <th scope="col" className="px-3 py-2.5">Note</th>
              {isEditMode && <th scope="col" className="px-2 py-2.5 text-center">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono text-xs">
            {filteredBOM.map(item => {
              const isSelected = selectedIds.has(item.id)
              return (
                <tr
                  key={item.id}
                  onMouseEnter={() => onMouseEnterRow(item.id)}
                  className={`transition-colors ${
                    isSelected
                      ? 'bg-blue-50/80 hover:bg-blue-100/70 border-l-2 border-l-blue-600'
                      : 'hover:bg-slate-50/80'
                  }`}
                >
                  {isEditMode && (
                    <td
                      className="px-3 py-2 text-center cursor-pointer select-none"
                      onMouseDown={e => startDrag(item.id, e)}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}} // Controlled by onMouseDown
                        className="cursor-pointer pointer-events-none"
                      />
                    </td>
                  )}
                  <td className="px-3 py-2 font-semibold text-slate-900">
                    {isEditMode ? (
                      <input
                        value={item.itemCode}
                        onChange={event => onUpdateBOMItem(item.id, { itemCode: event.target.value })}
                        aria-label={`Item code for ${item.description || item.id}`}
                        className="min-h-9 w-32 rounded-sm border border-slate-300 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-700"
                      />
                    ) : (
                      item.itemCode
                    )}
                  </td>
                  <td className="px-3 py-2 font-sans text-slate-800">
                    {isEditMode ? (
                      <input
                        value={item.description}
                        onChange={event => onUpdateBOMItem(item.id, { description: event.target.value })}
                        aria-label={`Description for ${item.itemCode || 'item'}`}
                        className="min-h-9 w-full min-w-[170px] rounded-sm border border-slate-300 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-700"
                      />
                    ) : (
                      item.description || '—'
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {isEditMode ? (
                      <input
                        type="number"
                        step="any"
                        value={numberValue(item.consumption)}
                        onChange={event => onUpdateBOMItem(item.id, { consumption: parseNumber(event.target.value) })}
                        aria-label={`Consumption for ${item.itemCode || 'item'}`}
                        className="min-h-9 w-28 rounded-sm border border-slate-300 bg-white px-2 text-right text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-700"
                      />
                    ) : (
                      displayNumber(item.consumption)
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {isEditMode ? (
                      <input
                        value={item.unit}
                        onChange={event => onUpdateBOMItem(item.id, { unit: event.target.value })}
                        aria-label={`Unit for ${item.itemCode || 'item'}`}
                        className="min-h-9 w-20 rounded-sm border border-slate-300 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-700"
                      />
                    ) : (
                      item.unit || '—'
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {isEditMode ? (
                      <input
                        type="number"
                        step="any"
                        value={numberValue(item.price)}
                        onChange={event => onUpdateBOMItem(item.id, { price: parseNumber(event.target.value) })}
                        aria-label={`Price for ${item.itemCode || 'item'}`}
                        className="min-h-9 w-28 rounded-sm border border-slate-300 bg-white px-2 text-right text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-700"
                      />
                    ) : (
                      displayNumber(item.price, 2)
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
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
                          aria-label={`Loss percentage for ${item.itemCode || 'item'}`}
                          className="min-h-9 w-20 rounded-sm border border-slate-300 bg-white px-2 text-right text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-700"
                        />
                        <span className="text-slate-400">%</span>
                      </div>
                    ) : item.loss === null ? (
                      <span className="text-amber-700">—</span>
                    ) : (
                      `${(item.loss * 100).toFixed(1)}%`
                    )}
                  </td>
                  <td className="px-3 py-2 font-sans text-slate-600">
                    {isEditMode ? (
                      <input
                        value={item.note || ''}
                        onChange={event => onUpdateBOMItem(item.id, { note: event.target.value })}
                        placeholder="Note"
                        aria-label={`Note for ${item.itemCode || 'item'}`}
                        className="min-h-9 w-full min-w-[160px] rounded-sm border border-slate-300 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-700"
                      />
                    ) : (
                      item.note || '—'
                    )}
                  </td>
                  {isEditMode && (
                    <td className="px-2 py-1 text-center">
                      <button
                        type="button"
                        onClick={() => onDeleteBOMItem(item.id)}
                        aria-label={`Delete BOM item ${item.itemCode || item.id}`}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-sm text-slate-600 hover:bg-rose-50 hover:text-rose-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 cursor-pointer"
                        title="Delete row"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </td>
                  )}
                </tr>
              )
            })}
            {filteredBOM.length === 0 && (
              <tr>
                <td colSpan={isEditMode ? 9 : 7} className="py-6 text-center text-slate-500 font-sans">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <p className="text-xs text-slate-500 italic">
                      {bom.length === 0 ? 'No BOM items in this dataset yet.' : 'No rows match your filter.'}
                    </p>
                    {isEditMode && bom.length === 0 && (
                      <button
                        type="button"
                        onClick={onAddBOMItem}
                        className="mt-1 flex min-h-9 items-center gap-1.5 rounded-sm border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 text-slate-600" />
                        <span>Add First Row</span>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="border-t border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-600">
        Displaying {filteredBOM.length} of {bom.length} BOM Items
      </div>
    </section>
  )
}
