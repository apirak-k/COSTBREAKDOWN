import React, { useState } from 'react'
import { useAppStore } from '../lib/store'
import {
  Download,
  FileSpreadsheet,
  Plus,
  Trash2,
  Edit2,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Check
} from 'lucide-react'
import { downloadFile } from '../lib/export'
import { generateDynamicExcelTemplate } from '../lib/dynamic-excel-generator'
import { ExcelUploadDropzone } from '../components/ExcelUploadDropzone'
import { AddBOMModal } from '../components/AddBOMModal'
import { AddRoutingModal } from '../components/AddRoutingModal'
import { AddRateModal } from '../components/AddRateModal'
import { ConfirmModal } from '../components/ConfirmModal'
import { ProductSetupModal } from '../components/ProductSetupModal'
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
    clearAllData,
    uomList,
    promoteActiveToBaseline
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

  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false)
  const [isGeneratingExcel, setIsGeneratingExcel] = useState(false)

  const handleDownloadDynamicTemplate = async () => {
    try {
      setIsGeneratingExcel(true)
      const blob = await generateDynamicExcelTemplate({
        product,
        wcCount: rates.length,
        bomCount: bom.length,
        routingCount: routing.length,
        existingRates: rates
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `CostModel_${product.productCode || 'PRODUCT'}_TEMPLATE.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to generate template', err)
    } finally {
      setIsGeneratingExcel(false)
    }
  }

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
    <div className="space-y-5">
      {/* ── Page Header ── */}
      <div className="bg-white px-5 py-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-sm font-bold text-slate-900">1. Master Data &amp; Operational Parameters</h1>
          <p className="text-xs text-slate-400 mt-0.5">Data persists within the current browser session.</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Method Switcher */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setInputMethod('grid')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                inputMethod === 'grid'
                  ? 'bg-white text-slate-900 shadow-sm font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Manual Input
            </button>
            <button
              onClick={() => setInputMethod('import')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                inputMethod === 'import'
                  ? 'bg-white text-slate-900 shadow-sm font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Import Excel
            </button>
          </div>

          <div className="w-px h-5 bg-slate-200" />

          {/* Promote to Baseline */}
          <button
            onClick={() =>
              setConfirmConfig({
                isOpen: true,
                title: 'Promote Current Active to Baseline?',
                message: 'This will copy all active prices (P1), active losses (L1), active capacities (C1), and active yields (Y1) to become the new Baseline (P0, L0, C0, Y0) for the next improvement cycle.',
                onConfirm: () => {
                  promoteActiveToBaseline()
                  setConfirmConfig(prev => ({ ...prev, isOpen: false }))
                }
              })
            }
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all cursor-pointer"
            title="Promote active parameters to new baseline"
          >
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            Promote to Baseline
          </button>

          {/* Reset */}
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
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
            title="Restore default RGOM-024 data"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>

          {/* Clear */}
          <button
            onClick={() =>
              setConfirmConfig({
                isOpen: true,
                title: 'Clear All Data?',
                message: 'This will empty all BOM, Routing, and Work Center Rates from in-memory session storage.',
                onConfirm: () => {
                  clearAllData()
                  setConfirmConfig(prev => ({ ...prev, isOpen: false }))
                }
              })
            }
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
            title="Wipe data to start fresh blank model"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear
          </button>
        </div>
      </div>

      {/* Import Panel */}
      {inputMethod === 'import' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div>
              <h2 className="text-xs font-bold text-slate-900">Import from Excel Workbook</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Requires sheets: <span className="font-mono">1_MASTER_RATES</span>, <span className="font-mono">2_BOM_BREAKDOWN</span>, <span className="font-mono">3_ROUTING_BREAKDOWN</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadDynamicTemplate}
                disabled={isGeneratingExcel}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                {isGeneratingExcel ? 'Generating...' : 'Download Custom Template'}
              </button>
              <button
                onClick={() => downloadFile('/CostModel_RGOM-024_v2.xlsx', 'CostModel_RGOM-024_v2.xlsx')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-900 bg-slate-900 hover:bg-slate-800 text-white rounded-lg shadow-xs transition-all cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                RGOM-024 Reference
              </button>
            </div>
          </div>
          <div className="p-5">
            <ExcelUploadDropzone />
          </div>
        </div>
      )}

      {/* Section A: Product Master Header */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product Master Info Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-xs font-bold text-slate-700">Product Info</h2>
                <p className="text-[10px] text-slate-400 font-mono">
                  {rates.length} WC · {bom.length} BOM · {routing.length} Routing
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsSetupModalOpen(true)}
                className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                title="Edit table dimensions (K, N, M)"
              >
                <SlidersHorizontal className="w-3 h-3 text-slate-500" />
                Edit Sizing
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div>
                <label className="block text-slate-500 text-[11px] font-medium mb-0.5">Product Code</label>
                <input
                  type="text"
                  value={product.productCode}
                  onChange={e => updateProduct({ ...product, productCode: e.target.value })}
                  placeholder="e.g. RGOM-024"
                  className="w-full px-2.5 py-1.5 font-mono font-bold text-slate-900 bg-amber-50 border border-amber-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
              </div>
              <div>
                <label className="block text-slate-500 text-[11px] font-medium mb-0.5">Product Description</label>
                <input
                  type="text"
                  value={product.productDescription}
                  onChange={e => updateProduct({ ...product, productDescription: e.target.value })}
                  placeholder="e.g. RGOM-024"
                  className="w-full px-2.5 py-1.5 text-slate-900 bg-amber-50 border border-amber-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-500 text-[11px] font-medium mb-0.5">UOM</label>
                  <select
                    value={product.uom}
                    onChange={e => updateProduct({ ...product, uom: e.target.value })}
                    className="w-full px-2.5 py-1.5 font-mono font-bold text-slate-900 bg-amber-50 border border-amber-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer"
                  >
                    {uomList.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-500 text-[11px] font-medium mb-0.5">Effective Date</label>
                  <input
                    type="date"
                    value={product.effectiveDate}
                    onChange={e => updateProduct({ ...product, effectiveDate: e.target.value })}
                    className="w-full px-2.5 py-1.5 font-mono text-slate-900 bg-amber-50 border border-amber-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-400"
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
                  className="w-full px-2.5 py-1.5 text-slate-900 bg-amber-50 border border-amber-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section B: Work Center Rates Table */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xs font-bold text-slate-700">Work Center Rates
                <span className="ml-1.5 text-slate-400 font-normal">({rates.length})</span>
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">Labor &amp; Burden rates — THB/MHr</p>
            </div>
            <button
              onClick={() => {
                setEditingRate(undefined)
                setIsRateModalOpen(true)
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all border border-slate-200"
            >
              <Plus className="w-3.5 h-3.5" />
              Add
            </button>
          </div>

          <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                    <th className="pb-2">WC</th>
                    <th className="pb-2">Line / Department Description</th>
                    <th className="pb-2 text-right">Labor Rate (THB/MHr)</th>
                    <th className="pb-2 text-right">Burden Rate (THB/MHr)</th>
                    <th className="pb-2">Source Reference</th>
                    <th className="pb-2 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {rates.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-4 text-center text-slate-400 font-sans italic">
                        No Work Center rates. Click Add or import an Excel file.
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
                <th className="p-2.5 text-right">Base P0 (THB)</th>
                <th className="p-2.5 text-right">Active P1 (THB)</th>
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
            {costBreakdown.materialActive.toFixed(4)} THB/pc
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
            {(costBreakdown.laborActive + costBreakdown.burdenActive).toFixed(4)} THB/pc
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

      <ProductSetupModal
        isOpen={isSetupModalOpen}
        mode="edit"
        onClose={() => setIsSetupModalOpen(false)}
      />
    </div>
  )
}
