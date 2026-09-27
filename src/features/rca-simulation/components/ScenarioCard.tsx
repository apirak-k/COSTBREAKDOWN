import React from 'react'
import type { ScenarioCostResult, ScenarioEconomicsInputs, ScenarioEconomicsResult } from '../../../core'
import type { ScenarioDraftForm } from '../scenario-draft'
import type { ScenarioInputDefinition } from '../scenario-inputs'
import { ScenarioInputField } from './ScenarioInputField'

interface ScenarioCardProps {
  scenario: ScenarioDraftForm
  inputDefinitions: ScenarioInputDefinition[]
  result: ScenarioCostResult
  economics: ScenarioEconomicsResult
  inputWarnings: string[]
  economicsInputWarnings: string[]
  onUpdateLabel: (label: string) => void
  onUpdateInput: (inputKey: string, value: string) => void
  onUpdateEconomics: (key: keyof ScenarioEconomicsInputs, value: string) => void
}

const COST_ROWS = [
  { key: 'material', label: 'Material' },
  { key: 'labor', label: 'Labor' },
  { key: 'burden', label: 'Burden' },
  { key: 'total', label: 'Total' }
] as const

const ECONOMIC_INPUTS = [
  { key: 'fixedInvestment', label: 'Fixed Investment', unit: 'THB' },
  { key: 'variableAddedCostPerPiece', label: 'Variable Added Cost', unit: 'THB/pc' },
  { key: 'evaluationVolume', label: 'Evaluation Volume', unit: 'pcs' }
] as const

const ECONOMIC_ROWS = [
  { key: 'grossSavingPerPiece', label: 'Gross Saving / pc', unit: 'THB/pc' },
  { key: 'fixedCostEquivalentPerPiece', label: 'Fixed Cost Equivalent / pc', unit: 'THB/pc' },
  { key: 'netBenefitPerPiece', label: 'Net Benefit / pc', unit: 'THB/pc' },
  { key: 'totalGrossSaving', label: 'Total Gross Saving', unit: 'THB' },
  { key: 'totalVariableAddedCost', label: 'Total Variable Added Cost', unit: 'THB' },
  { key: 'totalNetBenefit', label: 'Total Net Benefit', unit: 'THB' }
] as const

const STATUS_CLASS: Record<string, string> = {
  complete: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  estimated: 'border-amber-200 bg-amber-50 text-amber-800',
  missing: 'border-rose-200 bg-rose-50 text-rose-800'
}

function formatCost(value: number | null): string {
  return value === null ? 'N/A' : value.toLocaleString(undefined, { maximumFractionDigits: 4 })
}

export const ScenarioCard: React.FC<ScenarioCardProps> = ({
  scenario,
  inputDefinitions,
  result,
  economics,
  inputWarnings,
  economicsInputWarnings,
  onUpdateLabel,
  onUpdateInput,
  onUpdateEconomics
}) => {
  const warningSections = [
    { label: 'Current cost', messages: result.currentCost.warnings },
    { label: 'Scenario cost', messages: result.scenarioCost.warnings },
    { label: 'Unsupported or ambiguous overrides', messages: result.overrideWarnings },
    { label: 'Invalid input', messages: inputWarnings }
  ]
  const warningSources = new Map<string, string[]>()
  warningSections.forEach(section => {
    section.messages.forEach(message => {
      const sources = warningSources.get(message) ?? []
      if (!sources.includes(section.label)) sources.push(section.label)
      warningSources.set(message, sources)
    })
  })
  const uniqueWarnings = Array.from(warningSources, ([message, sources]) => ({ message, sources }))
  const warningCount = uniqueWarnings.length
  const economicsWarnings = [...new Set([...economicsInputWarnings, ...economics.warnings])]
  const labelId = `scenario-label-${scenario.letter}`

  return (
    <article className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xs">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-900">Scenario {scenario.letter}</h3>
        <span className="rounded border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
          Draft
        </span>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4">
        <div>
          <label htmlFor={labelId} className="mb-1 block text-xs font-medium text-slate-700">
            Scenario label
          </label>
          <input
            id={labelId}
            type="text"
            value={scenario.label}
            onChange={event => onUpdateLabel(event.target.value)}
            placeholder={`Scenario ${scenario.letter}`}
            className="w-full rounded border border-slate-300 px-2.5 py-2 text-sm text-slate-900 focus:border-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-300"
          />
        </div>

        <section aria-labelledby={`${labelId}-inputs-heading`} className="space-y-3">
          <h4 id={`${labelId}-inputs-heading`} className="text-xs font-semibold uppercase tracking-wide text-slate-600">
            Scenario inputs
          </h4>
          {inputDefinitions.length > 0 ? (
            inputDefinitions.map(definition => (
              <ScenarioInputField
                key={definition.key}
                definition={definition}
                scenarioLetter={scenario.letter}
                value={scenario.inputValues[definition.key]}
                onChange={onUpdateInput}
              />
            ))
          ) : (
            <p className="text-xs text-slate-500">No supported scenario inputs are available.</p>
          )}
        </section>

        <section aria-labelledby={`${labelId}-costs-heading`} className="border-t border-slate-200 pt-3">
          <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
            <div>
              <h4 id={`${labelId}-costs-heading`} className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Standard cost per piece
              </h4>
              <p className="mt-1 text-[11px] text-slate-500">THB/pc</p>
            </div>
            <div className="flex flex-wrap gap-1.5 text-[10px]">
              <span className={`rounded border px-1.5 py-1 ${STATUS_CLASS[result.currentCost.status] ?? STATUS_CLASS.missing}`}>
                Current: {result.currentCost.status}
              </span>
              <span className={`rounded border px-1.5 py-1 ${STATUS_CLASS[result.scenarioCost.status] ?? STATUS_CLASS.missing}`}>
                Scenario: {result.scenarioCost.status}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <caption className="sr-only">
                Current and Scenario {scenario.letter} material, labor, burden, and total cost per piece in Thai baht
              </caption>
              <thead>
                <tr className="border-b border-slate-200 text-left text-[10px] uppercase tracking-wide text-slate-500">
                  <th scope="col" className="py-2 pr-2 font-medium">Cost element</th>
                  <th scope="col" className="px-2 py-2 text-right font-medium">Current</th>
                  <th scope="col" className="py-2 pl-2 text-right font-medium">Scenario</th>
                </tr>
              </thead>
              <tbody>
                {COST_ROWS.map(({ key, label }) => (
                  <tr key={key} className={key === 'total' ? 'border-t border-slate-200 font-semibold text-slate-900' : 'text-slate-700'}>
                    <th scope="row" className="py-2 pr-2 text-left font-medium">{label}</th>
                    <td className="px-2 py-2 text-right font-mono tabular-nums">
                      {formatCost(result.currentCost[key])}
                    </td>
                    <td className="py-2 pl-2 text-right font-mono tabular-nums">
                      {formatCost(result.scenarioCost[key])}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section aria-label={`Improvement economics for Scenario ${scenario.letter}`} className="border-t border-slate-200 pt-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-700">Improvement economics</h4>
          <p className="mt-1 text-[11px] text-slate-500">
            These assumptions do not change Current or Scenario Standard Cost.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {ECONOMIC_INPUTS.map(({ key, label, unit }) => {
              const inputId = `scenario-${scenario.letter}-economics-${key}`
              return (
                <label key={key} htmlFor={inputId} className="block min-w-0 text-xs font-medium text-slate-700">
                  {label} <span className="font-normal text-slate-500">({unit})</span>
                  <input
                    id={inputId}
                    type="number"
                    step="any"
                    inputMode="decimal"
                    value={scenario.economicsInputs[key]}
                    onChange={event => onUpdateEconomics(key, event.target.value)}
                    className="mt-1 w-full rounded border border-slate-300 px-2.5 py-2 font-mono text-sm tabular-nums text-slate-900 focus:border-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-300"
                  />
                </label>
              )
            })}
          </div>
          <div className="mt-3 overflow-x-auto rounded border border-slate-200">
            <table className="w-full text-xs">
              <caption className="sr-only">Scenario {scenario.letter} improvement economics</caption>
              <tbody>
                {ECONOMIC_ROWS.map(({ key, label, unit }) => (
                  <tr key={key} className="border-b border-slate-100 last:border-0">
                    <th scope="row" className="px-2.5 py-2 text-left font-medium text-slate-700">{label}</th>
                    <td className="px-2.5 py-2 text-right font-mono tabular-nums text-slate-900">
                      {economics[key] === null ? 'N/A' : `${formatCost(economics[key])} ${unit}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {economicsWarnings.length > 0 && (
            <ul role="status" className="mt-2 list-disc space-y-1 pl-5 text-xs text-amber-800">
              {economicsWarnings.map(warning => <li key={warning}>{warning}</li>)}
            </ul>
          )}
        </section>

        <section aria-label={`Warnings for Scenario ${scenario.letter}`} className="mt-auto border-t border-slate-200 pt-3">
          {warningCount === 0 ? (
            <p role="status" className="text-xs text-slate-500">No calculation or override warnings.</p>
          ) : (
            <details>
              <summary className="cursor-pointer text-xs font-semibold text-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-300">
                Warnings ({warningCount})
              </summary>
              <div className="mt-2 space-y-3 rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
                <ul className="list-disc space-y-1 pl-5">
                  {uniqueWarnings.map(({ message, sources }) => (
                    <li key={message}>
                      <span className="font-semibold">{sources.join(' · ')}: </span>{message}
                    </li>
                  ))}
                </ul>
              </div>
            </details>
          )}
        </section>
      </div>
    </article>
  )
}
