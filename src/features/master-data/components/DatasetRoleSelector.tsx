import React from 'react'
import { Database, FileInput } from 'lucide-react'
import { ComparisonRole, CostSnapshot, ProductMaster } from '../../../core'

interface DatasetRoleSelectorProps {
  product: ProductMaster
  snapshot: CostSnapshot
  role: ComparisonRole
  onRoleChange: (role: ComparisonRole) => void
}

const roleDetails: Record<ComparisonRole, { label: string; description: string }> = {
  current: {
    label: 'Current',
    description: 'The dataset representing the current state.'
  },
  reference: {
    label: 'Reference',
    description: 'The dataset used as the comparison reference.'
  }
}

export const DatasetRoleSelector: React.FC<DatasetRoleSelectorProps> = ({
  product,
  snapshot,
  role,
  onRoleChange
}) => {
  const selectedRole = roleDetails[role]

  return (
    <section
      aria-labelledby="master-data-dataset-step"
      className="bg-slate-900 p-4 rounded-none border border-slate-800 shadow-2xs text-white"
    >
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 shrink-0 border border-slate-600 bg-slate-800 flex items-center justify-center">
            <Database className="w-4 h-4 text-slate-200" aria-hidden="true" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Step 1</span>
              <h2 id="master-data-dataset-step" className="text-sm font-bold font-mono uppercase tracking-tight">
                Choose dataset to input
              </h2>
            </div>
            <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-slate-300 font-sans">
              Select the dataset before importing or editing. Every action below applies only to the selected dataset.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-5 gap-y-1 text-[10px] font-mono lg:min-w-[250px]">
          <span className="text-slate-400">Header Product</span>
          <strong className="text-right text-white">{product.productCode || '—'}</strong>
          <span className="text-slate-400">Active Side</span>
          <strong className="text-right uppercase text-white">{role}</strong>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2" role="group" aria-label="Dataset to edit">
        {(['current', 'reference'] as const).map(datasetRole => {
          const details = roleDetails[datasetRole]
          const isSelected = role === datasetRole

          return (
            <button
              key={datasetRole}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onRoleChange(datasetRole)}
              className={`text-left p-3 border cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 ${
                isSelected
                  ? 'border-white bg-white text-slate-900'
                  : 'border-slate-600 bg-slate-800 text-slate-200 hover:border-slate-300 hover:bg-slate-700'
              }`}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-slate-900' : 'bg-slate-500'}`} aria-hidden="true" />
                  <span className="text-xs font-mono font-bold uppercase tracking-wide">{details.label}</span>
                </span>
                {datasetRole === 'current' && (
                  <span className={`text-[9px] font-mono uppercase ${isSelected ? 'text-slate-500' : 'text-slate-400'}`}>
                    Default
                  </span>
                )}
              </span>
              <span className={`mt-1 block text-[10px] font-sans ${isSelected ? 'text-slate-600' : 'text-slate-400'}`}>
                {details.description}
              </span>
            </button>
          )
        })}
      </div>

      <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-t border-slate-700 pt-3 text-[10px] font-sans">
        <span className="flex items-center gap-1.5 text-slate-300">
          <FileInput className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
          Next: import from Excel or switch to Edit Mode below.
        </span>
        <span className="font-mono text-slate-300">
          Dataset: <strong className="text-white">{selectedRole.label}</strong>
          <span className="text-slate-500"> · Source: {snapshot.sourceRef || 'No source recorded'}</span>
        </span>
      </div>
    </section>
  )
}
