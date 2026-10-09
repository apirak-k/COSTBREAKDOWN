import assert from 'node:assert/strict'
import { normalizeActiveTab } from '../src/state/active-tab.ts'

assert.equal(normalizeActiveTab('dashboard'), 'simulation', 'legacy Dashboard entry migrates to Simulation')
assert.equal(normalizeActiveTab('rca'), 'candidate', 'legacy RCA entry migrates to the Candidate/RCA workflow')

for (const tab of ['master', 'breakdown', 'candidate', 'simulation'] as const) {
  assert.equal(normalizeActiveTab(tab), tab, `current tab ${tab} remains unchanged`)
}

for (const incompatible of ['trial', 'workspace', '', null, undefined, 42, {}]) {
  assert.equal(normalizeActiveTab(incompatible), 'master', 'unknown or incompatible navigation state falls back to Master Data')
}

console.log('Legacy active-tab migration verification passed')
