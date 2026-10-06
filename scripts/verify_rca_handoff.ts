import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const pagePath = resolve(process.cwd(), 'src/features/rca-simulation/RCASimulationPage.tsx')
const page = readFileSync(pagePath, 'utf8')
const store = readFileSync(resolve(process.cwd(), 'src/state/store.tsx'), 'utf8')
const types = readFileSync(resolve(process.cwd(), 'src/core/types/cost.types.ts'), 'utf8')
const scenarioCard = readFileSync(resolve(process.cwd(), 'src/features/rca-simulation/components/ScenarioCard.tsx'), 'utf8')

assert.match(page, /state\.trialHandoffLetter/)
assert.match(page, /Mark a scenario for Trial/i)
assert.match(page, /value=\{state\.trialHandoffLetter \?\? ''\}/)
assert.match(page, /scenarioDrafts\.map\(scenario =>/)
assert.match(page, /Scenario \{state\.trialHandoffLetter\} is marked for the separate Trial stage/)
assert.doesNotMatch(page, /TrialValidationCard|promoteActiveToBaseline|Actual Cost|Measured Trial/i)
assert.doesNotMatch(store, /promoteActiveToBaseline/)
assert.equal(existsSync(resolve(process.cwd(), 'src/features/rca-simulation/components/TrialValidationCard.tsx')), false)
assert.doesNotMatch(types, /TrialValidationRecord|WhatIfResult|WhatIfScenario/)
assert.doesNotMatch(page + scenarioCard, /payback|discounted cash|benefit period/i)

console.log('RCA Trial handoff verification passed')
