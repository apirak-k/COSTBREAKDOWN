import React, { useState } from 'react'
import { Plus, Edit2, Trash2, Search } from 'lucide-react'
import { BOMItem, formatCurrency, formatNumber, formatPercent } from '../../../core'

interface BOMTableProps {
  bom: BOMItem[]
  activeMaterialCost: number
  onAddBOMItem: () => void
  onEditBOMItem: (item: BOMItem) => void
  onDeleteBOMItem: (id: string) => void
}

export const BOMTable: React.FC<BOMTableProps> = ({
  bom,
  activeMaterialCost,
  onAddBOMItem,
  onEditBOMItem,
  onDeleteBOMItem
}) => {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredBOM = bom.filter(
    b =>
      b.itemCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-slate-900">
            Section C: Bill of Materials (BOM Input)
          </h2>
          <span className="px-2 py-0.5 text-xs font-mono font-bold bg-slate-100 text-slate-700 rounded-md border border-slate-200">
            {bom.length} Items
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search BOM items..."
              className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 w-48 font-sans"
            />
          </div>

          <button
            onClick={onAddBOMItem}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-all shadow-xs shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add BOM Item
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <th className="p-2.5 whitespace-nowrap">Item Code</th>
              <th className="p-2.5">Material Description</th>
              <th className="p-2.5 text-right whitespace-nowrap">Usage (Q)</th>
              <th className="p-2.5 whitespace-nowrap">Unit</th>
              <th className="p-2.5 text-right whitespace-nowrap">Base P0 (THB)</th>
              <th className="p-2.5 text-right whitespace-nowrap">Active P1 (THB)</th>
              <th className="p-2.5 text-right whitespace-nowrap">Base Loss %</th>
              <th className="p-2.5 text-right whitespace-nowrap">Active Loss %</th>
              <th className="p-2.5 whitespace-nowrap">Source Reference</th>
              <th className="p-2.5 text-center whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono">
            {filteredBOM.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-6 text-center text-slate-400 font-sans italic">
                  {bom.length === 0
                    ? 'No BOM items present. Click "Add BOM Item" or upload an Excel file.'
                    : 'No BOM items match your search filter.'}
                </td>
              </tr>
            ) : (
              filteredBOM.map(b => (
                <tr key={b.id} className="hover:bg-slate-50/80">
                  <td className="p-2.5 font-bold text-slate-900 whitespace-nowrap">{b.itemCode}</td>
                  <td className="p-2.5 font-sans text-slate-700">{b.description}</td>
                  <td className="p-2.5 text-right whitespace-nowrap">{formatNumber(b.consumption, 4)}</td>
                  <td className="p-2.5 font-sans text-slate-500 whitespace-nowrap">{b.unit}</td>
                  <td className="p-2.5 text-right text-slate-500 whitespace-nowrap">{formatNumber(b.basePrice, 2)}</td>
                  <td className="p-2.5 text-right font-bold text-slate-900 whitespace-nowrap">{formatNumber(b.activePrice, 2)}</td>
                  <td className="p-2.5 text-right text-slate-500 whitespace-nowrap">{formatPercent(b.baseLoss, 0)}</td>
                  <td className="p-2.5 text-right font-bold text-slate-900 whitespace-nowrap">{formatPercent(b.activeLoss, 0)}</td>
                  <td className="p-2.5 font-sans text-slate-500 text-[11px] whitespace-nowrap">{b.sourceRef}</td>
                  <td className="p-2.5 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => onEditBOMItem(b)}
                        className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 cursor-pointer"
                        title="Edit Item"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteBOMItem(b.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 cursor-pointer"
                        title="Delete Item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Live Material Summary */}
      <div className="flex items-center justify-between text-xs bg-slate-50 p-3 rounded-lg border border-slate-200/60 font-mono">
        <span className="font-sans text-slate-600 font-medium">
          Active Material Standard Total (C_M):
        </span>
        <span className="font-bold text-slate-900 text-sm">
          {formatCurrency(activeMaterialCost, 4, 'THB/pc')}
        </span>
      </div>
    </div>
  )
}
