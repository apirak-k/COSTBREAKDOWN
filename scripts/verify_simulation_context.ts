import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createScenarioDrafts, updateScenarioDraft } from '../src/features/rca-simulation/scenario-draft'

const draftsByDriver = {
  'bom:bom-1': updateScenarioDraft(createScenarioDrafts(), 0, 'targetValue', '10'),
  'routing:rt-1': updateScenarioDraft(createScenarioDrafts(), 0, 'targetValue', '80')
}

assert.equal(draftsByDriver['bom:bom-1'][0].targetValue, '10')
assert.equal(draftsByDriver['routing:rt-1'][0].targetValue, '80')
assert.equal(draftsByDriver['bom:bom-1'][1].targetValue, '')

const pageSource = readFileSync(resolve(process.cwd(), 'src/features/rca-simulation/RCASimulationPage.tsx'), 'utf8')
const selectorSource = readFileSync(resolve(process.cwd(), 'src/features/rca-simulation/components/CandidateSelector.tsx'), 'utf8')

assert.equal(pageSource.includes('first controllable'), false, 'Simulation must not silently choose the first controllable driver')
assert.match(pageSource, /<CandidateSelector\b[\s\S]*?candidates=\{candidates\}/, 'RCA must receive the full Candidate Prioritization pool')
assert.match(selectorSource, /candidates\.map\s*\(/, 'RCA selector must expose the full candidate list')
assert.match(selectorSource, /candidateKey/, 'RCA selection must use candidate identity')
assert.match(pageSource, /selectedCandidateKey[\s\S]{0,100}useState(?:<[^>]+>)?\(\s*null\s*\)/, 'RCA must wait for a human candidate selection')
assert.doesNotMatch(pageSource, /selectedDriverKeys|getSelectedDrivers/, 'RCA must not depend on Ranking preselection')
assert.match(pageSource, /scenarioDraftsByProduct/, 'Simulation must retain per-product scenario drafts')
assert.match(pageSource, /scenarioDraftsByProduct\[activeProductId\]\?\.\[selectedCandidate\.candidateKey\]/, 'Simulation drafts must remain isolated by candidate')

console.log('Simulation context verification passed')
