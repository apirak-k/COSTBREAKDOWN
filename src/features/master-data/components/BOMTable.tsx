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
    <section className="bg-white rounded-none border border-slate-300/80 shadow-2xs overflow-hidden select-none">
      <div className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2 border-b border-slate-300 bg-slate-100/80">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold font-mono text-slate-900 uppercase tracking-tight">Bill of Materials</span>
          <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-slate-200 text-slate-800">{bom.length} ITEMS</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
            <input
              value={searchTerm}
              onChange={event => setSearchTerm(event.target.value)}
              placeholder="Filter item / code..."
              className="pl-6 pr-2 py-0.5 text-[11px] font-mono border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-slate-700 w-44"
            />
          </div>
          {isEditMode && (
            <button
              type="button"
              onClick={onAddBOMItem}
              className="flex items-center gap-1 px-2.5 py-0.5 text-xs font-mono font-bold text-white bg-slate-900 hover:bg-slate-800 rounded cursor-pointer"
            >
              <Plus className="w-3 h-3" /> Add Row
            </button>
          )}
        </div>
      </div>

      {isEditMode && selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 px-3.5 py-1.5 bg-slate-900 text-white text-[11px] font-mono animate-in fade-in duration-100">
          <span className="font-bold flex items-center gap-1 text-emerald-300">
            <CheckSquare className="w-3.5 h-3.5" />
            {selectedIds.size} row{selectedIds.size > 1 ? 's' : ''} selected
          </span>
          <button
            type="button"
            onClick={handleDeleteSelected}
            className="flex items-center gap-1 px-2 py-0.5 text-rose-300 hover:text-rose-100 hover:bg-rose-950/60 rounded cursor-pointer transition-colors"
            title="Delete selected rows"
          >
            <Trash2 className="w-3 h-3" /> Delete
          </button>

          <button
            type="button"
            onClick={clearSelection}
            className="px-2 py-0.5 text-slate-400 hover:text-white cursor-pointer ml-auto"
          >
            Cancel
          </button>
        </div>
      )}

      <div className="overflow-x-auto max-h-[520px]">
        <table ref={tableRef} className="w-full text-xs text-left border-collapse">
          <thead className="sticky top-0 z-10 bg-slate-100 text-slate-700 font-mono text-[10px] font-bold uppercase tracking-wider border-b border-slate-300 select-none">
            <tr>
              {isEditMode && (
                <th className="py-1.5 px-2 text-center w-8">
                  <input
                    type="checkbox"
                    checked={filteredBOM.length > 0 && selectedIds.size === filteredBOM.length}
                    onChange={event => toggleAll(event.target.checked)}
                    className="cursor-pointer"
                  />
                </th>
              )}
              <th className="py-1.5 px-2">Item Code</th>
              <th className="py-1.5 px-2">Description</th>
              <th className="py-1.5 px-2 text-right">Consumption</th>
              <th className="py-1.5 px-2">Unit</th>
              <th className="py-1.5 px-2 text-right">Price</th>
              <th className="py-1.5 px-2 text-right">Loss</th>
              <th className="py-1.5 px-2">Note</th>
              {isEditMode && <th className="py-1.5 px-1 text-center">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
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
                      className="py-1 px-2 text-center cursor-pointer select-none"
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
                  <td className="py-1 px-2 font-bold text-slate-900">
                    {isEditMode ? (
                      <input
                        value={item.itemCode}
                        onChange={event => onUpdateBOMItem(item.id, { itemCode: event.target.value })}
                        className="w-28 px-1 py-0.5 border border-transparent focus:border-slate-300 focus:bg-white bg-transparent"
                      />
                    ) : (
                      item.itemCode
                    )}
                  </td>
                  <td className="py-1 px-2 font-sans text-slate-800">
                    {isEditMode ? (
                      <input
                        value={item.description}
                        onChange={event => onUpdateBOMItem(item.id, { description: event.target.value })}
                        className="w-full min-w-[150px] px-1 py-0.5 border border-transparent focus:border-slate-300 focus:bg-white bg-transparent"
                      />
                    ) : (
                      item.description || '—'
                    )}
                  </td>
                  <td className="py-1 px-2 text-right">
                    {isEditMode ? (
                      <input
                        type="number"
                        step="any"
                        value={numberValue(item.consumption)}
                        onChange={event => onUpdateBOMItem(item.id, { consumption: parseNumber(event.target.value) })}
                        className="w-24 text-right px-1 py-0.5 border border-transparent focus:border-slate-300 focus:bg-white bg-transparent"
                      />
                    ) : (
                      displayNumber(item.consumption)
                    )}
                  </td>
                  <td className="py-1 px-2">
                    {isEditMode ? (
                      <input
                        value={item.unit}
                        onChange={event => onUpdateBOMItem(item.id, { unit: event.target.value })}
                        className="w-16 px-1 py-0.5 border border-transparent focus:border-slate-300 focus:bg-white bg-transparent"
                      />
                    ) : (
                      item.unit || '—'
                    )}
                  </td>
                  <td className="py-1 px-2 text-right">
                    {isEditMode ? (
                      <input
                        type="number"
                        step="any"
                        value={numberValue(item.price)}
                        onChange={event => onUpdateBOMItem(item.id, { price: parseNumber(event.target.value) })}
                        className="w-24 text-right px-1 py-0.5 border border-transparent focus:border-slate-300 focus:bg-white bg-transparent"
                      />
                    ) : (
                      displayNumber(item.price, 2)
                    )}
                  </td>
                  <td className="py-1 px-2 text-right">
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
                          className="w-16 text-right px-1 py-0.5 border border-transparent focus:border-slate-300 focus:bg-white bg-transparent"
                        />
                        <span className="text-slate-400">%</span>
                      </div>
                    ) : item.loss === null ? (
                      <span className="text-amber-700">—</span>
                    ) : (
                      `${(item.loss * 100).toFixed(1)}%`
                    )}
                  </td>
                  <td className="py-1 px-2 font-sans text-slate-600">
                    {isEditMode ? (
                      <input
                        value={item.note || ''}
                        onChange={event => onUpdateBOMItem(item.id, { note: event.target.value })}
                        placeholder="Note"
                        className="w-full min-w-[160px] px-1 py-0.5 border border-transparent focus:border-slate-300 focus:bg-white bg-transparent"
                      />
                    ) : (
                      item.note || '—'
                    )}
                  </td>
                  {isEditMode && (
                    <td className="py-1 px-1 text-center">
                      <button
                        type="button"
                        onClick={() => onDeleteBOMItem(item.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
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
                        className="mt-1 flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-bold text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 rounded shadow-2xs transition-colors cursor-pointer"
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
      <div className="px-3.5 py-2 border-t border-slate-300 bg-slate-50 text-[11px] font-mono text-slate-600">
        Displaying {filteredBOM.length} of {bom.length} BOM Items
      </div>
    </section>
  )
}
