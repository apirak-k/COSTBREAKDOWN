import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const app = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8')
const navbar = readFileSync(resolve(process.cwd(), 'src/shared/layout/Navbar.tsx'), 'utf8')
const features = readFileSync(resolve(process.cwd(), 'src/features/index.ts'), 'utf8')
const store = readFileSync(resolve(process.cwd(), 'src/state/store.tsx'), 'utf8')
const storage = readFileSync(resolve(process.cwd(), 'src/services/storage/session-storage.ts'), 'utf8')
assert.doesNotMatch(app, /CandidateSelectionPage|activeTab\s*===\s*'candidate'|proceedFromRcaToSimulation|simulationRcaHandoff/,
  'the App no longer routes through or creates the standalone Candidate/RCA handoff')
assert.doesNotMatch(navbar, /id: 'candidate'|label: 'Candidate'/,
  'Candidate is no longer a main navigation destination')
const navItems = navbar.match(/const navItems = \[([\s\S]*?)\] as const/)?.[1] ?? ''
assert.deepEqual([...navItems.matchAll(/id: '([^']+)'/g)].map(([, id]) => id), ['master', 'breakdown', 'simulation'],
  'main navigation contains only Master Data, Cost Breakdown, and Simulation in order')
assert.doesNotMatch(features, /candidate-selection/,
  'the standalone Candidate page is no longer exported as a product feature')
assert.match(store, /const \[activeTab, setActiveTabState\] = useState<ActiveTab>\('master'\)/,
  'a full app initialization always opens at the Master Data default')
assert.doesNotMatch(store, /normalizeActiveTab|STORAGE_KEYS\.ACTIVE_TAB/,
  'active-page view state is neither restored nor written by the app store')
assert.doesNotMatch(storage, /ACTIVE_TAB\s*:/, 'active-page view state has no browser-storage key')

console.log('Active-page refresh default and retired navigation verification passed')
