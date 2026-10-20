import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'

const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error', optimizeDeps: { noDiscovery: true, entries: [] } })
try {
  const selection = await vite.ssrLoadModule('/src/shared/selection/row-drag-selection.ts')
  const { RowSelectionButton } = await vite.ssrLoadModule('/src/shared/ui/RowSelectionButton.tsx')
  const scope = ['row-1', 'row-2', 'row-3', 'row-3']
  const empty = new Set<string>()
  const partial = new Set(['row-2', 'outside'])
  const all = new Set(['row-1', 'row-2', 'row-3', 'outside'])

  assert.equal(selection.getRowSelectionState(empty, scope), 'none')
  assert.equal(selection.getRowSelectionState(partial, scope), 'mixed')
  assert.equal(selection.getRowSelectionState(all, scope), 'all')

  const selectFromNone = selection.applyRowSelectionScope(empty, scope, selection.getRowSelectionState(empty, scope) !== 'all')
  assert.deepEqual([...selectFromNone], ['row-1', 'row-2', 'row-3'], 'none selects every unique eligible key in one set transition')
  assert.deepEqual([...empty], [], 'bulk select leaves the source set unchanged')
  const selectFromMixed = selection.applyRowSelectionScope(partial, scope, selection.getRowSelectionState(partial, scope) !== 'all')
  assert.deepEqual([...selectFromMixed], ['row-2', 'outside', 'row-1', 'row-3'], 'mixed selects all eligible keys and preserves outside-scope selection')
  const clearAll = selection.applyRowSelectionScope(all, scope, selection.getRowSelectionState(all, scope) !== 'all')
  assert.deepEqual([...clearAll], ['outside'], 'all clears the applicable scope and preserves outside-scope selection')
  assert.deepEqual([...selection.applyRowSelectionScope(partial, scope, false)], ['outside'], 'clear removes applicable rows instead of restoring an earlier selection')

  for (const [state, aria] of [['none', 'false'], ['mixed', 'mixed'], ['all', 'true']] as const) {
    const darkMarkup = renderToStaticMarkup(React.createElement(RowSelectionButton, { state, label: 'Select rows', onClick() {} }))
    const goldMarkup = renderToStaticMarkup(React.createElement(RowSelectionButton, { state, label: 'Select rows', variant: 'gold', onClick() {} }))
    assert.match(darkMarkup, new RegExp(`aria-checked="${aria}"`), `${state} dark control has canonical ARIA state`)
    assert.match(goldMarkup, new RegExp(`aria-checked="${aria}"`), `${state} gold control has canonical ARIA state`)
  }
  const darkMarkup = renderToStaticMarkup(React.createElement(RowSelectionButton, { state: 'all', label: 'Clear rows', onClick() {} }))
  const darkMixedMarkup = renderToStaticMarkup(React.createElement(RowSelectionButton, { state: 'mixed', label: 'Select rows', onClick() {} }))
  const goldMarkup = renderToStaticMarkup(React.createElement(RowSelectionButton, { state: 'all', label: 'Clear rows', variant: 'gold', onClick() {} }))
  const goldMixedMarkup = renderToStaticMarkup(React.createElement(RowSelectionButton, { state: 'mixed', label: 'Select rows', variant: 'gold', onClick() {} }))
  const darkNoneMarkup = renderToStaticMarkup(React.createElement(RowSelectionButton, { state: 'none', label: 'Select rows', onClick() {} }))
  assert.match(darkMarkup, /border-white[^\"]*ring-white/, 'dark all uses a bright white border and ring')
  assert.match(darkMixedMarkup, /border-slate-500\/70[^\"]*ring-slate-500\/70/, 'dark mixed uses a faded ring')
  assert.match(darkNoneMarkup, /border-transparent/, 'dark none has no selected border or ring')
  assert.match(goldMarkup, /border-amber-800[^\"]*ring-amber-800/, 'gold all has a stronger amber border and ring')
  assert.match(goldMixedMarkup, /border-amber-400\/70[^\"]*ring-amber-300\/70/, 'gold mixed uses a softer border and ring')

  const source = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')
  for (const path of [
    '../src/features/master-data/components/BOMTable.tsx',
    '../src/features/master-data/components/WorkCenterRatesTable.tsx',
    '../src/features/master-data/components/RoutingTable.tsx',
    '../src/features/cost-breakdown/components/CandidateFindingsTable.tsx',
    '../src/features/simulation/SimulationPage.tsx'
  ]) assert.match(source(path), /RowSelectionButton/, `${path} uses the shared header control`)

  const masterTables = [
    '../src/features/master-data/components/BOMTable.tsx',
    '../src/features/master-data/components/WorkCenterRatesTable.tsx',
    '../src/features/master-data/components/RoutingTable.tsx'
  ].map(source).join('\n')
  assert.match(masterTables, /filteredBOM\.map\(item => item\.id\)/)
  assert.match(masterTables, /filteredRates\.map\(rate => rate\.id\)/)
  assert.match(masterTables, /filteredRouting\.map\(step => step\.id\)/)

  const candidateSource = source('../src/features/cost-breakdown/components/CandidateFindingsTable.tsx')
  assert.match(candidateSource, /eligibleRows\.map\(row => findingKey/)
  assert.match(candidateSource, /applyRowSelectionScope\(selectedKeys, visibleKeys, selectionState !== 'all'\)/)
  const simulationSource = source('../src/features/simulation/SimulationPage.tsx')
  assert.match(simulationSource, /const selectionScope = selectableTargets\.map\(target => target\.key\)/,
    'Simulation selection scope comes from every eligible logical table row, not its scroll viewport')
  assert.match(simulationSource, /onSetWorkingSelection\(\s*\[\.\.\.applyRowSelectionScope/)
  assert.doesNotMatch(simulationSource, /for \(const id of selectableRecordIds\)[\s\S]{0,180}onToggleWorkingTarget/,
    'Simulation header bulk selection never loops over individual row toggles')
  assert.match(simulationSource, /Number\(isSelectedRow\(right\.row\)\) - Number\(isSelectedRow\(left\.row\)\) \|\| left\.sourceIndex - right\.sourceIndex/,
    'Simulation selected-first ordering stays stable within selection groups')

  console.log('Row selection shared behavior and UI verifier: PASS')
} finally {
  await vite.close()
}
