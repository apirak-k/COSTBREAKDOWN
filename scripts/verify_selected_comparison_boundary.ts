import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const store = readFileSync(resolve(process.cwd(), 'src/state/store.tsx'), 'utf8')
const costBreakdownPage = readFileSync(resolve(process.cwd(), 'src/features/cost-breakdown/CostBreakdownPage.tsx'), 'utf8')

const failures: string[] = []
function verify(name: string, assertion: () => void) {
  try {
    assertion()
    console.log('PASS ' + name)
  } catch (error) {
    failures.push(name)
    console.log('FAIL ' + name + ': ' + (error instanceof Error ? error.message : String(error)))
  }
}

const setActiveTabBody = store.match(/const setActiveTab = \(tab: ActiveTab\) => \{([\s\S]*?)\n  \}/)?.[1] ?? ''
verify('Opening Simulation ends the active Selected Comparison scope', () => {
  assert.match(setActiveTabBody, /tab\s*===\s*'simulation'[\s\S]*setSelectedComparisonScope\(null\)/)
})

verify('Cost Breakdown directly applies Candidate selection and keeps the full comparison available', () => {
  assert.match(costBreakdownPage, /aria-label="Finding type filter"/)
  assert.match(costBreakdownPage, /<span className="font-semibold text-slate-800">Standard Cost Gap<\/span>/)
  assert.match(costBreakdownPage, /comparison=\{costBreakdownFullComparison\}/)
  assert.match(costBreakdownPage, /comparisonBefore,[\s\S]*comparisonAfter,[\s\S]*comparisonPair/)
  assert.match(store, /selectedComparisonScope\?\.pairFingerprint === comparisonPair\.fingerprint/)
  assert.match(costBreakdownPage, /onToggleFinding=\{toggleFinding\}/)
  assert.match(costBreakdownPage, /applySelectedComparison\(nextSelection\)/)
  assert.match(costBreakdownPage, /clearSelectedComparison\(\)/)
  assert.doesNotMatch(costBreakdownPage, /Select scope|Edit scope|Full Comparison|>Apply<|>Cancel</)
})

verify('Cost Breakdown preserves Candidate row selection and clears an empty scope', () => {
  assert.match(costBreakdownPage, /aria-label="Finding type filter"/)
  assert.match(costBreakdownPage, /onToggleFinding=\{toggleFinding\}/)
  assert.match(costBreakdownPage, /clearSelectedComparison\(\)/)
})

if (failures.length > 0) {
  throw new Error(failures.length + ' Selected Comparison boundary verification(s) failed')
}

console.log('Selected Comparison CBD/Simulation boundary verification passed')
