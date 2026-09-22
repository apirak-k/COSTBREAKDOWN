import React from 'react'
import { CostDriver, formatCurrency } from '../../../core'
import { DriverRow } from './DriverRow'

interface DriversTableProps {
  topDrivers: CostDriver[]
  onUpdateInput: (
    driverKey: string,
    controllability: CostDriver['controllability'],
    actionPlan: string,
    canInfluence?: boolean,
    requirementFit?: boolean
  ) => void
}

export const DriversTable: React.FC<DriversTableProps> = ({ topDrivers, onUpdateInput }) => {
  const totalGap = topDrivers.reduce((a, d) => a + d.costGap, 0)

  return (
    <div className="bg-white rounded-lg border border-slate-200/90 shadow-xs overflow-hidden">
      {/* Column Headers */}
      <div className="grid grid-cols-12 gap-x-2 px-4 py-2.5 border-b border-slate-200/80 bg-slate-50/90 text-[10px] font-mono font-bold text-slate-600 uppercase tracking-wider">
        <div className="col-span-1 text-center">Rank</div>
        <div className="col-span-2">Category</div>
        <div className="col-span-3">Driver Name</div>
        <div className="col-span-2">RCA Parameter</div>
        <div className="col-span-1 text-right">Base</div>
        <div className="col-span-1 text-right">Active</div>
        <div className="col-span-1 text-right">Gap (THB)</div>
        <div className="col-span-1 text-right">% Contrib</div>
      </div>

      {/* Driver Rows */}
      <div className="divide-y divide-slate-100">
        {topDrivers.map((d: CostDriver) => (
          <DriverRow key={d.driverKey} driver={d} onUpdateInput={onUpdateInput} />
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-200 bg-slate-50 text-xs font-mono">
        <span className="text-slate-500 text-[11px]">
          Top Drivers ({topDrivers.length})
        </span>

        <div className="text-right flex items-center gap-2">
          <span className="text-[11px] text-slate-500 font-sans">Total Gap:</span>
          <span className="text-xs font-bold text-rose-700 tabular-nums">
            +{formatCurrency(totalGap, 4, 'THB/pc')}
          </span>
        </div>
      </div>
    </div>

  )
}
