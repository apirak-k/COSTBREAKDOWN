import React, { useState, useMemo } from 'react'
import { useAppStore } from '../lib/store'

export const RCAAndTrialPage: React.FC = () => {
  const { topDrivers, costBreakdown, bom, routing, rates } = useAppStore()

  // Find the top controllable driver (first one marked controllable, or simply #1 if none marked)
  const controllableDrivers = topDrivers.filter(d => d.controllability !== 'Uncontrollable')
  const topDriver = controllableDrivers.length > 0 ? controllableDrivers[0] : topDrivers[0]

  // Determine driver type and find the source data row
  const isRoutingDriver = topDriver ? topDriver.category !== 'Direct Material' : false
  const bomItem = !isRoutingDriver && topDriver
    ? bom.find(b => b.description === topDriver.driverName)
    : null
  const routingStep = isRoutingDriver && topDriver
    ? routing.find(r => r.description === topDriver.driverName)
    : null

  // Build rate map
  const rateMap = useMemo(() => {
    const m = new Map<string, { labor: number; burden: number }>()
    rates.forEach(r => m.set(r.wc, { labor: r.laborRate, burden: r.burdenRate }))
    return m
  }, [rates])

  // Simulation local state — user inputs 3 scenarios
  const [simOptions, setSimOptions] = useState([
    { letter: 'A', label: '', targetValue: '', investment: '', lotSize: '5000' },
    { letter: 'B', label: '', targetValue: '', investment: '', lotSize: '5000' },
    { letter: 'C', label: '', targetValue: '', investment: '', lotSize: '5000' }
  ])

  const updateSim = (idx: number, field: string, val: string) => {
    setSimOptions(prev => prev.map((s, i) => i === idx ? { ...s, [field]: val } : s))
  }

  // Calculate simulation results dynamically
  const simResults = useMemo(() => {
    if (!topDriver) return []

    return simOptions.map(opt => {
      const targetVal = parseFloat(opt.targetValue)
      const investment = parseFloat(opt.investment) || 0
      const lotSize = parseFloat(opt.lotSize) || 1

      if (isNaN(targetVal) || targetVal <= 0) {
        return { ...opt, valid: false, grossSaving: 0, addedCost: 0, netSaving: 0, predictedTotal: 0, isProfitable: false }
      }

      let grossSaving = 0

      if (isRoutingDriver && routingStep) {
        // Routing driver: target is yield (as decimal e.g. 0.95) or capacity
        const r = rateMap.get(routingStep.wc) || { labor: 102.90, burden: 79.66 }
        const activeRuntime = routingStep.activeCap > 0 && routingStep.activeYield > 0
          ? routingStep.manning / (routingStep.activeCap * routingStep.activeYield) : 0
        const activeConvCost = activeRuntime * (r.labor + r.burden)

        // Determine if driver is yield or capacity based
        const isYieldDriver = topDriver.rcaParameter.toLowerCase().includes('yield')
        let newRuntime: number
        if (isYieldDriver) {
          const targetYield = targetVal > 1 ? targetVal / 100 : targetVal // accept both 95 and 0.95
          newRuntime = routingStep.activeCap > 0 && targetYield > 0
            ? routingStep.manning / (routingStep.activeCap * targetYield) : 0
        } else {
          const targetCap = targetVal
          newRuntime = targetCap > 0 && routingStep.activeYield > 0
            ? routingStep.manning / (targetCap * routingStep.activeYield) : 0
        }
        const newConvCost = newRuntime * (r.labor + r.burden)
        grossSaving = activeConvCost - newConvCost

      } else if (bomItem) {
        // BOM driver: target is price
        const activeMatCost = bomItem.consumption * bomItem.activePrice * (1 + bomItem.activeLoss)
        const isPriceDriver = topDriver.rcaParameter.toLowerCase().includes('price')
        if (isPriceDriver) {
          const newMatCost = bomItem.consumption * targetVal * (1 + bomItem.activeLoss)
          grossSaving = activeMatCost - newMatCost
        } else {
          // Loss driver
          const targetLoss = targetVal > 1 ? targetVal / 100 : targetVal
          const newMatCost = bomItem.consumption * bomItem.activePrice * (1 + targetLoss)
          grossSaving = activeMatCost - newMatCost
        }
      }

      const addedCost = investment / lotSize
      const netSaving = grossSaving - addedCost
      const predictedTotal = costBreakdown.totalActive - netSaving
      const isProfitable = netSaving > 0

      return { ...opt, valid: true, grossSaving, addedCost, netSaving, predictedTotal, isProfitable }
    })
  }, [simOptions, topDriver, isRoutingDriver, routingStep, bomItem, rateMap, costBreakdown])

  // Dynamic problem statement
  const problemStatement = topDriver
    ? `${topDriver.driverName}: ${topDriver.rcaParameter} (Cost Gap: ${topDriver.costGap >= 0 ? '+' : ''}${topDriver.costGap.toFixed(4)} THB/pc, Rank #${topDriver.rank})`
    : 'No positive cost drivers detected — all parameters are at or below baseline.'

  // Determine input label for target
  const targetLabel = (() => {
    if (!topDriver) return 'Target Value'
    if (isRoutingDriver) {
      const isYield = topDriver.rcaParameter.toLowerCase().includes('yield')
      return isYield ? 'Target Yield (%)' : 'Target Capacity (pcs/hr)'
    }
    const isPrice = topDriver.rcaParameter.toLowerCase().includes('price')
    return isPrice ? 'Target Price (THB)' : 'Target Loss (%)'
  })()

  // Determine placeholder hint
  const targetPlaceholder = (() => {
    if (!topDriver) return ''
    if (isRoutingDriver) {
      const isYield = topDriver.rcaParameter.toLowerCase().includes('yield')
      if (isYield && routingStep) return `e.g. ${(routingStep.baseYield * 100).toFixed(0)}`
      if (routingStep) return `e.g. ${routingStep.baseCap}`
    }
    if (bomItem) {
      const isPrice = topDriver.rcaParameter.toLowerCase().includes('price')
      if (isPrice) return `e.g. ${bomItem.basePrice.toFixed(2)}`
      return `e.g. ${(bomItem.baseLoss * 100).toFixed(0)}`
    }
    return ''
  })()

  const fmtTHB = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(4)}`

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white px-5 py-3.5 rounded-xl border border-slate-200 shadow-sm">
        <h1 className="text-sm font-bold text-slate-900">4. Root Cause Analysis &amp; What-If Simulator</h1>
      </div>

      {/* Dynamic Problem Statement */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
          Top Controllable Cost Driver
        </h3>
        {topDriver ? (
          <div className="space-y-2 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="font-bold text-slate-700">Problem: </span>
              <span className="text-slate-800">{problemStatement}</span>
            </div>
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
              <span className="font-bold text-amber-900">Current Parameters: </span>
              <span className="font-mono text-amber-800">
                {topDriver.baseParameter !== null && topDriver.activeParameter !== null
                  ? `Base: ${typeof topDriver.baseParameter === 'number' && topDriver.baseParameter < 1
                      ? `${(topDriver.baseParameter * 100).toFixed(1)}%`
                      : topDriver.baseParameter?.toLocaleString()
                    } → Active: ${typeof topDriver.activeParameter === 'number' && topDriver.activeParameter < 1
                      ? `${(topDriver.activeParameter * 100).toFixed(1)}%`
                      : topDriver.activeParameter?.toLocaleString()
                    }`
                  : 'No parameter change detected'
                }
              </span>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-xs text-emerald-800 font-medium">
            All parameters are at or below baseline — no cost drivers to investigate.
          </div>
        )}
      </div>

      {/* What-If Simulator — 3 Options */}
      {topDriver && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {simResults.map((sim, idx) => (
            <div
              key={sim.letter}
              className={`rounded-xl border overflow-hidden transition-all ${
                sim.valid && sim.isProfitable
                  ? 'border-emerald-300 ring-1 ring-emerald-400/30'
                  : sim.valid && !sim.isProfitable
                    ? 'border-rose-200 bg-rose-50/20'
                    : 'border-slate-200'
              }`}
            >
              {/* Option Header */}
              <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-white">
                <span className="px-2.5 py-1 text-xs font-bold bg-slate-900 text-white rounded-lg font-mono">
                  Option {sim.letter}
                </span>
                {sim.valid && (
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    sim.isProfitable ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {sim.isProfitable ? 'Profitable' : 'Unprofitable'}
                  </span>
                )}
              </div>

              {/* Input Fields */}
              <div className="p-4 space-y-2.5 bg-white">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Action Description</label>
                  <input
                    type="text"
                    value={sim.label}
                    onChange={e => updateSim(idx, 'label', e.target.value)}
                    placeholder="e.g. Install calibration jig"
                    className="w-full px-2.5 py-1.5 text-xs bg-amber-50 border border-amber-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">{targetLabel}</label>
                  <input
                    type="number"
                    step="any"
                    value={sim.targetValue}
                    onChange={e => updateSim(idx, 'targetValue', e.target.value)}
                    placeholder={targetPlaceholder}
                    className="w-full px-2.5 py-1.5 text-xs bg-amber-50 border border-amber-200 rounded-lg font-mono font-bold focus:outline-none focus:ring-1 focus:ring-amber-400"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Investment (THB)</label>
                    <input
                      type="number"
                      step="any"
                      value={sim.investment}
                      onChange={e => updateSim(idx, 'investment', e.target.value)}
                      placeholder="0"
                      className="w-full px-2.5 py-1.5 text-xs bg-amber-50 border border-amber-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Lot Size (pcs)</label>
                    <input
                      type="number"
                      step="any"
                      value={sim.lotSize}
                      onChange={e => updateSim(idx, 'lotSize', e.target.value)}
                      placeholder="5000"
                      className="w-full px-2.5 py-1.5 text-xs bg-amber-50 border border-amber-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                  </div>
                </div>
              </div>

              {/* Calculated Results */}
              {sim.valid && (
                <div className="p-4 bg-slate-50 border-t border-slate-100 space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">Gross Saving/pc:</span>
                    <span className={sim.grossSaving > 0 ? 'text-emerald-700 font-bold' : 'text-rose-600'}>
                      {fmtTHB(sim.grossSaving)} THB
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">Added Cost/pc:</span>
                    <span className="text-rose-600">-{sim.addedCost.toFixed(4)} THB</span>
                  </div>
                  <div className="flex justify-between font-bold border-t border-slate-200 pt-1.5 text-slate-900">
                    <span className="font-sans">Net Saving/pc:</span>
                    <span className={sim.netSaving > 0 ? 'text-emerald-700' : 'text-rose-600'}>
                      {fmtTHB(sim.netSaving)} THB
                    </span>
                  </div>
                  <div className="flex justify-between font-bold border-t border-slate-200 pt-1.5">
                    <span className="text-slate-600 font-sans">Predicted Std Cost:</span>
                    <span className="text-slate-900 text-sm">{sim.predictedTotal.toFixed(4)} THB</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Current Total Reference */}
      <div className="flex items-center justify-between text-xs bg-slate-50 p-3 rounded-lg border border-slate-200/60 font-mono">
        <span className="font-sans text-slate-600 font-medium">
          Current Active Total Standard Cost:
        </span>
        <span className="font-bold text-slate-900 text-sm">
          {costBreakdown.totalActive.toFixed(4)} THB/pc
        </span>
      </div>
    </div>
  )
}
