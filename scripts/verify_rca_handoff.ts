import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const app = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8')
const features = readFileSync(resolve(process.cwd(), 'src/features/index.ts'), 'utf8')
const simulation = readFileSync(resolve(process.cwd(), 'src/features/simulation/SimulationPage.tsx'), 'utf8')
assert.doesNotMatch(app, /CandidateSelectionPage|proceedFromRcaToSimulation|simulationRcaHandoff|rcaContext=|prepareSimulationForRcaHandoff/,
  'App no longer creates a Candidate/RCA route or Simulation handoff')
assert.match(app, /activeTab === 'simulation'[\s\S]*?<SimulationPage/,
  'Simulation remains available directly through the product navigation')
assert.doesNotMatch(features, /candidate-selection/,
  'the feature barrel no longer exports a standalone Candidate page')
assert.doesNotMatch(simulation, /RcaSimulationHandoffContext|rcaContext|prepareSimulationForRcaHandoff/,
  'Simulation has no active RCA handoff context')
assert.equal(existsSync(resolve(process.cwd(), 'src/features/candidate-selection/CandidateSelectionPage.tsx')), false)
assert.equal(existsSync(resolve(process.cwd(), 'src/features/rca/RcaCaseWorkspace.tsx')), false)
assert.equal(existsSync(resolve(process.cwd(), 'src/features/rca-simulation/RCASimulationPage.tsx')), false,
  'the combined legacy RCA/Simulation page remains retired')

console.log('Standalone Candidate/RCA removal and direct Simulation flow verification passed')
