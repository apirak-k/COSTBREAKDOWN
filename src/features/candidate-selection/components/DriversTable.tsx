import React from 'react'
import { CostDriver, formatCurrency } from '../../../core'
import { DriverRow } from './DriverRow'

interface DriversTableProps {
  topDrivers: CostDriver[]
  onUpdateInput: (
    rank: number,
    controllability: CostDriver['controllability'],
    actionPlan: string,
    canInfluence?: boolean,
    requirementFit?: boolean
  ) => void
}

export const DriversTable: React.FC<DriversTableProps> = ({ topDrivers, onUpdateInput }) => {
  const totalGap = topDrivers.reduce((a, d) => a + d.costGap, 0)

  return (
    <div className="bg-white rounded-none border border-slate-300/80 shadow-2xs overflow-hidden">
      {/* Column Headers */}
      <div className="grid grid-cols-12 gap-x-2 px-3 py-2 border-b border-slate-300 bg-slate-100 text-[10px] font-mono font-bold text-slate-700 uppercase tracking-wider">
        <div className="col-span-1 text-center">Rank</div>
        <div className="col-span-2">Category</div>
        <div className="col-span-2">Driver Name</div>
        <div className="col-span-2">RCA Parameter</div>
        <div className="col-span-1 text-right">Base</div>
        <div className="col-span-1 text-right">Active</div>
        <div className="col-span-1 text-right">Gap (THB)</div>
        <div className="col-span-1 text-right">% Contrib</div>
        <div className="col-span-1 text-center">Confidence</div>
      </div>

      {/* Driver Rows */}
      <div className="divide-y divide-slate-200">
        {topDrivers.map((d: CostDriver) => (
          <DriverRow key={d.rank} driver={d} onUpdateInput={onUpdateInput} />
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-3.5 py-2 border-t border-slate-300 bg-slate-50 text-xs font-mono">
        <span className="text-slate-500 text-[11px]">
          Stage 1: System Auto-Ranked Top {topDrivers.length} Measurable Cost Drivers
        </span>
        <div className="text-right flex items-center gap-2">
          <span className="text-[11px] text-slate-500 font-sans">Total Ranked Gap:</span>
          <span className="text-xs font-bold text-rose-600">
            +{formatCurrency(totalGap, 4, 'THB/pc')}
          </span>
        </div>
      </div>
    </div>
  )
}
