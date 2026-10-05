import React from 'react'
import type { ScenarioCostResult, ScenarioEconomicsInputs, ScenarioEconomicsResult } from '../../../core'
import type { ScenarioDraftForm } from '../scenario-draft'
import type { ScenarioInputDefinition } from '../scenario-inputs'
import { ScenarioCard } from './ScenarioCard'

interface SimulationGridProps {
  scenarios: ScenarioDraftForm[]
  inputDefinitions: ScenarioInputDefinition[]
  results: ScenarioCostResult[]
  economicsResults: Array<ScenarioEconomicsResult & { letter: 'A' | 'B' | 'C' }>
  inputWarningsByLetter: Record<'A' | 'B' | 'C', string[]>
  economicsInputWarningsByLetter: Record<'A' | 'B' | 'C', string[]>
  onUpdateLabel: (letter: 'A' | 'B' | 'C', label: string) => void
  onUpdateInput: (letter: 'A' | 'B' | 'C', inputKey: string, value: string) => void
  onUpdateEconomics: (letter: 'A' | 'B' | 'C', key: keyof ScenarioEconomicsInputs, value: string) => void
}

function unavailableResult(scenario: ScenarioDraftForm): ScenarioCostResult {
  const missingCost = {
    snapshotId: 'unavailable',
    material: null,
    labor: null,
    burden: null,
    total: null,
    status: 'missing' as const,
    warnings: ['No calculation result was returned for this scenario.']
  }

  return {
    letter: scenario.letter,
    label: scenario.label,
    currentCost: missingCost,
    scenarioCost: missingCost,
    overrideWarnings: []
  }
}

const CURRENT_COST_ROWS = [
  { key: 'material', label: 'Material' },
  { key: 'labor', label: 'Labor' },
  { key: 'burden', label: 'Burden' },
  { key: 'total', label: 'Standard cost / pc' }
] as const

function formatValue(value: number | null, displayScale: number): string {
  if (value === null) return 'N/A'
  return (value * displayScale).toLocaleString(undefined, { maximumFractionDigits: 4 })
}

export const SimulationGrid: React.FC<SimulationGridProps> = ({
  scenarios,
  inputDefinitions,
  results,
  economicsResults,
  inputWarningsByLetter,
  economicsInputWarningsByLetter,
  onUpdateLabel,
  onUpdateInput,
  onUpdateEconomics
}) => {
  const baselineResult = results[0] ?? (scenarios[0] ? unavailableResult(scenarios[0]) : null)
  const currentCost = baselineResult?.currentCost ?? null
  const currentWarnings = Array.from(new Set([
    ...results.flatMap(result => result.currentCost.warnings),
    ...(results.length === 0 ? currentCost?.warnings ?? [] : [])
  ]))

  return (
    <section aria-labelledby="simulation-heading" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-300 pb-2.5">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-wide text-slate-600">03 / Simulation</p>
          <h2 id="simulation-heading" className="mt-1 font-mono text-xs font-bold uppercase text-slate-900">Compare three scenarios</h2>
        </div>
        <div className="max-w-xl text-[11px] leading-4 text-slate-600">
          <p>Each draft starts from the same Current snapshot. Improvement-economics assumptions do not change Standard Cost.</p>
          <p className="mt-1 text-xs">Cost change is Scenario − Current; a negative value means lower cost.</p>
        </div>
      </div>

      <section aria-labelledby="current-baseline-heading" className="border border-slate-300 bg-white px-3 py-3 sm:px-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h3 id="current-baseline-heading" className="font-mono text-[11px] font-bold uppercase text-slate-900">Current baseline</h3>
            <p className="mt-0.5 text-[10px] text-slate-600">Standard Cost per piece · THB/pc</p>
          </div>
          {currentCost && (
            <span className={`font-mono text-[10px] font-semibold uppercase ${currentCost.status === 'complete'
              ? 'text-emerald-800'
              : currentCost.status === 'estimated' ? 'text-amber-800' : 'text-rose-800'}`}>
              Current calculation: {currentCost.status}
            </span>
          )}
        </div>

        {currentCost && (
          <dl className="mt-2 grid grid-cols-2 gap-x-4 sm:grid-cols-4">
            {CURRENT_COST_ROWS.map(({ key, label }) => (
              <div key={key} className={key === 'total'
                ? 'border-t-2 border-slate-900 py-2 sm:border-t-0 sm:border-l-2 sm:pl-3'
                : 'border-t border-slate-300 py-2'}>
                <dt className="font-mono text-[10px] font-semibold uppercase text-slate-600">{label}</dt>
                <dd className="mt-0.5 font-mono text-xs font-semibold tabular-nums text-slate-900">
                  {currentCost[key] === null ? 'N/A' : currentCost[key]?.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                </dd>
              </div>
            ))}
          </dl>
        )}

        {inputDefinitions.length > 0 ? (
          <div className="mt-2 border-t border-slate-300 pt-2">
            <h4 className="font-mono text-[10px] font-bold uppercase text-slate-800">Measurable inputs in Current</h4>
            <dl className="mt-1 grid grid-cols-1 gap-x-5 sm:grid-cols-2 xl:grid-cols-3">
              {inputDefinitions.map(definition => (
                <div key={definition.key} className="min-w-0 border-b border-slate-200 py-1.5">
                  <dt className="break-words text-[10px] leading-4 text-slate-600">{definition.label}</dt>
                  <dd className="mt-0.5 font-mono text-xs tabular-nums text-slate-900">
                    {formatValue(definition.currentValue, definition.displayScale)}
                    {definition.unit ? ` ${definition.unit}` : ''}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ) : (
          <p className="mt-2 border-t border-slate-300 pt-2 text-xs leading-5 text-amber-900">
            No supported measurable inputs are available for this candidate. Scenarios still show the Current-based cost; structural changes are outside this simulation.
          </p>
        )}

        {currentWarnings.length > 0 && (
          <details className="mt-2 border-t border-slate-300 pt-1.5">
            <summary className="min-h-8 cursor-pointer py-1 font-mono text-[10px] font-semibold uppercase text-amber-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500">
              Current calculation warnings ({currentWarnings.length})
            </summary>
            <ul className="mt-2 list-disc space-y-1 border-l-2 border-amber-600 bg-amber-50 p-3 pl-8 text-xs text-amber-950">
              {currentWarnings.map(warning => <li key={warning}>{warning}</li>)}
            </ul>
          </details>
        )}
      </section>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {scenarios.map(scenario => {
          const result = results.find(item => item.letter === scenario.letter) ?? unavailableResult(scenario)
          const economics = economicsResults.find(item => item.letter === scenario.letter) ?? {
            grossSavingPerPiece: null,
            fixedCostEquivalentPerPiece: null,
            netBenefitPerPiece: null,
            totalGrossSaving: null,
            totalVariableAddedCost: null,
            totalNetBenefit: null,
            warnings: []
          }

          return (
            <ScenarioCard
              key={scenario.letter}
              scenario={scenario}
              inputDefinitions={inputDefinitions}
              result={result}
              economics={economics}
              inputWarnings={inputWarningsByLetter[scenario.letter] ?? []}
              economicsInputWarnings={economicsInputWarningsByLetter[scenario.letter] ?? []}
              onUpdateLabel={label => onUpdateLabel(scenario.letter, label)}
              onUpdateInput={(inputKey, value) => onUpdateInput(scenario.letter, inputKey, value)}
              onUpdateEconomics={(key, value) => onUpdateEconomics(scenario.letter, key, value)}
            />
          )
        })}
      </div>
    </section>
  )
}
