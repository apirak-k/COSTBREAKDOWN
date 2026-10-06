import React from 'react'
import type { ScenarioBusinessInputs, ScenarioBusinessResult, ScenarioCostResult, ScenarioEconomicsInputs, ScenarioEconomicsResult } from '../../../core'
import type { ScenarioDraftForm } from '../scenario-draft'
import type { ScenarioInputDefinition } from '../scenario-inputs'
import { ScenarioInputField } from './ScenarioInputField'

interface ScenarioCardProps {
  scenario: ScenarioDraftForm
  inputDefinitions: ScenarioInputDefinition[]
  result: ScenarioCostResult
  economics: ScenarioEconomicsResult
  business: ScenarioBusinessResult
  currentBusinessInputs: ScenarioBusinessInputs
  inputWarnings: string[]
  economicsInputWarnings: string[]
  businessInputWarnings: string[]
  onUpdateLabel: (label: string) => void
  onUpdateInput: (inputKey: string, value: string) => void
  onUpdateEconomics: (key: keyof ScenarioEconomicsInputs, value: string) => void
  onUpdateBusinessInput: (key: keyof ScenarioBusinessInputs, value: string) => void
}

const COST_ROWS = [
  { key: 'material', label: 'Material' },
  { key: 'labor', label: 'Labor' },
  { key: 'burden', label: 'Burden' },
  { key: 'total', label: 'Standard cost / pc' }
] as const

const ECONOMIC_INPUTS = [
  { key: 'fixedInvestment', label: 'Fixed Investment', unit: 'THB' },
  { key: 'variableAddedCostPerPiece', label: 'Variable Added Cost', unit: 'THB/pc' },
  { key: 'evaluationVolume', label: 'Evaluation Quantity', unit: 'pc' }
] as const

const ECONOMIC_CATEGORY_INPUTS = [
  { key: 'fixedInvestmentCategory', label: 'Fixed Investment category' },
  { key: 'variableAddedCostCategory', label: 'Variable Added Cost category' }
] as const

const BUSINESS_INPUTS = [
  { key: 'sellingPrice', label: 'Selling Price', unit: 'THB/pc' },
  { key: 'sgaPercent', label: 'SG&A %', unit: '%' }
] as const

const ECONOMIC_ROWS = [
  { key: 'fixedCostEquivalentPerPiece', label: 'Fixed Cost Equivalent / pc', unit: 'THB/pc' },
  { key: 'variableAddedCostPerPiece', label: 'Variable Added Cost / pc', unit: 'THB/pc' },
  { key: 'totalImprovement', label: 'Total Improvement', unit: 'THB' }
] as const

const STATUS_CLASS: Record<string, string> = {
  complete: 'text-emerald-800',
  estimated: 'text-amber-800',
  missing: 'text-rose-800'
}

function formatCost(value: number | null): string {
  return value === null ? 'N/A' : value.toLocaleString(undefined, { maximumFractionDigits: 4 })
}

function formatDifference(current: number | null, scenario: number | null): string {
  if (current === null || scenario === null) return 'N/A'
  const difference = scenario - current
  return difference > 0 ? `+${formatCost(difference)}` : formatCost(difference)
}

export const ScenarioCard: React.FC<ScenarioCardProps> = ({
  scenario,
  inputDefinitions,
  result,
  economics,
  business,
  currentBusinessInputs,
  inputWarnings,
  economicsInputWarnings,
  businessInputWarnings,
  onUpdateLabel,
  onUpdateInput,
  onUpdateEconomics,
  onUpdateBusinessInput
}) => {
  const warningSections = [
    { label: 'Scenario cost', messages: economics.scenarioCost.warnings },
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
  const economicsWarnings = [...new Set([...economicsInputWarnings, ...economics.warnings])]
  const businessWarnings = [...new Set([...businessInputWarnings, ...business.warnings])]
  const labelId = `scenario-label-${scenario.letter}`
  const inputGuidanceId = `scenario-${scenario.letter}-input-guidance`
  const hasEconomicsInputs = ECONOMIC_INPUTS.some(({ key }) => (scenario.economicsInputs[key] ?? '').trim() !== '')

  return (
    <article className="flex min-w-0 flex-col border border-slate-300 bg-white">
      <header className="border-b border-slate-300 bg-slate-50 px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="border border-slate-800 bg-slate-900 px-2 py-0.5 font-sans text-[11px] font-semibold text-white">Option {scenario.letter}</h3>
          <span className={`font-sans text-[11px] font-medium ${STATUS_CLASS[economics.scenarioCost.status] ?? STATUS_CLASS.missing}`}>
            {economics.scenarioCost.status}
          </span>
        </div>
        <label htmlFor={labelId} className="mt-2 block font-sans text-[11px] font-medium text-slate-700">
          Action title
        </label>
        <input
          id={labelId}
          type="text"
          value={scenario.label}
          onChange={event => onUpdateLabel(event.target.value)}
          placeholder={`Scenario ${scenario.letter}`}
          className="mt-1 min-h-8 w-full rounded-sm border border-slate-400 bg-white px-2 py-1 font-sans text-xs text-slate-900 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
      </header>

      <div className="flex flex-1 flex-col gap-3 p-3">
        {inputDefinitions.length > 0 && (
          <fieldset aria-describedby={inputGuidanceId} className="space-y-2">
            <legend className="font-sans text-[11px] font-semibold text-slate-800">Parameter overrides</legend>
            <p id={inputGuidanceId} className="text-[11px] leading-4 text-slate-600">
              Leave a field blank to keep its Current value.
            </p>
            <div className="space-y-2">
              {inputDefinitions.map(definition => (
                <ScenarioInputField
                  key={definition.key}
                  definition={definition}
                  scenarioLetter={scenario.letter}
                  value={scenario.inputValues[definition.key]}
                  onChange={onUpdateInput}
                />
              ))}
            </div>
          </fieldset>
        )}

        <section aria-labelledby={`${labelId}-costs-heading`} className="border-y border-slate-300 py-2">
          <div className="mb-1.5 flex flex-wrap items-start justify-between gap-2">
            <div>
              <h4 id={`${labelId}-costs-heading`} className="font-sans text-sm font-semibold text-slate-800">
                Standard cost by element
              </h4>
              <p className="mt-0.5 text-[11px] text-slate-600">THB/pc</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <caption className="sr-only">
                Scenario {scenario.letter} MAT, LB, BD, and Standard Cost per piece, with cost change from Current
              </caption>
              <thead>
                <tr className="border-b border-slate-300 text-left font-semibold text-slate-700">
                  <th scope="col" className="py-1.5 pr-2">Cost element</th>
                  <th scope="col" className="px-2 py-1.5 text-right">Scenario</th>
                  <th scope="col" className="py-1.5 pl-2 text-right">Change</th>
                </tr>
              </thead>
              <tbody>
                {COST_ROWS.map(({ key, label }) => (
                  <tr key={key} className={key === 'total' ? 'border-t border-slate-300 font-semibold text-slate-900' : 'text-slate-700'}>
                    <th scope="row" className="py-1.5 pr-2 text-left font-medium">{label}</th>
                    <td className="px-2 py-1.5 text-right font-mono tabular-nums">
                      {formatCost(economics.scenarioCost[key])}
                    </td>
                    <td className="py-1.5 pl-2 text-right font-mono tabular-nums">
                      {formatDifference(result.currentCost[key], economics.scenarioCost[key])}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section aria-label={`Improvement economics for Scenario ${scenario.letter}`} className="space-y-2.5">
          <div>
            <h4 className="font-sans text-sm font-semibold text-slate-800">Improvement economics</h4>
            <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-slate-200 pb-1.5">
              <span className="text-[11px] font-medium text-slate-700">Gross Improvement / pc</span>
              <span className="font-mono text-xs font-semibold tabular-nums text-slate-900">
                {economics.grossImprovementPerPiece === null
                  ? 'N/A'
                  : `${formatCost(economics.grossImprovementPerPiece)} THB/pc`}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {ECONOMIC_INPUTS.map(({ key, label, unit }) => {
              const inputId = `scenario-${scenario.letter}-economics-${key}`
              return (
                <label key={key} htmlFor={inputId} className="block min-w-0 font-sans text-[11px] font-medium text-slate-700">
                  {label} <span className="font-normal text-slate-500">({unit})</span>
                  <input
                    id={inputId}
                    type="number"
                    step="any"
                    inputMode="decimal"
                    value={scenario.economicsInputs[key] ?? ''}
                    onChange={event => onUpdateEconomics(key, event.target.value)}
                    className="mt-1 min-h-8 w-full rounded-sm border border-slate-400 bg-white px-2 py-1 font-mono text-xs tabular-nums text-slate-900 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </label>
              )
            })}
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {ECONOMIC_CATEGORY_INPUTS.map(({ key, label }) => {
              const inputId = `scenario-${scenario.letter}-economics-${key}`
              return (
                <label key={key} htmlFor={inputId} className="block min-w-0 font-sans text-[11px] font-medium text-slate-700">
                  {label}
                  <select
                    id={inputId}
                    value={scenario.economicsInputs[key] ?? ''}
                    onChange={event => onUpdateEconomics(key, event.target.value)}
                    className="mt-1 min-h-8 w-full rounded-sm border border-slate-400 bg-white px-2 py-1 font-sans text-xs normal-case text-slate-900 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="">Select when this cost is included</option>
                    <option value="material">MAT</option>
                    <option value="labor">LB</option>
                    <option value="burden">BD</option>
                  </select>
                </label>
              )
            })}
          </div>
          <p className="text-[11px] leading-4 text-slate-600">
            Assign each included economics cost to MAT, LB, or BD. Do not repeat costs already represented by BOM, Routing, or Work Center rate changes.
          </p>

          {hasEconomicsInputs ? (
            <div className="overflow-x-auto border-t border-slate-200">
              <table className="w-full text-xs">
                <caption className="sr-only">Scenario {scenario.letter} improvement economics</caption>
                <tbody>
                  {ECONOMIC_ROWS.map(({ key, label, unit }) => (
                    <tr key={key} className="border-b border-slate-100 last:border-0">
                      <th scope="row" className="py-2 pr-2 text-left font-medium text-slate-700">{label}</th>
                      <td className="py-2 pl-2 text-right font-mono tabular-nums text-slate-900">
                        {economics[key] === null
                          ? key === 'variableAddedCostPerPiece' ? '—' : 'N/A'
                          : `${formatCost(economics[key])} ${unit}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-[11px] leading-4 text-slate-600">
              Add economics assumptions to see categorized Standard Cost and Total Improvement.
            </p>
          )}

          {economicsWarnings.length > 0 && (
            <ul role="status" className="list-disc space-y-1 pl-5 text-sm text-amber-900">
              {economicsWarnings.map(warning => <li key={warning}>{warning}</li>)}
            </ul>
          )}
        </section>

        <section aria-label={`Selling Price, SG&A, and OP for Scenario ${scenario.letter}`} className="space-y-2.5 border-t border-slate-300 pt-3">
          <h4 className="font-sans text-sm font-semibold text-slate-800">Selling Price, SG&A, and OP</h4>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {BUSINESS_INPUTS.map(({ key, label, unit }) => {
              const inputId = `scenario-${scenario.letter}-business-${key}`
              const currentValue = currentBusinessInputs[key]
              const placeholder = currentValue === null ? 'Current unavailable' : `Current ${formatCost(currentValue)} ${unit}`
              return (
                <label key={key} htmlFor={inputId} className="block min-w-0 font-sans text-[11px] font-medium text-slate-700">
                  {label} <span className="font-normal text-slate-500">({unit})</span>
                  <input
                    id={inputId}
                    type="number"
                    step="any"
                    inputMode="decimal"
                    value={scenario.businessInputs?.[key] ?? ''}
                    placeholder={placeholder}
                    onChange={event => onUpdateBusinessInput(key, event.target.value)}
                    className="mt-1 min-h-8 w-full rounded-sm border border-slate-400 bg-white px-2 py-1 font-mono text-xs tabular-nums text-slate-900 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </label>
              )
            })}
          </div>
          <dl className="grid grid-cols-2 gap-x-4 border-t border-slate-200 pt-2">
            <div className="border-b border-slate-100 py-1.5">
              <dt className="font-sans text-[11px] text-slate-500">Scenario Selling Price · THB/pc</dt>
              <dd className="mt-0.5 font-mono text-xs tabular-nums text-slate-900">{formatCost(business.sellingPrice)}</dd>
            </div>
            <div className="border-b border-slate-100 py-1.5">
              <dt className="font-sans text-[11px] text-slate-500">Scenario SG&amp;A %</dt>
              <dd className="mt-0.5 font-mono text-xs tabular-nums text-slate-900">{business.sgaPercent === null ? 'N/A' : `${formatCost(business.sgaPercent)}%`}</dd>
            </div>
            <div className="border-b border-slate-100 py-1.5">
              <dt className="font-sans text-[11px] text-slate-500">SG&amp;A amount / pc</dt>
              <dd className="mt-0.5 font-mono text-xs tabular-nums text-slate-900">{formatCost(business.sgaAmountPerPiece)}</dd>
            </div>
            <div className="border-b border-slate-100 py-1.5">
              <dt className="font-sans text-[11px] text-slate-500">OP / pc</dt>
              <dd className={`mt-0.5 font-mono text-xs font-semibold tabular-nums ${business.operatingProfitPerPiece !== null && business.operatingProfitPerPiece < 0 ? 'text-rose-700' : 'text-slate-900'}`}>
                {formatCost(business.operatingProfitPerPiece)}
                {business.operatingProfitPerPiece !== null && business.operatingProfitPerPiece < 0 ? ' · Operating loss' : ''}
              </dd>
            </div>
          </dl>
          {businessWarnings.length > 0 && (
            <ul role="status" className="list-disc space-y-1 pl-5 text-xs text-amber-900">
              {businessWarnings.map(warning => <li key={warning}>{warning}</li>)}
            </ul>
          )}
        </section>

        {uniqueWarnings.length > 0 && (
          <section aria-label={`Warnings for Scenario ${scenario.letter}`} className="mt-auto border-t border-slate-300 pt-3">
            <details>
                <summary className="min-h-8 cursor-pointer py-1 font-sans text-[11px] font-medium text-amber-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500">
                Scenario warnings ({uniqueWarnings.length})
              </summary>
              <div className="mt-2 border-l-2 border-amber-600 bg-amber-50 p-3 text-xs text-amber-950">
                <ul className="list-disc space-y-1 pl-5">
                  {uniqueWarnings.map(({ message, sources }) => (
                    <li key={message}>
                      <span className="font-semibold">{sources.join(' · ')}: </span>{message}
                    </li>
                  ))}
                </ul>
              </div>
            </details>
          </section>
        )}
      </div>
    </article>
  )
}
