import React, { useState } from 'react'
import { Plus, Trash2, Search } from 'lucide-react'
import { BOMItem, formatCurrency } from '../../../core'

interface BOMTableProps {
  bom: BOMItem[]
  activeMaterialCost: number
  isEditMode?: boolean
  onAddBOMItem: () => void
  onEditBOMItem?: (item: BOMItem) => void
  onUpdateBOMItem: (id: string, partial: Partial<BOMItem>) => void
  onDeleteBOMItem: (id: string) => void
}

export const BOMTable: React.FC<BOMTableProps> = ({
  bom,
  activeMaterialCost,
  isEditMode = false,
  onAddBOMItem,
  onUpdateBOMItem,
  onDeleteBOMItem
}) => {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredBOM = bom.filter(
    b =>
      b.itemCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Bulk Quick Action: Copy Base to Active for all BOM items
  const handleCopyBaseToActiveAll = () => {
    bom.forEach(b => {
      onUpdateBOMItem(b.id, {
        activePrice: b.basePrice,
        activeLoss: b.baseLoss
      })
    })
  }

  // Bulk Quick Action: Apply % price shift across all items
  const handleBulkPriceShift = (pct: number) => {
    bom.forEach(b => {
      onUpdateBOMItem(b.id, {
        activePrice: Number((b.activePrice * (1 + pct)).toFixed(4))
      })
    })
  }

  return (
    <div className="bg-white rounded-none border border-slate-300/80 shadow-2xs overflow-hidden">
      {/* Table Toolbar Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2 border-b border-slate-300 bg-slate-100/80">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold font-mono text-slate-900 uppercase tracking-tight">
            Bill of Materials
          </span>
          <span className="px-1.5 py-0.2 text-[10px] font-mono font-bold bg-slate-200 text-slate-800 rounded-none">
            {bom.length} ITEMS
          </span>
        </div>

        {/* Search & Bulk Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Search */}
          <div className="relative">
            <Search className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Filter items / code..."
              className="pl-6 pr-2 py-0.5 text-[11px] font-mono border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-slate-700 w-36"
            />
          </div>

          {/* Bulk Tools (Only in Edit Mode) */}
          {isEditMode && (
            <>
              <button
                type="button"
                onClick={handleCopyBaseToActiveAll}
                className="px-2 py-0.5 text-[11px] font-mono font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 transition-colors cursor-pointer"
                title="Reset all Active P1 and Loss to match Base P0 and Loss"
              >
                Copy Base ➔ Active
              </button>

              <button
                type="button"
                onClick={() => handleBulkPriceShift(0.05)}
                className="px-2 py-0.5 text-[11px] font-mono font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 transition-colors cursor-pointer"
                title="Increase all active prices by +5%"
              >
                +5% Price Shift
              </button>

              <button
                onClick={onAddBOMItem}
                className="flex items-center gap-1 px-2.5 py-0.5 text-xs font-mono font-bold text-white bg-slate-900 hover:bg-slate-800 rounded transition-colors shadow-2xs cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                Add Row
              </button>
            </>
          )}
        </div>
      </div>

      {/* High-Density Spreadsheet Table */}
      <div className="overflow-x-auto max-h-[520px]">
        <table className="w-full text-xs text-left border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-slate-100 text-slate-700 font-mono text-[10px] font-bold uppercase tracking-wider border-b border-slate-300">
              <th className="py-1.5 px-2 text-center w-8 text-slate-400">#</th>
              <th className="py-1.5 px-2 whitespace-nowrap w-24">Item Code</th>
              <th className="py-1.5 px-2 min-w-[160px]">Description</th>
              <th className="py-1.5 px-2 text-right whitespace-nowrap w-24">Usage (Q)</th>
              <th className="py-1.5 px-1 whitespace-nowrap text-center w-12">Unit</th>
              <th className="py-1.5 px-2 text-right whitespace-nowrap w-24">Base P0 (THB)</th>
              <th className="py-1.5 px-2 text-right whitespace-nowrap w-28 font-bold text-slate-900">Active P1 (THB)</th>
              <th className="py-1.5 px-2 text-right whitespace-nowrap w-20">Base Loss %</th>
              <th className="py-1.5 px-2 text-right whitespace-nowrap w-24 font-bold text-slate-900">Active Loss %</th>
              <th className="py-1.5 px-2 whitespace-nowrap w-28">Source Ref</th>
              {isEditMode && <th className="py-1.5 px-1 text-center whitespace-nowrap w-12">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
            {filteredBOM.length === 0 ? (
              <tr>
                <td colSpan={isEditMode ? 11 : 10} className="py-8 text-center text-slate-400 font-sans italic">
                  {bom.length === 0
                    ? 'No BOM items configured.'
                    : 'No BOM items match search filter.'}
                </td>
              </tr>
            ) : (
              filteredBOM.map((b, idx) => (
                <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-1.5 px-2 text-center text-slate-400 select-none">{idx + 1}</td>
                  
                  {/* Item Code */}
                  <td className="py-1 px-1">
                    {isEditMode ? (
                      <input
                        type="text"
                        value={b.itemCode}
                        onChange={e => onUpdateBOMItem(b.id, { itemCode: e.target.value })}
                        className="w-full px-1.5 py-0.5 font-bold font-mono text-slate-900 bg-transparent hover:bg-slate-100 focus:bg-white focus:ring-1 focus:ring-slate-800 border border-transparent focus:border-slate-300 rounded"
                      />
                    ) : (
                      <span className="px-1.5 font-bold font-mono text-slate-900 text-xs">{b.itemCode}</span>
                    )}
                  </td>

                  {/* Description */}
                  <td className="py-1 px-1">
                    {isEditMode ? (
                      <input
                        type="text"
                        value={b.description}
                        onChange={e => onUpdateBOMItem(b.id, { description: e.target.value })}
                        className="w-full px-1.5 py-0.5 font-sans text-slate-800 bg-transparent hover:bg-slate-100 focus:bg-white focus:ring-1 focus:ring-slate-800 border border-transparent focus:border-slate-300 rounded"
                      />
                    ) : (
                      <span className="px-1.5 font-sans text-slate-800 text-xs truncate max-w-[200px] block" title={b.description}>{b.description}</span>
                    )}
                  </td>

                  {/* Usage Q */}
                  <td className="py-1 px-1 text-right">
                    {isEditMode ? (
                      <input
                        type="number"
                        step="any"
                        value={b.consumption}
                        onChange={e => onUpdateBOMItem(b.id, { consumption: Math.max(0, parseFloat(e.target.value) || 0) })}
                        className="w-full text-right px-1.5 py-0.5 font-mono text-slate-700 bg-transparent hover:bg-slate-100 focus:bg-white focus:ring-1 focus:ring-slate-800 border border-transparent focus:border-slate-300 rounded"
                      />
                    ) : (
                      <span className="px-1.5 font-mono text-slate-700 text-xs tabular-nums">{b.consumption.toFixed(4)}</span>
                    )}
                  </td>

                  {/* Unit */}
                  <td className="py-1 px-1 text-center">
                    {isEditMode ? (
                      <input
                        type="text"
                        value={b.unit}
                        onChange={e => onUpdateBOMItem(b.id, { unit: e.target.value })}
                        className="w-full text-center px-1 py-0.5 font-mono text-slate-500 bg-transparent hover:bg-slate-100 focus:bg-white focus:ring-1 focus:ring-slate-800 border border-transparent focus:border-slate-300 rounded"
                      />
                    ) : (
                      <span className="px-1 font-mono text-slate-500 text-xs">{b.unit}</span>
                    )}
                  </td>

                  {/* Base Price P0 */}
                  <td className="py-1 px-1 text-right">
                    {isEditMode ? (
                      <input
                        type="number"
                        step="any"
                        value={b.basePrice}
                        onChange={e => onUpdateBOMItem(b.id, { basePrice: Math.max(0, parseFloat(e.target.value) || 0) })}
                        className="w-full text-right px-1.5 py-0.5 font-mono text-slate-500 bg-transparent hover:bg-slate-100 focus:bg-white focus:ring-1 focus:ring-slate-800 border border-transparent focus:border-slate-300 rounded"
                      />
                    ) : (
                      <span className="px-1.5 font-mono text-slate-500 text-xs tabular-nums">{b.basePrice.toFixed(2)}</span>
                    )}
                  </td>

                  {/* Active Price P1 */}
                  <td className="py-1 px-1 text-right">
                    {isEditMode ? (
                      <input
                        type="number"
                        step="any"
                        value={b.activePrice}
                        onChange={e => onUpdateBOMItem(b.id, { activePrice: Math.max(0, parseFloat(e.target.value) || 0) })}
                        className="w-full text-right px-1.5 py-0.5 font-bold font-mono text-slate-900 bg-transparent hover:bg-slate-100 focus:bg-white focus:ring-1 focus:ring-slate-800 border border-transparent focus:border-slate-300 rounded"
                      />
                    ) : (
                      <span className="px-1.5 font-mono font-bold text-slate-900 text-xs tabular-nums">{b.activePrice.toFixed(2)}</span>
                    )}
                  </td>

                  {/* Base Loss % */}
                  <td className="py-1 px-1 text-right">
                    {isEditMode ? (
                      <div className="flex items-center justify-end gap-0.5">
                        <input
                          type="number"
                          step="any"
                          value={Number((b.baseLoss * 100).toFixed(1))}
                          onChange={e => onUpdateBOMItem(b.id, { baseLoss: Math.max(0, (parseFloat(e.target.value) || 0) / 100) })}
                          className="w-14 text-right px-1.5 py-0.5 font-mono text-slate-500 bg-transparent hover:bg-slate-100 focus:bg-white focus:ring-1 focus:ring-slate-800 border border-transparent focus:border-slate-300 rounded"
                        />
                        <span className="text-slate-400 text-[10px]">%</span>
                      </div>
                    ) : (
                      <span className="px-1.5 font-mono text-slate-500 text-xs tabular-nums">{(b.baseLoss * 100).toFixed(0)}%</span>
                    )}
                  </td>

                  {/* Active Loss % */}
                  <td className="py-1 px-1 text-right">
                    {isEditMode ? (
                      <div className="flex items-center justify-end gap-0.5">
                        <input
                          type="number"
                          step="any"
                          value={Number((b.activeLoss * 100).toFixed(1))}
                          onChange={e => onUpdateBOMItem(b.id, { activeLoss: Math.max(0, (parseFloat(e.target.value) || 0) / 100) })}
                          className="w-14 text-right px-1.5 py-0.5 font-bold font-mono text-slate-900 bg-transparent hover:bg-slate-100 focus:bg-white focus:ring-1 focus:ring-slate-800 border border-transparent focus:border-slate-300 rounded"
                        />
                        <span className="text-slate-400 text-[10px]">%</span>
                      </div>
                    ) : (
                      <span className="px-1.5 font-mono font-bold text-slate-900 text-xs tabular-nums">{(b.activeLoss * 100).toFixed(0)}%</span>
                    )}
                  </td>

                  {/* Source Reference */}
                  <td className="py-1 px-1">
                    {isEditMode ? (
                      <input
                        type="text"
                        value={b.sourceRef}
                        onChange={e => onUpdateBOMItem(b.id, { sourceRef: e.target.value })}
                        placeholder="e.g. Cost declare"
                        className="w-full px-1.5 py-0.5 font-sans text-[10px] text-slate-500 bg-transparent hover:bg-slate-100 focus:bg-white focus:ring-1 focus:ring-slate-800 border border-transparent focus:border-slate-300 rounded"
                      />
                    ) : (
                      <span className="px-1.5 font-sans text-slate-500 text-[11px]">{b.sourceRef || '—'}</span>
                    )}
                  </td>

                  {/* Actions */}
                  {isEditMode && (
                    <td className="py-1 px-1 text-center whitespace-nowrap">
                      <button
                        onClick={() => onDeleteBOMItem(b.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                        title="Delete Row"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer */}
      <div className="flex items-center justify-between px-3.5 py-2 border-t border-slate-300 bg-slate-50 text-[11px] font-mono text-slate-600">
        <span>Displaying {filteredBOM.length} of {bom.length} BOM Items</span>
        <div className="flex items-center gap-2">
          <span>Active Material Total:</span>
          <span className="font-bold text-slate-900 text-xs">
            {formatCurrency(activeMaterialCost, 4, 'THB/pc')}
          </span>
        </div>
      </div>
    </div>
  )
}
