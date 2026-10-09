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
    console.log(`PASS ${name}`)
  } catch (error) {
    failures.push(name)
    console.log(`FAIL ${name}: ${error instanceof Error ? error.message : String(error)}`)
  }
}

const setActiveTabBody = store.match(/const setActiveTab = \(tab: ActiveTab\) => \{([\s\S]*?)\n  \}/)?.[1] ?? ''
verify('Entering Simulation ends the active Selected Comparison scope', () => {
  assert.match(setActiveTabBody, /tab\s*===\s*'simulation'[\s\S]*setSelectedComparisonScope\(null\)/)
})

verify('Cost Breakdown explains the RCA/Simulation scope boundary without a one-Candidate gate', () => {
  assert.match(costBreakdownPage, /It ends when the RCA workspace or Simulation opens/)
  assert.doesNotMatch(costBreakdownPage, /ends when you choose one Candidate for RCA/)
})

const startRcaBody = candidatePage.match(/const startRcaCase = \(\) => \{([\s\S]*?)\n  \}/)?.[1] ?? ''
verify('Creating an RCA Case ends the active Selected Comparison scope', () => {
  assert.match(startRcaBody, /clearSelectedComparison\(\)/)
})

const openRcaCasesBody = candidatePage.match(/const openRcaCases = \(\) => \{([\s\S]*?)\n  \}/)?.[1] ?? ''
verify('Opening an existing RCA Case ends the active Selected Comparison scope', () => {
  assert.match(openRcaCasesBody, /clearSelectedComparison\(\)/)
  assert.match(candidatePage, /onClick=\{openRcaCases\}[\s\S]*?Open RCA Cases/)
})

const activeCaseEntryEffect = [...candidatePage.matchAll(/useEffect\(\(\) => \{([\s\S]*?)\}, \[([^\]]*)\]\)/g)]
  .find(([, body, dependencies]) => /showRcaCases/.test(dependencies) && /clearSelectedComparison\(\)/.test(body))
verify('Automatically reopening the active RCA Case ends any active Selected Comparison scope', () => {
  assert(activeCaseEntryEffect, 'an RCA Case visibility effect clears the scope when an active Case reopens')
})

if (failures.length > 0) {
  throw new Error(`${failures.length} Selected Comparison boundary verification(s) failed`)
}

console.log('Selected Comparison RCA/Simulation boundary verification passed')
