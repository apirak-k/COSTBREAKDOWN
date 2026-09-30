import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function readSource(relativePath: string): string {
  try {
    return readFileSync(resolve(process.cwd(), relativePath), 'utf8')
  } catch {
    return ''
  }
}

function sourceSection(source: string, startMarker: string, endMarker: string): string {
  const start = source.indexOf(startMarker)
  if (start < 0) return ''
  const end = source.indexOf(endMarker, start + startMarker.length)
  return source.slice(start, end < 0 ? undefined : end)
}

const pageSource = readSource('src/features/rca-simulation/RCASimulationPage.tsx')
const selectorSource = readSource('src/features/rca-simulation/components/CandidateSelector.tsx')
const formSource = readSource('src/features/rca-simulation/components/CandidateRcaForm.tsx')
const storeSource = readSource('src/state/store.tsx')
const calculatorSource = readSource('src/core/calculations/scenario-cost.ts')
const draftSource = readSource('src/features/rca-simulation/scenario-draft.ts')
const scenarioTypesSource = readSource('src/core/types/scenario.types.ts')
const saveCandidateRcaSource = sourceSection(
  storeSource,
  'const saveCandidateRca =',
  '\n  const importFromExcel ='
)
const scenarioCalculationCall = pageSource.match(/calculateScenarioCosts\([\s\S]{0,180}?\)/)?.[0] ?? ''

const failures: string[] = []
let checks = 0

function check(description: string, assertion: () => void): void {
  checks += 1
  try {
    assertion()
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    failures.push(description + ': ' + detail.split('\n')[0])
  }
}

check('RCA page consumes the canonical candidate pool', () => {
  assert.match(pageSource, /\bcandidates\b/)
  assert.match(pageSource, /<CandidateSelector\b[\s\S]*?candidates=\{candidates\}/)
})

check('RCA selection starts empty and does not depend on Ranking preselection', () => {
  assert.match(draftSource, /selectedCandidateKey:\s*null/)
  assert.match(pageSource, /state\.selectedCandidateKey/)
  assert.doesNotMatch(pageSource, /selectedDriverKeys|getSelectedDrivers/)
  assert.doesNotMatch(pageSource, /candidates\s*\[\s*0\s*\]/)
})

check('candidate selector renders the full pool by candidate identity', () => {
  assert.match(selectorSource, /candidates\.map\s*\(/)
  assert.match(selectorSource, /candidateKey/)
  assert.doesNotMatch(selectorSource, /candidates\.(?:slice|filter)\s*\(/)
})

check('editable Root Cause and Action notes are attached to the selected candidate', () => {
  assert.match(pageSource, /<CandidateRcaForm\b/)
  assert.match(pageSource, /candidateKey/)
  assert.match(formSource, /Root Cause/i)
  assert.match(formSource, /Action/i)
  assert.match(formSource, /<(?:textarea|input)\b/)
  assert.match(formSource, /onSave/)
})

check('notes save and load by candidateKey', () => {
  assert.match(storeSource, /candidateRcaRecords/)
  assert.match(storeSource, /saveCandidateRca/)
  assert.match(saveCandidateRcaSource, /candidateKey/)
  assert.match(saveCandidateRcaSource, /\[\s*candidateKey\s*\]/)
  assert.match(pageSource, /candidateRcaRecords/)
})

check('Root Cause and Action accept blank values in the form and save method', () => {
  assert.match(formSource, /Root Cause/i)
  assert.match(formSource, /\bAction\b/i)
  assert.match(formSource, /onSave\s*\(/)
  assert.match(formSource, /\bSave(?:\s+RCA|\s+Notes)?\b/i)
  assert.doesNotMatch(formSource, /<(?:textarea|input)\b[^>]*\srequired(?:\s|=|>)/i)
  assert.match(saveCandidateRcaSource, /const saveCandidateRca\s*=/)
  assert.match(saveCandidateRcaSource, /candidateKey/)
  assert.match(saveCandidateRcaSource, /draft/)
  assert.doesNotMatch(saveCandidateRcaSource, /\bif\s*\([\s\S]{0,160}\b(?:rootCause|action)\b/i)
  assert.doesNotMatch(saveCandidateRcaSource, /\b(?:rootCause|action)\s*(?:===?|\.trim\(\))/i)
})

check('notes are outside the active scenario calculator inputs', () => {
  assert.match(scenarioCalculationCall, /currentSnapshot,\s*preparedDrafts\.drafts/)
  assert.doesNotMatch(scenarioCalculationCall, /rootCause|candidateRcaRecords|candidateRcaRecord/)
  assert.doesNotMatch(calculatorSource, /rootCause|candidateRcaRecords|candidateRcaRecord/)
  assert.doesNotMatch(draftSource, /rootCause|candidateRcaRecords|candidateRcaRecord/)
  assert.doesNotMatch(scenarioTypesSource, /rootCause|candidateRcaRecords|candidateRcaRecord/)
})

if (failures.length > 0) {
  console.error('RCA candidate notes verification failed: ' + failures.length + '/' + checks + ' checks failed')
  for (const failure of failures) console.error('- ' + failure)
  process.exitCode = 1
} else {
  console.log('RCA candidate notes verification passed (' + checks + ' checks)')
}
