import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const store = readFileSync(resolve(process.cwd(), 'src/state/store.tsx'), 'utf8')
const candidatePage = readFileSync(resolve(process.cwd(), 'src/features/candidate-selection/CandidateSelectionPage.tsx'), 'utf8')
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
verify('Entering Simulation ends the active Selected Comparison scope', () => {
  assert.match(setActiveTabBody, /tab\s*===\s*'simulation'[\s\S]*setSelectedComparisonScope\(null\)/)
})

verify('Cost Breakdown directly applies Candidate selection and keeps full context visible', () => {
  assert.match(costBreakdownPage, /aria-label="Candidate type filter"/)
  assert.match(costBreakdownPage, /aria-label="Standard Cost Gap"/)
  assert.match(costBreakdownPage, /comparison=\{fullSnapshotComparison\}/)
  assert.match(costBreakdownPage, /onToggleFinding=\{toggleFinding\}/)
  assert.match(costBreakdownPage, /applySelectedComparison\(nextSelection\)/)
  assert.match(costBreakdownPage, /clearSelectedComparison\(\)/)
  assert.doesNotMatch(costBreakdownPage, /Select scope|Edit scope|Full Comparison|>Apply<|>Cancel</)
})

verify('Candidate page still lets a user clear the active Selected Comparison scope', () => {
  assert.match(candidatePage, /onExit=\{clearSelectedComparison\}/)
})

if (failures.length > 0) {
  throw new Error(failures.length + ' Selected Comparison boundary verification(s) failed')
}

console.log('Selected Comparison CBD/Candidate/Simulation boundary verification passed')
