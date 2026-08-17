import React, { useState } from 'react'
import { useAppStore } from '../lib/store'
import {
  Download,
  FileSpreadsheet,
  Plus,
  Trash2,
  Edit2,
  RotateCcw,
  Upload,
  Database,
  Search,
  CheckCircle
} from 'lucide-react'
import { downloadFile } from '../lib/export'
import { ExcelUploadDropzone } from '../components/ExcelUploadDropzone'
import { AddBOMModal } from '../components/AddBOMModal'
import { AddRoutingModal } from '../components/AddRoutingModal'
import { AddRateModal } from '../components/AddRateModal'
import { ConfirmModal } from '../components/ConfirmModal'
import { BOMItem, RoutingStep, WorkCenterRate } from '../lib/types'

export const DataMasterPage: React.FC = () => {
  const {
    product,
    updateProduct,
    rates,
    addWorkCenterRate,
    updateWorkCenterRate,
    deleteWorkCenterRate,
    bom,
    addBOMItem,
    updateBOMItem,
    deleteBOMItem,
    routing,
    addRoutingStep,
    updateRoutingStep,
    deleteRoutingStep,
    costBreakdown,
    resetToDefault,
    clearAllData
  } = useAppStore()

  // Tab mode: 'grid' (Method A) vs 'import' (Method B)
  const [inputMethod, setInputMethod] = useState<'grid' | 'import'>('grid')

  // Search filters
  const [bomSearch, setBomSearch] = useState('')
  const [routingSearch, setRoutingSearch] = useState('')

  // Modals state
  const [isBOMModalOpen, setIsBOMModalOpen] = useState(false)
  const [editingBOM, setEditingBOM] = useState<BOMItem | undefined>(undefined)

  const [isRoutingModalOpen, setIsRoutingModalOpen] = useState(false)
  const [editingRouting, setEditingRouting] = useState<RoutingStep | undefined>(undefined)

  const [isRateModalOpen, setIsRateModalOpen] = useState(false)
  const [editingRate, setEditingRate] = useState<WorkCenterRate | undefined>(undefined)

  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean
    title: string
    message: string
    onConfirm: () => void
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  })

  // Filtered data
  const filteredBOM = bom.filter(
    b =>
      b.itemCode.toLowerCase().includes(bomSearch.toLowerCase()) ||
      b.description.toLowerCase().includes(bomSearch.toLowerCase())
  )

  const filteredRouting = routing.filter(
    r =>
      r.description.toLowerCase().includes(routingSearch.toLowerCase()) ||
      r.wc.toLowerCase().includes(routingSearch.toLowerCase()) ||
      String(r.opSeq).includes(routingSearch)
  )

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-bold text-slate-900">1. Master Data & Operational Parameters</h1>
            <span className="px-2 py-0.5 text-[11px] font-bold bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200 flex items-center gap-1 font-mono">
              <CheckCircle className="w-3 h-3 text-emerald-600" />
              sessionStorage Active
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Data persists across browser refreshes and clears automatically upon closing the session.
          </p>
        </div>

        {/* Global Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Method Switcher Buttons */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setInputMethod('grid')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all ${
                inputMethod === 'grid'
                  ? 'bg-white text-slate-900 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              Method A: Interactive Data Grid
            </button>
            <button
              onClick={() => setInputMethod('import')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all ${
                inputMethod === 'import'
                  ? 'bg-white text-slate-900 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Upload className="w-3.5 h-3.5 text-emerald-600" />
              Method B: Excel Import (.xlsx)
            </button>
          </div>

          {/* Reset to RGOM-024 */}
          <button
            onClick={() =>
              setConfirmConfig({
                isOpen: true,
                title: 'Reset to Default (RGOM-024)?',
                message: 'This will restore the standard baseline BOM, Routing, and Rates from seed data.',
                onConfirm: () => {
                  resetToDefault()
                  setConfirmConfig(prev => ({ ...prev, isOpen: false }))
                }
              })
            }
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all border border-slate-200"
            title="Restore default RGOM-024 data"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Default
          </button>

          {/* Clear All Data */}
          <button
            onClick={() =>
              setConfirmConfig({
                isOpen: true,
                title: 'Clear All Data (Blank Slate)?',
                message: 'This will empty all BOM, Routing, and Work Center Rates from in-memory session storage.',
                onConfirm: () => {
                  clearAllData()
                  setConfirmConfig(prev => ({ ...prev, isOpen: false }))
                }
              })
            }
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-all border border-rose-200"
            title="Wipe data to start fresh blank model"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear All
          </button>
        </div>
      </div>

      {/* Method B: Excel File Import Area */}
      {inputMethod === 'import' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Method B: Import Data from Excel Workbook</h2>
              <p className="text-xs text-slate-500">
                Upload a populated <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">CostModel_BLANK_TEMPLATE_v2.xlsx</code>. Workbook must contain sheets: <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">1_MASTER_RATES</code>, <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">2_BOM_BREAKDOWN</code>, <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">3_ROUTING_BREAKDOWN</code>.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => downloadFile('/CostModel_BLANK_TEMPLATE_v2.xlsx', 'CostModel_BLANK_TEMPLATE_v2.xlsx')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                Download Blank Template
              </button>
              <button
                onClick={() => downloadFile('/CostModel_RGOM-024_v2.xlsx', 'CostModel_RGOM-024_v2.xlsx')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-all"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Download RGOM-024 Reference
              </button>
            </div>
          </div>

          <ExcelUploadDropzone />
        </div>
      )}

      {/* Section A: Product Master Header */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product Master Info Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Product Master Info</h2>
            <span className="text-[11px] font-mono text-slate-400">Pure Input</span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div>
              <label className="block text-slate-500 text-[11px] font-medium mb-0.5">Product Code</label>
              <input
                type="text"
                value={product.productCode}
                onChange={e => updateProduct({ ...product, productCode: e.target.value })}
                placeholder="e.g. RGOM-024"
                className="w-full px-2.5 py-1.5 font-mono font-bold text-slate-900 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
            <div>
              <label className="block text-slate-500 text-[11px] font-medium mb-0.5">Product Description</label>
              <input
                type="text"
                value={product.productDescription}
                onChange={e => updateProduct({ ...product, productDescription: e.target.value })}
                placeholder="e.g. RGOM-024"
                className="w-full px-2.5 py-1.5 text-slate-900 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-500 text-[11px] font-medium mb-0.5">UOM</label>
                <input
                  type="text"
                  value={product.uom}
                  onChange={e => updateProduct({ ...product, uom: e.target.value })}
                  className="w-full px-2.5 py-1.5 font-mono font-bold text-slate-900 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>
              <div>
                <label className="block text-slate-500 text-[11px] font-medium mb-0.5">Effective Date</label>
                <input
                  type="date"
                  value={product.effectiveDate}
                  onChange={e => updateProduct({ ...product, effectiveDate: e.target.value })}
                  className="w-full px-2.5 py-1.5 font-mono text-slate-900 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>
            </div>
            <div>
              <label className="block text-slate-500 text-[11px] font-medium mb-0.5">Application / Customer</label>
              <input
                type="text"
                value={product.customer}
                onChange={e => updateProduct({ ...product, customer: e.target.value })}
                placeholder="e.g. Automotive Display Panel"
                className="w-full px-2.5 py-1.5 text-slate-900 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>
        </div>

        {/* Section B: Work Center Rates Table */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Section B: Work Center Rates ({rates.length} Work Centers)
                </h2>
                <p className="text-[11px] text-slate-500">Departmental Labor & Burden rates in THB/MHr</p>
              </div>
              <button
                onClick={() => {
                  setEditingRate(undefined)
                  setIsRateModalOpen(true)
                }}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all border border-slate-200"
              >
                <Plus className="w-3.5 h-3.5" />
                Add WC Rate
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                    <th className="pb-2">WC</th>
                    <th className="pb-2">Line / Department Description</th>
                    <th className="pb-2 text-right">Labor Rate (฿/MHr)</th>
                    <th className="pb-2 text-right">Burden Rate (฿/MHr)</th>
                    <th className="pb-2">Source Reference</th>
                    <th className="pb-2 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {rates.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-4 text-center text-slate-400 font-sans italic">
                        No Work Center rates configured. Click "Add WC Rate" or import an Excel file.
                      </td>
                    </tr>
                  ) : (
                    rates.map(r => (
                      <tr key={r.wc} className="hover:bg-slate-50">
                        <td className="py-2 font-bold text-slate-900">{r.wc}</td>
                        <td className="py-2 font-sans text-slate-700">{r.description}</td>
                        <td className="py-2 text-right font-bold text-slate-900">{r.laborRate.toFixed(2)}</td>
                        <td className="py-2 text-right font-bold text-slate-900">{r.burdenRate.toFixed(2)}</td>
                        <td className="py-2 font-sans text-slate-500">{r.sourceRef}</td>
                        <td className="py-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => {
                                setEditingRate(r)
                                setIsRateModalOpen(true)
                              }}
                              className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100"
                              title="Edit Rate"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() =>
                                setConfirmConfig({
                                  isOpen: true,
                                  title: `Delete Work Center Rate ${r.wc}?`,
                                  message: `This will remove rate definitions for ${r.description}.`,
                                  onConfirm: () => {
                                    deleteWorkCenterRate(r.wc)
                                    setConfirmConfig(prev => ({ ...prev, isOpen: false }))
                                  }
                                })
                              }
                              className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50"
                              title="Delete Rate"
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
          </div>

          {/* Quick Info Bar */}
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-sans">
            <span>Audit Traceability: All rates mapped to operations via VLOOKUP in calculation engine.</span>
          </div>
        </div>
      </div>

      {/* Section C: BOM Material Input Table */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900">
                Section C: Bill of Materials (BOM Input)
              </h2>
              <span className="px-2 py-0.5 text-xs font-mono font-bold bg-slate-100 text-slate-700 rounded-md border border-slate-200">
                {bom.length} Items
              </span>
            </div>
            <p className="text-xs text-slate-500">Pure operational consumption, purchase prices, and scrap loss rates</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={bomSearch}
                onChange={e => setBomSearch(e.target.value)}
                placeholder="Search BOM items..."
                className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 w-48 font-sans"
              />
            </div>

            {/* Add BOM Item Button */}
            <button
              onClick={() => {
                setEditingBOM(undefined)
                setIsBOMModalOpen(true)
              }}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-all shadow-sm shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Add BOM Item
            </button>
          </div>
        </div>

        {/* BOM Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <th className="p-2.5">Item Code</th>
                <th className="p-2.5">Material Description</th>
                <th className="p-2.5 text-right">Usage (Q)</th>
                <th className="p-2.5">Unit</th>
                <th className="p-2.5 text-right">Base P0 (฿)</th>
                <th className="p-2.5 text-right">Active P1 (฿)</th>
                <th className="p-2.5 text-right">Base Loss %</th>
                <th className="p-2.5 text-right">Active Loss %</th>
                <th className="p-2.5">Source Reference</th>
                <th className="p-2.5 text-center">Actions</th>
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
                    <td className="p-2.5 font-bold text-slate-900">{b.itemCode}</td>
                    <td className="p-2.5 font-sans text-slate-700">{b.description}</td>
                    <td className="p-2.5 text-right">{b.consumption.toFixed(4)}</td>
                    <td className="p-2.5 font-sans text-slate-500">{b.unit}</td>
                    <td className="p-2.5 text-right text-slate-500">{b.basePrice.toFixed(2)}</td>
                    <td className="p-2.5 text-right font-bold text-slate-900">{b.activePrice.toFixed(2)}</td>
                    <td className="p-2.5 text-right text-slate-500">{(b.baseLoss * 100).toFixed(0)}%</td>
                    <td className="p-2.5 text-right font-bold text-slate-900">{(b.activeLoss * 100).toFixed(0)}%</td>
                    <td className="p-2.5 font-sans text-slate-500">{b.sourceRef}</td>
                    <td className="p-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => {
                            setEditingBOM(b)
                            setIsBOMModalOpen(true)
                          }}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100"
                          title="Edit Item"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() =>
                            setConfirmConfig({
                              isOpen: true,
                              title: `Delete BOM Item ${b.itemCode}?`,
                              message: `Are you sure you want to remove ${b.description}?`,
                              onConfirm: () => {
                                deleteBOMItem(b.id)
                                setConfirmConfig(prev => ({ ...prev, isOpen: false }))
                              }
                            })
                          }
                          className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50"
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
            Active Material Standard Total ($C_M$):
          </span>
          <span className="font-bold text-slate-900 text-sm">
            {costBreakdown.materialActive.toFixed(4)} ฿/pc
          </span>
        </div>
      </div>

      {/* Section D: Routing Process Input Table */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900">
                Section D: Process Routing Sequence (Routing Input)
              </h2>
              <span className="px-2 py-0.5 text-xs font-mono font-bold bg-slate-100 text-slate-700 rounded-md border border-slate-200">
                {routing.length} Operations
              </span>
            </div>
            <p className="text-xs text-slate-500">Manning, line capacity (pc/hr), and first-pass yield rates</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={routingSearch}
                onChange={e => setRoutingSearch(e.target.value)}
                placeholder="Search operations..."
                className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 w-48 font-sans"
              />
            </div>

            {/* Add Routing Step Button */}
            <button
              onClick={() => {
                setEditingRouting(undefined)
                setIsRoutingModalOpen(true)
              }}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-all shadow-sm shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Routing Step
            </button>
          </div>
        </div>

        {/* Routing Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <th className="p-2.5">Op #</th>
                <th className="p-2.5">Operation Description</th>
                <th className="p-2.5">WC</th>
                <th className="p-2.5 text-center">Man (M)</th>
                <th className="p-2.5 text-right">Base Cap (pc/hr)</th>
                <th className="p-2.5 text-right">Active Cap (pc/hr)</th>
                <th className="p-2.5 text-right">Base Yield %</th>
                <th className="p-2.5 text-right">Active Yield %</th>
                <th className="p-2.5">Source Reference</th>
                <th className="p-2.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {filteredRouting.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-6 text-center text-slate-400 font-sans italic">
                    {routing.length === 0
                      ? 'No Routing operations present. Click "Add Routing Step" or upload an Excel file.'
                      : 'No Routing operations match your search filter.'}
                  </td>
                </tr>
              ) : (
                filteredRouting.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50/80">
                    <td className="p-2.5 font-bold text-slate-900">Op {r.opSeq}</td>
                    <td className="p-2.5 font-sans text-slate-700">{r.description}</td>
                    <td className="p-2.5 font-bold text-slate-800">{r.wc}</td>
                    <td className="p-2.5 text-center">{r.manning}</td>
                    <td className="p-2.5 text-right text-slate-500">{r.baseCap}</td>
                    <td className="p-2.5 text-right font-bold text-slate-900">{r.activeCap}</td>
                    <td className="p-2.5 text-right text-slate-500">{(r.baseYield * 100).toFixed(0)}%</td>
                    <td
                      className={`p-2.5 text-right font-bold ${
                        r.activeYield < r.baseYield ? 'text-rose-600' : 'text-slate-900'
                      }`}
                    >
                      {(r.activeYield * 100).toFixed(0)}%
                    </td>
                    <td className="p-2.5 font-sans text-slate-500">{r.sourceRef}</td>
                    <td className="p-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => {
                            setEditingRouting(r)
                            setIsRoutingModalOpen(true)
                          }}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100"
                          title="Edit Step"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() =>
                            setConfirmConfig({
                              isOpen: true,
                              title: `Delete Operation ${r.opSeq}?`,
                              message: `Are you sure you want to delete Op ${r.opSeq} (${r.description})?`,
                              onConfirm: () => {
                                deleteRoutingStep(r.id)
                                setConfirmConfig(prev => ({ ...prev, isOpen: false }))
                              }
                            })
                          }
                          className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50"
                          title="Delete Step"
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

        {/* Live Conversion Summary */}
        <div className="flex items-center justify-between text-xs bg-slate-50 p-3 rounded-lg border border-slate-200/60 font-mono">
          <span className="font-sans text-slate-600 font-medium">
            Active Conversion Standard Total ($C_L + C_B$):
          </span>
          <span className="font-bold text-slate-900 text-sm">
            {(costBreakdown.laborActive + costBreakdown.burdenActive).toFixed(4)} ฿/pc
          </span>
        </div>
      </div>

      {/* Modals Container */}
      <AddBOMModal
        isOpen={isBOMModalOpen}
        onClose={() => setIsBOMModalOpen(false)}
        initialData={editingBOM}
        onSave={item => {
          if (editingBOM) {
            updateBOMItem(editingBOM.id, item)
          } else {
            addBOMItem(item)
          }
        }}
      />

      <AddRoutingModal
        isOpen={isRoutingModalOpen}
        onClose={() => setIsRoutingModalOpen(false)}
        rates={rates}
        initialData={editingRouting}
        onSave={step => {
          if (editingRouting) {
            updateRoutingStep(editingRouting.id, step)
          } else {
            addRoutingStep(step)
          }
        }}
      />

      <AddRateModal
        isOpen={isRateModalOpen}
        onClose={() => setIsRateModalOpen(false)}
        initialData={editingRate}
        onSave={rate => {
          if (editingRate) {
            updateWorkCenterRate(editingRate.wc, rate)
          } else {
            addWorkCenterRate(rate)
          }
        }}
      />

      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  )
}
