import React from 'react'
import { CostDriver, formatCurrency } from '../../../core'
import { DriverRow } from './DriverRow'

interface DriversTableProps {
  topDrivers: CostDriver[]
  onUpdateInput: (rank: number, controllability: CostDriver['controllability'], actionPlan: string) => void
}

export const DriversTable: React.FC<DriversTableProps> = ({ topDrivers, onUpdateInput }) => {
  const totalGap = topDrivers.reduce((a, d) => a + d.costGap, 0)

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Column Headers */}
      <div className="grid grid-cols-12 gap-x-3 px-4 py-2.5 border-b border-slate-100 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
        <div className="col-span-1">Rank</div>
        <div className="col-span-2">Category</div>
        <div className="col-span-2">Driver Name</div>
        <div className="col-span-2">RCA Parameter</div>
        <div className="col-span-1 text-right">Base</div>
        <div className="col-span-1 text-right">Active</div>
        <div className="col-span-1 text-right">Gap (THB)</div>
        <div className="col-span-1 text-right">% Contrib</div>
        <div className="col-span-1 text-center">Uncontrollable</div>
      </div>

      {/* Driver Rows */}
      <div className="divide-y divide-slate-100">
        {topDrivers.map((d: CostDriver) => (
          <DriverRow key={d.rank} driver={d} onUpdateInput={onUpdateInput} />
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50">
        <span className="text-xs text-slate-500">
          Top {topDrivers.length} positive gap drivers evaluated by _CALC_ENGINE
        </span>
        <div className="text-right font-mono flex items-center gap-2">
          <span className="text-[11px] text-slate-400 font-sans">Total Ranked Gap:</span>
          <span className="text-sm font-bold text-rose-600">
            +{formatCurrency(totalGap, 4, 'THB/pc')}
          </span>
        </div>
      </div>
    </div>
  )
}
