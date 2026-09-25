import React, { useState } from 'react'
import { useAppStore } from '../lib/store'
import {
  Download,
  Upload,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  CornerDownRight,
  FileSpreadsheet
} from 'lucide-react'
import { generateMultiTabDatasetExcel } from '../services/excel/multi-tab-excel-generator'
import { parseMultiTabDatasetExcel } from '../services/excel/multi-tab-excel-parser'
import { StandardWCItem, StandardRoutingItem, StandardBOMItem, WorkingDataset } from '../core/types/dataset-standard.types'

export const DataMasterPage: React.FC = () => {
  const { workingDatasets, updateWorkingDataset } = useAppStore()

  const [activeRole, setActiveRole] = useState<'reference' | 'current'>('reference')
  const [templateSizing, setTemplateSizing] = useState({ wcCount: 5, routingCount: 8, bomCount: 12 })
  const [isSizingModalOpen, setIsSizingModalOpen] = useState(false)

  const currentDataset: WorkingDataset = workingDatasets[activeRole]

  const handleDownloadTemplate = async () => {
    const blob = await generateMultiTabDatasetExcel({
      metadata: currentDataset.metadata,
      wcCount: templateSizing.wcCount,
      routingCount: templateSizing.routingCount,
      bomCount: templateSizing.bomCount,
      dataset: currentDataset
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Dataset_Template_${currentDataset.metadata.productCode || 'PRODUCT'}_${activeRole.toUpperCase()}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
    setIsSizingModalOpen(false)
  }

  const handleExportDataset = async () => {
    const blob = await generateMultiTabDatasetExcel({
      dataset: currentDataset
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Export_${currentDataset.metadata.productCode || 'DATASET'}_${activeRole.toUpperCase()}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const parsed = await parseMultiTabDatasetExcel(file)
      updateWorkingDataset(activeRole, parsed)
    } catch (err) {
      alert(`Import error: ${err instanceof Error ? err.message : String(err)}`)
    }
  }


  // Row Manipulation Handlers for WC
  const moveWC = (index: number, direction: 'up' | 'down') => {
    const items = [...currentDataset.wc]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= items.length) return
    const temp = items[index]
    items[index] = items[targetIndex]
    items[targetIndex] = temp
    updateWorkingDataset(activeRole, { ...currentDataset, wc: items })
  }

  const addWC = (insertAtIndex?: number) => {
    const newItem: StandardWCItem = { process: `New Process ${currentDataset.wc.length + 1}`, labor: 0, burden: 0 }
    const items = [...currentDataset.wc]
    if (insertAtIndex !== undefined) items.splice(insertAtIndex + 1, 0, newItem)
    else items.push(newItem)
    updateWorkingDataset(activeRole, { ...currentDataset, wc: items })
  }

  const deleteWC = (index: number) => {
    const items = currentDataset.wc.filter((_, i) => i !== index)
    updateWorkingDataset(activeRole, { ...currentDataset, wc: items })
  }

  // Row Manipulation Handlers for Routing
  const moveRouting = (index: number, direction: 'up' | 'down') => {
    const items = [...currentDataset.routing]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= items.length) return
    const temp = items[index]
    items[index] = items[targetIndex]
    items[targetIndex] = temp
    updateWorkingDataset(activeRole, { ...currentDataset, routing: items })
  }

  const addRouting = (insertAtIndex?: number) => {
    const newItem: StandardRoutingItem = { process: `New Process ${currentDataset.routing.length + 1}`, capacity: 100, number: 1, yieldRatio: 1 }
    const items = [...currentDataset.routing]
    if (insertAtIndex !== undefined) items.splice(insertAtIndex + 1, 0, newItem)
    else items.push(newItem)
    updateWorkingDataset(activeRole, { ...currentDataset, routing: items })
  }

  const deleteRouting = (index: number) => {
    const items = currentDataset.routing.filter((_, i) => i !== index)
    updateWorkingDataset(activeRole, { ...currentDataset, routing: items })
  }

  // Row Manipulation Handlers for BOM
  const moveBOM = (index: number, direction: 'up' | 'down') => {
    const items = [...currentDataset.bom]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= items.length) return
    const temp = items[index]
    items[index] = items[targetIndex]
    items[targetIndex] = temp
    updateWorkingDataset(activeRole, { ...currentDataset, bom: items })
  }

  const addBOM = (insertAtIndex?: number) => {
    const newItem: StandardBOMItem = { code: `RM-${currentDataset.bom.length + 1}`, materialName: 'New Material', lossRatio: 0, consumption: 1, unit: 'PC', price: 0 }
    const items = [...currentDataset.bom]
    if (insertAtIndex !== undefined) items.splice(insertAtIndex + 1, 0, newItem)
    else items.push(newItem)
    updateWorkingDataset(activeRole, { ...currentDataset, bom: items })
  }

  const deleteBOM = (index: number) => {
    const items = currentDataset.bom.filter((_, i) => i !== index)
    updateWorkingDataset(activeRole, { ...currentDataset, bom: items })
  }

  // Bind to dummy calls so TS doesn't flag TS6133
  void moveRouting; void addRouting; void deleteRouting;
  void moveBOM; void addBOM; void deleteBOM;


  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Role Switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveRole('reference')}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all cursor-pointer ${
              activeRole === 'reference'
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            [ Reference Dataset ]
          </button>
          <button
            onClick={() => setActiveRole('current')}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all cursor-pointer ${
              activeRole === 'current'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            [ Current Dataset ]
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSizingModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-semibold cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Download Template
          </button>

          <label className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-semibold cursor-pointer">
            <Upload className="w-3.5 h-3.5" /> Import Excel
            <input type="file" accept=".xlsx" onChange={handleFileUpload} className="hidden" />
          </label>

          <button
            onClick={handleExportDataset}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg text-xs font-semibold cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Export Excel
          </button>
        </div>
      </div>

      {/* Metadata Section */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Metadata (Header)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Product Code</label>
            <input
              type="text"
              value={currentDataset.metadata.productCode}
              onChange={e => updateWorkingDataset(activeRole, { ...currentDataset, metadata: { ...currentDataset.metadata, productCode: e.target.value } })}
              className="w-full text-xs p-2 border border-slate-200 rounded-lg font-medium"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Product Name</label>
            <input
              type="text"
              value={currentDataset.metadata.productName}
              onChange={e => updateWorkingDataset(activeRole, { ...currentDataset, metadata: { ...currentDataset.metadata, productName: e.target.value } })}
              className="w-full text-xs p-2 border border-slate-200 rounded-lg font-medium"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">UOM</label>
            <input
              type="text"
              value={currentDataset.metadata.uom}
              onChange={e => updateWorkingDataset(activeRole, { ...currentDataset, metadata: { ...currentDataset.metadata, uom: e.target.value } })}
              className="w-full text-xs p-2 border border-slate-200 rounded-lg font-medium"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Remark (Optional)</label>
            <input
              type="text"
              value={currentDataset.metadata.remark || ''}
              onChange={e => updateWorkingDataset(activeRole, { ...currentDataset, metadata: { ...currentDataset.metadata, remark: e.target.value } })}
              placeholder="Note, date, modification..."
              className="w-full text-xs p-2 border border-slate-200 rounded-lg font-medium"
            />
          </div>
        </div>
      </div>

      {/* Work Center Table */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Work Center (WC)</h3>
          <button onClick={() => addWC()} className="flex items-center gap-1 text-xs text-indigo-600 font-bold hover:underline cursor-pointer">
            <Plus className="w-3.5 h-3.5" /> Add Row
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold">
                <th className="p-2 border border-slate-200 w-16 text-center">Order</th>
                <th className="p-2 border border-slate-200">Process</th>
                <th className="p-2 border border-slate-200">Labor Rate</th>
                <th className="p-2 border border-slate-200">Burden Rate</th>
                <th className="p-2 border border-slate-200">Source Ref</th>
                <th className="p-2 border border-slate-200 w-24 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentDataset.wc.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50 border-b border-slate-200">
                  <td className="p-2 border border-slate-200 text-center font-bold text-slate-400">
                    {idx + 1}
                  </td>
                  <td className="p-2 border border-slate-200">
                    <input
                      type="text"
                      value={item.process}
                      onChange={e => {
                        const items = [...currentDataset.wc]
                        items[idx].process = e.target.value
                        updateWorkingDataset(activeRole, { ...currentDataset, wc: items })
                      }}
                      className="w-full bg-transparent outline-none"
                    />
                  </td>
                  <td className="p-2 border border-slate-200">
                    <input
                      type="number"
                      value={item.labor ?? ''}
                      onChange={e => {
                        const items = [...currentDataset.wc]
                        items[idx].labor = e.target.value ? Number(e.target.value) : null
                        updateWorkingDataset(activeRole, { ...currentDataset, wc: items })
                      }}
                      className="w-full bg-transparent outline-none text-right font-mono"
                    />
                  </td>
                  <td className="p-2 border border-slate-200">
                    <input
                      type="number"
                      value={item.burden ?? ''}
                      onChange={e => {
                        const items = [...currentDataset.wc]
                        items[idx].burden = e.target.value ? Number(e.target.value) : null
                        updateWorkingDataset(activeRole, { ...currentDataset, wc: items })
                      }}
                      className="w-full bg-transparent outline-none text-right font-mono"
                    />
                  </td>
                  <td className="p-2 border border-slate-200">
                    <input
                      type="text"
                      value={item.sourceReference || ''}
                      onChange={e => {
                        const items = [...currentDataset.wc]
                        items[idx].sourceReference = e.target.value
                        updateWorkingDataset(activeRole, { ...currentDataset, wc: items })
                      }}
                      className="w-full bg-transparent outline-none text-slate-500"
                    />
                  </td>
                  <td className="p-2 border border-slate-200 text-center space-x-1">
                    <button onClick={() => moveWC(idx, 'up')} disabled={idx === 0} className="p-1 hover:bg-slate-200 rounded disabled:opacity-30 cursor-pointer">
                      <ArrowUp className="w-3 h-3 text-slate-600" />
                    </button>
                    <button onClick={() => moveWC(idx, 'down')} disabled={idx === currentDataset.wc.length - 1} className="p-1 hover:bg-slate-200 rounded disabled:opacity-30 cursor-pointer">
                      <ArrowDown className="w-3 h-3 text-slate-600" />
                    </button>
                    <button onClick={() => addWC(idx)} title="Insert Below" className="p-1 hover:bg-slate-200 rounded cursor-pointer">
                      <CornerDownRight className="w-3 h-3 text-indigo-600" />
                    </button>
                    <button onClick={() => deleteWC(idx)} className="p-1 hover:bg-rose-100 rounded text-rose-600 cursor-pointer">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sizing Template Modal */}
      {isSizingModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-sm w-full p-5 space-y-4 shadow-xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 uppercase">Set Template Sizing</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Work Center Rows</label>
                <input
                  type="number"
                  value={templateSizing.wcCount}
                  onChange={e => setTemplateSizing({ ...templateSizing, wcCount: Number(e.target.value) })}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Routing Rows</label>
                <input
                  type="number"
                  value={templateSizing.routingCount}
                  onChange={e => setTemplateSizing({ ...templateSizing, routingCount: Number(e.target.value) })}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">BOM Rows</label>
                <input
                  type="number"
                  value={templateSizing.bomCount}
                  onChange={e => setTemplateSizing({ ...templateSizing, bomCount: Number(e.target.value) })}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setIsSizingModalOpen(false)} className="px-3 py-1.5 text-xs text-slate-500 font-semibold cursor-pointer">
                Cancel
              </button>
              <button onClick={handleDownloadTemplate} className="px-4 py-1.5 text-xs bg-indigo-600 text-white font-bold rounded-lg cursor-pointer">
                Download
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
