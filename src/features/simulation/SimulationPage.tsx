import React from 'react'
import type { MasterDataRole } from '../../core/types'
import { PageHeading } from '../../shared'
import type { SimulationWorkspaceState } from './simulation-state'

interface SimulationPageProps {
  state: SimulationWorkspaceState
  onStartFrom: (role: MasterDataRole) => void
  onReset: () => void
}

const SOURCES: Array<{ role: MasterDataRole; label: string }> = [
  { role: 'reference', label: 'Reference' },
  { role: 'current', label: 'Current' },
  { role: 'custom', label: 'Custom' }
]

export const SimulationPage: React.FC<SimulationPageProps> = ({ state, onStartFrom, onReset }) => {
  const sourceLabel = SOURCES.find(source => source.role === state.sourceRole)?.label

  return (
    <div className="space-y-4">
      <PageHeading
        title="Simulation"
        description="Start a temporary SIM from a Master Data Working dataset."
        actions={state.snapshot ? (
          <button type="button" onClick={onReset} className="min-h-9 border border-slate-400 bg-white px-3 text-xs font-medium text-slate-800 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">
            Reset SIM
          </button>
        ) : undefined}
      />

      {!state.snapshot ? (
        <section className="border border-slate-300 bg-white p-3" aria-labelledby="simulation-start-title">
          <h2 id="simulation-start-title" className="font-sans text-sm font-semibold text-slate-950">Start SIM From</h2>
          <p className="mt-1 text-xs text-slate-600">SIM uses an isolated copy. Changes here do not update any Master Data workspace.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {SOURCES.map(source => (
              <button
                key={source.role}
                type="button"
                onClick={() => onStartFrom(source.role)}
                className="min-h-9 border border-slate-900 bg-slate-900 px-3 text-xs font-medium text-white hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
              >
                Start SIM From {source.label}
              </button>
            ))}
          </div>
        </section>
      ) : (
        <>
          <section className="flex flex-wrap items-baseline gap-x-4 gap-y-2 border border-slate-300 border-l-4 border-l-slate-900 bg-white px-3 py-3" aria-label="Simulation basis">
            <dl>
              <dt className="font-sans text-[11px] font-semibold text-slate-600">SIM source</dt>
              <dd className="mt-0.5 text-sm font-semibold text-slate-950">{sourceLabel}</dd>
            </dl>
            <dl>
              <dt className="font-sans text-[11px] font-semibold text-slate-600">Comparison basis</dt>
              <dd className="mt-0.5 text-sm font-semibold text-slate-950">Current Working</dd>
            </dl>
            <p className="min-w-56 flex-1 text-xs leading-5 text-slate-600">
              Temporary SIM snapshot · {state.snapshot.bom.length} BOM · {state.snapshot.routing.length} Routing · {state.snapshot.rates.length} Work Centers. Master Data remains unchanged.
            </p>
          </section>
          <section className="border border-slate-300 bg-white p-3" aria-labelledby="simulation-workspace-title">
            <h2 id="simulation-workspace-title" className="font-sans text-sm font-semibold text-slate-950">Parameter Simulation</h2>
            <p className="mt-1 text-xs text-slate-600">Simulation inputs and full cost results will appear here.</p>
          </section>
        </>
      )}
    </div>
  )
}
