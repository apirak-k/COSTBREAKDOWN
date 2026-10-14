import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createRcaSimulationHandoffContext, createRcaCaseRecord, isRcaCaseComplete } from '../src/state/rca-cases.ts'

const oneCandidateCase = createRcaCaseRecord('case-one', ['bom:MAT-1'], {
  rootCause: '', action: ''
})
const oneCandidateContext = createRcaSimulationHandoffContext(oneCandidateCase, {
  rootCause: 'Draft cause', action: 'Draft action'
})
assert.deepEqual(oneCandidateContext, {
  caseId: 'case-one', candidateKeys: ['bom:MAT-1'], rootCause: 'Draft cause', action: 'Draft action'
}, 'legacy Simulation context preserves the active Case and latest draft')

const candidateKeys = ['bom:MAT-1', 'process:QA-1']
const completedCase = createRcaCaseRecord('case-many', candidateKeys, {
  rootCause: 'Shared process change', action: 'Balance the revised sequence'
})
assert.equal(isRcaCaseComplete(completedCase), true)
assert.deepEqual(createRcaSimulationHandoffContext(completedCase, {
  rootCause: 'Latest unsaved multi-Candidate cause',
  action: 'Latest unsaved action across both process steps'
}), {
  caseId: 'case-many', candidateKeys,
  rootCause: 'Latest unsaved multi-Candidate cause',
  action: 'Latest unsaved action across both process steps'
}, 'legacy context helper preserves the latest draft for every Candidate')

const app = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8')
const features = readFileSync(resolve(process.cwd(), 'src/features/index.ts'), 'utf8')
const simulation = readFileSync(resolve(process.cwd(), 'src/features/simulation/SimulationPage.tsx'), 'utf8')
assert.doesNotMatch(app, /CandidateSelectionPage|proceedFromRcaToSimulation|simulationRcaHandoff|rcaContext=/,
  'App no longer creates a Candidate/RCA route or Simulation handoff')
assert.match(app, /activeTab === 'simulation'[\s\S]*?<SimulationPage/,
  'Simulation remains available directly through the product navigation')
assert.doesNotMatch(features, /candidate-selection/,
  'the feature barrel no longer exports a standalone Candidate page')
assert.match(simulation, /rcaContext\?: RcaSimulationHandoffContext \| null/,
  'Simulation keeps its optional internal compatibility prop for later cleanup')
assert.equal(existsSync(resolve(process.cwd(), 'src/features/candidate-selection/CandidateSelectionPage.tsx')), false)
assert.equal(existsSync(resolve(process.cwd(), 'src/features/rca/RcaCaseWorkspace.tsx')), false)
assert.equal(existsSync(resolve(process.cwd(), 'src/features/rca-simulation/RCASimulationPage.tsx')), false,
  'the combined legacy RCA/Simulation page remains retired')

console.log('Standalone Candidate/RCA removal and legacy Simulation compatibility verification passed')
