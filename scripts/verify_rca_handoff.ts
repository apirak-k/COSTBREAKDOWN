import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createRcaCaseRecord, isRcaCaseComplete } from '../src/state/rca-cases.ts'

const candidateKeys = ['bom:MAT-1', 'process:QA-1']
const completedCase = createRcaCaseRecord('case-1', candidateKeys, {
  rootCause: 'Shared process change', action: 'Balance the revised sequence'
})
assert.deepEqual(completedCase.candidateKeys, candidateKeys)
assert.equal(isRcaCaseComplete(completedCase), true, 'Root Cause and Action complete RCA without a Simulation')

const candidatePage = readFileSync(resolve(process.cwd(), 'src/features/candidate-selection/CandidateSelectionPage.tsx'), 'utf8')
const caseWorkspace = readFileSync(resolve(process.cwd(), 'src/features/rca/RcaCaseWorkspace.tsx'), 'utf8')
const app = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8')
const features = readFileSync(resolve(process.cwd(), 'src/features/index.ts'), 'utf8')

assert.match(candidatePage, /Create RCA Case/)
assert.match(candidatePage, /<RcaCaseWorkspace\b/)
assert.match(caseWorkspace, /Root Cause \/ Why\?/)
assert.match(caseWorkspace, /<h2[^>]*>RCA Case<\/h2>/)
assert.match(caseWorkspace, /Simulation is optional/)
assert.doesNotMatch(candidatePage + caseWorkspace + app + features, /Mark a scenario for Trial|trialHandoffLetter|selectedScenarioLetter/)
assert.doesNotMatch(app + features, /rca-simulation/)
assert.equal(existsSync(resolve(process.cwd(), 'src/features/rca-simulation/RCASimulationPage.tsx')), false,
  'the combined legacy RCA/Simulation page is retired')

console.log('RCA Case completion and independent workflow verification passed')
