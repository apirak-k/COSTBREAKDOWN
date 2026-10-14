import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { normalizeActiveTab } from '../src/state/active-tab.ts'

assert.equal(normalizeActiveTab('dashboard'), 'simulation', 'legacy Dashboard entry migrates to Simulation')
assert.equal(normalizeActiveTab('candidate'), 'breakdown', 'legacy Candidate entry migrates to Cost Breakdown')
assert.equal(normalizeActiveTab('rca'), 'breakdown', 'legacy RCA entry migrates to Cost Breakdown')

for (const tab of ['master', 'breakdown', 'simulation'] as const) {
  assert.equal(normalizeActiveTab(tab), tab, `current tab ${tab} remains unchanged`)
}

for (const incompatible of ['trial', 'workspace', '', null, undefined, 42, {}]) {
  assert.equal(normalizeActiveTab(incompatible), 'master', 'unknown or incompatible navigation state falls back to Master Data')
}

const app = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8')
const navbar = readFileSync(resolve(process.cwd(), 'src/shared/layout/Navbar.tsx'), 'utf8')
const features = readFileSync(resolve(process.cwd(), 'src/features/index.ts'), 'utf8')
const store = readFileSync(resolve(process.cwd(), 'src/state/store.tsx'), 'utf8')
assert.doesNotMatch(app, /CandidateSelectionPage|activeTab\s*===\s*'candidate'|proceedFromRcaToSimulation|simulationRcaHandoff/,
  'the App no longer routes through or creates the standalone Candidate/RCA handoff')
assert.doesNotMatch(navbar, /id: 'candidate'|label: 'Candidate'/,
  'Candidate is no longer a main navigation destination')
const navItems = navbar.match(/const navItems = \[([\s\S]*?)\] as const/)?.[1] ?? ''
assert.deepEqual([...navItems.matchAll(/id: '([^']+)'/g)].map(([, id]) => id), ['master', 'breakdown', 'simulation'],
  'main navigation contains only Master Data, Cost Breakdown, and Simulation in order')
assert.doesNotMatch(features, /candidate-selection/,
  'the standalone Candidate page is no longer exported as a product feature')
assert.match(store, /normalizeActiveTab\(loadFromSession<unknown>\(STORAGE_KEYS\.ACTIVE_TAB, 'master'\)\)/,
  'stored legacy tab values are normalized before App routing uses them')

console.log('Legacy active-tab migration verification passed')
