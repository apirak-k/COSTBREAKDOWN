import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createRcaCaseRecord, isRcaCaseComplete } from '../src/state/rca-cases.ts'
import { RcaCaseWorkspace } from '../src/features/rca/RcaCaseWorkspace.tsx'

const candidateKeys = ['bom:MAT-1', 'process:QA-1']
const candidates = candidateKeys.map((candidateKey, index) => ({
  candidateKey,
  candidateName: index === 0 ? 'Material cost' : 'Inspection process',
  category: 'Synthetic', factor: 'Price', status: 'CHANGED' as const,
  referenceCost: 10, currentCost: 12, costGap: 2, controllable: false, rank: index + 1,
  sourceType: index === 0 ? 'bom' as const : 'process' as const,
  sourceId: candidateKey
}))
const record = createRcaCaseRecord('case-1', candidateKeys, { rootCause: 'Shared cause', action: 'Shared action' })
const markup = renderToStaticMarkup(React.createElement(RcaCaseWorkspace, {
  candidates,
  cases: [record],
  activeCaseId: record.id,
  onSelectCase() {}, onSave() {}, onClose() {}
}))
const text = markup.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')

assert.ok(text.includes('Material cost'))
assert.ok(text.includes('Inspection process'))
assert.ok(markup.includes('Root Cause / Why?'))
assert.ok(markup.includes('Action'))
assert.equal(isRcaCaseComplete(record), true, 'RCA completion is based on case-level fields')
assert.doesNotMatch(markup, /CandidateRcaForm|candidateRcaRecords|Trial|Scenario A|Scenario B/)

console.log('RCA Case workspace verification passed')
