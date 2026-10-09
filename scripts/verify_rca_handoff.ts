import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { RcaCaseWorkspace } from '../src/features/rca/RcaCaseWorkspace.tsx'
import { createRcaSimulationHandoffContext, createRcaCaseRecord, isRcaCaseComplete } from '../src/state/rca-cases.ts'

const oneCandidateCase = createRcaCaseRecord('case-one', ['bom:MAT-1'], {
  rootCause: '', action: ''
})
const oneCandidateContext = createRcaSimulationHandoffContext(oneCandidateCase, {
  rootCause: 'Draft cause', action: 'Draft action'
})
assert.deepEqual(oneCandidateContext, {
  caseId: 'case-one', candidateKeys: ['bom:MAT-1'], rootCause: 'Draft cause', action: 'Draft action'
}, 'single-Candidate handoff carries the active Case and its latest draft context')

const candidateKeys = ['bom:MAT-1', 'process:QA-1']
const completedCase = createRcaCaseRecord('case-many', candidateKeys, {
  rootCause: 'Shared process change', action: 'Balance the revised sequence'
})
assert.deepEqual(completedCase.candidateKeys, candidateKeys)
assert.equal(isRcaCaseComplete(completedCase), true, 'Root Cause and Action complete RCA without a Simulation')
assert.deepEqual(createRcaSimulationHandoffContext(completedCase, completedCase), {
  caseId: 'case-many', candidateKeys, rootCause: completedCase.rootCause, action: completedCase.action
}, 'multi-Candidate handoff carries every Case Candidate and its RCA context')
const latestMultiCandidateDraft = {
  rootCause: 'Latest unsaved multi-Candidate cause',
  action: 'Latest unsaved action across both process steps'
}
assert.deepEqual(createRcaSimulationHandoffContext(completedCase, latestMultiCandidateDraft), {
  caseId: 'case-many', candidateKeys,
  rootCause: latestMultiCandidateDraft.rootCause,
  action: latestMultiCandidateDraft.action
}, 'multi-Candidate handoff carries the latest draft instead of stale saved values')

const incompleteWorkspaceMarkup = renderToStaticMarkup(React.createElement(RcaCaseWorkspace, {
  candidates: [],
  cases: [oneCandidateCase],
  activeCaseId: oneCandidateCase.id,
  onSelectCase() {},
  onSave() {},
  onClose() {},
  onProceedToSimulation() {}
}))
assert.match(incompleteWorkspaceMarkup, />Proceed to Simulation</, 'an incomplete active RCA Case may proceed without an invented completion gate')
assert.doesNotMatch(incompleteWorkspaceMarkup, /disabled[^>]*>Proceed to Simulation/, 'Simulation is not required to complete RCA')

const candidatePage = readFileSync(resolve(process.cwd(), 'src/features/candidate-selection/CandidateSelectionPage.tsx'), 'utf8')
const caseWorkspace = readFileSync(resolve(process.cwd(), 'src/features/rca/RcaCaseWorkspace.tsx'), 'utf8')
const app = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8')
const features = readFileSync(resolve(process.cwd(), 'src/features/index.ts'), 'utf8')

assert.match(candidatePage, /Create RCA Case/)
assert.match(candidatePage, /<RcaCaseWorkspace\b/)
assert.match(caseWorkspace, /Root Cause \/ Why\?/)
assert.match(caseWorkspace, /<h2[^>]*>RCA Case<\/h2>/)
assert.match(caseWorkspace, /Simulation is optional/)
assert.match(caseWorkspace, /if \(!saved\) save\(\)/, 'handoff saves the current RCA draft before leaving the workspace')
assert.match(caseWorkspace, /createRcaSimulationHandoffContext\(activeCase, draft\)/, 'handoff carries the active Case and draft values')
assert.match(candidatePage, /onProceedToSimulation=\{onProceedToSimulation\}/)
assert.match(app, /onProceedToSimulation=\{proceedFromRcaToSimulation\}/)
assert.match(app, /setActiveTab\('simulation'\)/)
assert.match(app, /rcaContext=\{simulationRcaContext\}/)
assert.doesNotMatch(candidatePage + caseWorkspace + app + features, /Mark a scenario for Trial|trialHandoffLetter|selectedScenarioLetter/)
assert.equal(existsSync(resolve(process.cwd(), 'src/features/rca-simulation/RCASimulationPage.tsx')), false,
  'the combined legacy RCA/Simulation page is retired')

console.log('RCA Case completion and independent workflow verification passed')
