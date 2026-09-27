import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { simulateWhatIfScenarios } from '../src/core/calculations'

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
const simulatorSource = readSource('src/core/calculations/whatif-simulator.ts')
const saveCandidateRcaSource = sourceSection(
  storeSource,
  'const saveCandidateRca =',
  '\n  const importFromExcel ='
)
const simulationArguments = sourceSection(
  pageSource,
  'simulateWhatIfScenarios({',
  '\n    })'
)

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
  assert.match(pageSource, /selectedCandidateKey[\s\S]{0,100}useState(?:<[^>]+>)?\(\s*null\s*\)/)
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

check('note values are excluded from numeric simulator inputs', () => {
  assert.ok(simulationArguments.length > 0, 'RCA page must build explicit simulation inputs')
  assert.doesNotMatch(simulationArguments, /rootCause|candidateRcaRecords|candidateRcaRecord/)
  assert.doesNotMatch(simulatorSource, /\brootCause\b|\bcandidateRcaRecords\b/)
})

const driver = {
  driverKey: 'mat:MAT-1',
  sourceType: 'bom' as const,
  sourceId: 'bom-1',
  impact: 'unfavorable' as const,
  id: 1,
  category: 'Direct Material',
  driverName: 'Material A',
  rcaParameter: 'Unit Price Inflation',
  baseParameter: 10,
  activeParameter: 12,
  costGap: 2,
  tieBreakerScore: 2,
  rank: 1,
  pctContribution: 100,
  controllability: 'Controllable' as const,
  actionPlan: ''
}
const bomItem = {
  id: 'bom-1',
  lineNo: 1,
  materialCode: 'MAT-1',
  description: 'Material A',
  quantity: 1,
  uom: 'pc',
  consumption: 1,
  basePrice: 10,
  activePrice: 12,
  baseLoss: 0,
  activeLoss: 0,
  sourceRef: 'rca-candidate-notes-fixture'
}
const scenarios = [{
  letter: 'A' as const,
  label: 'Lower purchase price',
  targetValue: '10',
  investment: '',
  lotSize: '5000'
}]
const simulationBase = {
  driver,
  bomItem,
  routingStep: null,
  rates: [],
  totalActiveCost: 12,
  scenarios
}
const withoutNotes = simulateWhatIfScenarios(simulationBase)
const withBlankNotes = simulateWhatIfScenarios({
  ...simulationBase,
  driver: { ...driver, rootCause: '', action: '' }
})
const withNotes = simulateWhatIfScenarios({
  ...simulationBase,
  driver: {
    ...driver,
    rootCause: 'Supplier quotation increased',
    action: 'Qualify an alternate supplier'
  }
})

check('formula results are unchanged when note text is blank or populated', () => {
  assert.equal(withoutNotes[0]?.valid, true)
  assert.equal(withoutNotes[0]?.grossSaving, 2)
  assert.deepEqual(withBlankNotes, withoutNotes)
  assert.deepEqual(withNotes, withoutNotes)
})

if (failures.length > 0) {
  console.error('RCA candidate notes verification failed: ' + failures.length + '/' + checks + ' checks failed')
  for (const failure of failures) console.error('- ' + failure)
  process.exitCode = 1
} else {
  console.log('RCA candidate notes verification passed (' + checks + ' checks)')
}
