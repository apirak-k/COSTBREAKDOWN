import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'

const referenceBom = {
  id: 'bom-reference', itemCode: 'MAT-1', description: 'Material A',
  consumption: 0.25, unit: 'kg', price: 20, loss: 0.1
}
const currentBom = {
  id: 'bom-current', itemCode: 'MAT-1', description: 'Material A',
  consumption: 0.3, unit: 'kg', price: 24, loss: 0.15
}
const referenceRoute = {
  id: 'route-reference', processName: 'Turning', workCenterId: 'WC-A',
  manning: 1.5, capacity: 100, yield: 0.95
}
const currentRoute = {
  id: 'route-current', processName: 'Turning', workCenterId: 'WC-B',
  manning: 2, capacity: 120, yield: 0.98
}
const snapshotPair = {
  reference: {
    bom: [referenceBom], routing: [referenceRoute],
    rates: [{ id: 'rate-reference', workCenterCode: 'WC-A', laborRate: 10, burdenRate: 5 }]
  },
  current: {
    bom: [currentBom], routing: [currentRoute],
    rates: [{ id: 'rate-current', workCenterCode: 'WC-B', laborRate: 12, burdenRate: 6 }]
  }
}
const comparison = {
  bomFindings: [{ referenceId: 'bom-reference', currentId: 'bom-current' }],
  routingFindings: [{ referenceId: 'route-reference', currentId: 'route-current' }]
}
const bomCandidate = {
  candidateKey: 'mat:material a', candidateName: 'Material A', category: 'Direct Material',
  status: 'CHANGED', referenceCost: 100, currentCost: 115.83, costGap: 15.83,
  controllable: true, rank: 1, sourceType: 'bom', sourceId: 'bom-current',
  changeDetails: [{ field: 'Price', reference: 20, current: 24 }]
}
const processCandidate = {
  candidateKey: 'process:turning', candidateName: 'Turning', category: 'Process / Routing',
  status: 'CHANGED', referenceCost: 10, currentCost: 14, costGap: 4,
  controllable: true, rank: 2, sourceType: 'process', sourceId: 'route-current',
  processBreakdown: {
    reference: [{ id: 'route-reference', processName: 'Turning', manning: 1.5, capacity: 100, yield: 0.95, laborCost: 3, burdenCost: 1.5, totalCost: 4.5 }],
    current: [{ id: 'route-current', processName: 'Turning', manning: 2, capacity: 120, yield: 0.98, laborCost: 4, burdenCost: 2, totalCost: 6 }]
  }
}

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
try {
  const [details, quickInfo, rowModule] = await Promise.all([
    vite.ssrLoadModule('/src/features/candidate-selection/components/candidate-detail-data.ts'),
    vite.ssrLoadModule('/src/features/candidate-selection/components/CandidateQuickInfo.tsx'),
    vite.ssrLoadModule('/src/features/candidate-selection/components/CandidateRow.tsx')
  ])
  const bomData = details.resolveCandidateParameterData(bomCandidate, comparison, snapshotPair)
  assert.equal(bomData.reference?.id, 'bom-reference', 'BOM reference values resolve by the finding reference ID')
  assert.equal(bomData.current?.id, 'bom-current', 'BOM current values resolve by the finding current ID')
  const bomMarkup = renderToStaticMarkup(React.createElement(quickInfo.CandidateQuickInfo, {
    candidate: bomCandidate, parameters: bomData
  }))
  for (const label of ['Candidate information', 'Reference Cost', 'Current Cost', 'Cost Gap', 'Usage', 'Unit', 'Price', 'Loss']) {
    assert.ok(bomMarkup.includes(label), `BOM quick view includes ${label}`)
  }
  assert.ok(bomMarkup.includes('Material A'))
  assert.ok(bomMarkup.includes('20.00'))
  assert.ok(bomMarkup.includes('24.00'))

  const emptyMarkup = renderToStaticMarkup(React.createElement(quickInfo.CandidateQuickInfo, {
    candidate: null, parameters: null
  }))
  assert.match(emptyMarkup, /Candidate information/)
  assert.doesNotMatch(emptyMarkup, /Usage|Work Center|Material A|Turning/)

  const processData = details.resolveCandidateParameterData(processCandidate, comparison, snapshotPair)
  assert.equal(processData.type, 'process')
  assert.equal(processData.referenceRate?.laborRate, 10, 'Reference Labor Rate resolves from the Reference Work Center')
  assert.equal(processData.currentRate?.laborRate, 12, 'Current Labor Rate resolves from the Current Work Center')
  const processMarkup = renderToStaticMarkup(React.createElement(quickInfo.CandidateQuickInfo, {
    candidate: processCandidate, parameters: processData
  }))
  for (const value of ['Turning', 'WC-A', 'WC-B', 'Labor Rate', 'Burden Rate', '10.00', '12.00']) {
    assert.ok(processMarkup.includes(value), `RTG quick view includes ${value}`)
  }

  const expandedMarkup = renderToStaticMarkup(React.createElement(rowModule.CandidateRow, {
    candidate: processCandidate,
    quickViewKey: 'process:turning:route-current',
    parameters: processData,
    selectedForRca: false,
    quickViewSelected: false,
    expanded: true,
    onToggleControllable() {},
    onToggleRcaSelection() {},
    onHoverQuickView() {},
    onToggleQuickView() {},
    onToggleExpanded() {}
  }))
  assert.match(expandedMarkup, /aria-pressed="false"/, 'expanded details are independent of quick-view selection')
  assert.match(expandedMarkup, /aria-expanded="true"/, 'the individual row exposes its expansion state')
  assert.match(expandedMarkup, /Processing Cost Detail/, 'existing process cost detail remains inside the expansion')
  assert.match(expandedMarkup, /WC-A[\s\S]*WC-B/, 'expanded RTG detail includes both Work Center values')

  const pageSource = await readFile('src/features/candidate-selection/CandidateSelectionPage.tsx', 'utf8')
  const rowSource = await readFile('src/features/candidate-selection/components/CandidateRow.tsx', 'utf8')
  assert.match(pageSource, /aria-label="Information \/ Overview"/, 'overview remains one of the two page zones')
  assert.match(pageSource, /aria-label="Candidate"/, 'the Candidate list remains the other page zone')
  assert.match(pageSource, /<CandidateQuickInfo/, 'Candidate quick information stays inside the overview')
  assert.match(pageSource, /<CandidatesTable/, 'the Candidate list stays inside the Candidate zone')
  assert.match(pageSource, /useState<string \| null>\(null\)/, 'quick-view selection starts empty')
  assert.match(pageSource, /hoveredQuickViewKey \?\? selectedQuickViewKey/, 'hover preview remains separate from persistent selection')
  assert.match(pageSource, /const \[expandedCandidateKeys, setExpandedCandidateKeys\] = useState<Set<string>>\(\(\) => new Set\(\)\)/, 'expansion starts empty and is independent')
  assert.match(rowSource, /onMouseEnter=/, 'row hover previews a Candidate')
  assert.match(rowSource, /onMouseLeave=/, 'row preview clears when hover ends')

  console.log('Candidate selection view checks passed.')
} finally {
  await vite.close()
}
