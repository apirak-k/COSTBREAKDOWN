import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { normalizeActiveTab } from '../src/state/active-tab.ts'

const app = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8')
const navbar = readFileSync(resolve(process.cwd(), 'src/shared/layout/Navbar.tsx'), 'utf8')
const features = readFileSync(resolve(process.cwd(), 'src/features/index.ts'), 'utf8')
const store = readFileSync(resolve(process.cwd(), 'src/state/store.tsx'), 'utf8')
const storage = readFileSync(resolve(process.cwd(), 'src/services/storage/session-storage.ts'), 'utf8')
const activeTab = readFileSync(resolve(process.cwd(), 'src/state/active-tab.ts'), 'utf8')
assert.doesNotMatch(app, /CandidateSelectionPage|activeTab\s*===\s*'candidate'|proceedFromRcaToSimulation|simulationRcaHandoff/,
  'the App no longer routes through or creates the standalone Candidate/RCA handoff')
assert.doesNotMatch(navbar, /id: 'candidate'|label: 'Candidate'/,
  'Candidate is no longer a main navigation destination')
const navItems = navbar.match(/const navItems = \[([\s\S]*?)\] as const/)?.[1] ?? ''
assert.deepEqual([...navItems.matchAll(/id: '([^']+)'/g)].map(([, id]) => id), ['master', 'breakdown', 'simulation'],
  'main navigation contains only Master Data, Cost Breakdown, and Simulation in order')
assert.doesNotMatch(features, /candidate-selection/,
  'the standalone Candidate page is no longer exported as a product feature')
assert.match(activeTab, /export type ActiveTab\s*=\s*'master'\s*\|\s*'breakdown'\s*\|\s*'simulation'/,
  'only Master Data, Cost Breakdown, and Simulation are valid stored pages')
assert.match(activeTab, /export function normalizeActiveTab\(value: unknown\): ActiveTab/,
  'stored page values pass through the active-page whitelist')
const activePageInitialization = store.match(/const \[activeTab,\s*setActiveTabState\] = useState<ActiveTab>\([\s\S]*?\n\s*\)/)?.[0]
assert.ok(activePageInitialization
  && /normalizeActiveTab\(/.test(activePageInitialization)
  && /loadFromSession<unknown>\(STORAGE_KEYS\.ACTIVE_TAB,\s*'master'\)/.test(activePageInitialization),
  'missing or unrecognized session data falls back to Master Data during initialization')
assert.match(store, /saveToSession\(STORAGE_KEYS\.ACTIVE_TAB, activeTab\)/,
  'the selected supported page is saved to session storage')
assert.match(storage, /ACTIVE_TAB:\s*['"]costbreakdown_active_tab['"]/, 'active-page persistence uses a dedicated session-storage key')

for (const page of ['master', 'breakdown', 'simulation']) {
  assert.equal(normalizeActiveTab(page), page, `the stored ${page} page remains valid`)
}
for (const missingOrInvalid of [undefined, null, '', 'candidate', 'rca', 'dashboard', 'unknown']) {
  assert.equal(normalizeActiveTab(missingOrInvalid), 'master', `missing or invalid page ${String(missingOrInvalid)} falls back to Master Data`)
}

console.log('Active-page whitelist, session persistence, fallback, and retired navigation verification passed')
