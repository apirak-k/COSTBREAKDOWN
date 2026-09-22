import React from 'react'
import { CostDriver, DriverRcaRecord, formatVariance } from '../../../core'

interface DriverSelectorProps {
  topDrivers: CostDriver[]
  selectedDriverKey: string | null
  rcaRecords: Record<string, DriverRcaRecord>
  onSelectDriver: (driverKey: string) => void
}

export const DriverSelector: React.FC<DriverSelectorProps> = ({
  topDrivers,
  selectedDriverKey,
  rcaRecords,
  onSelectDriver
}) => {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 shrink-0">
        Select Driver:
      </span>
      {topDrivers.map(d => {
        const isSelected = d.driverKey === selectedDriverKey
        const isUncontrollable = d.controllability === 'Uncontrollable'

        return (
          <button
            key={d.driverKey}
            onClick={() => onSelectDriver(d.driverKey)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border cursor-pointer ${
              isSelected
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                : isUncontrollable
                ? 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span className={`w-4 h-4 rounded text-[10px] font-bold flex items-center justify-center font-mono ${
              isSelected ? 'bg-white text-slate-900' : 'bg-slate-100 text-slate-700'
            }`}>
              #{d.rank}
            </span>
            <span className="truncate max-w-[140px]">{d.driverName}</span>
            <span className={`font-mono text-[11px] ${
              isSelected ? 'text-slate-300' : 'text-rose-600 font-bold'
            }`}>
              {formatVariance(d.costGap, 2)}
            </span>
            {rcaRecords[d.driverKey] && <span className="text-[9px] font-mono text-emerald-700">RCA</span>}
          </button>
        )
      })}
    </div>
  )
}
