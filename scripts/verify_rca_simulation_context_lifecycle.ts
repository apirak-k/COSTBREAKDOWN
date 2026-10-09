import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const app = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8')
const store = readFileSync(resolve(process.cwd(), 'src/state/store.tsx'), 'utf8')
const effects = [...app.matchAll(/useEffect\(\(\) => \{([\s\S]*?)\}, \[([^\]]*)\]\)/g)]
const failures: string[] = []

function verify(name: string, assertion: () => void) {
  try {
    assertion()
    console.log(`PASS ${name}`)
  } catch (error) {
    failures.push(name)
    console.log(`FAIL ${name}: ${error instanceof Error ? error.message : String(error)}`)
  }
}

verify('RCA handoff context is scoped to its originating product', () => {
  assert.match(app, /context:\s*RcaSimulationHandoffContext/)
  assert.match(app, /simulationRcaHandoff\?\.productId === activeProductId\s*\?\s*simulationRcaHandoff\.context\s*:\s*null/)
})

verify('Leaving Simulation clears RCA-only handoff context', () => {
  const leavingEffect = effects.some(([, body, dependencies]) =>
    dependencies.includes('activeTab')
    && /setSimulationRcaHandoff\(null\)/.test(body)
    && /activeTab\s*!==\s*'simulation'/.test(body)
  )
  assert(leavingEffect, 'an activeTab lifecycle effect clears the handoff when Simulation is no longer active')
})

verify('Switching products clears RCA-only handoff context, including when switching back', () => {
  const productChangeEffect = effects.some(([, body, dependencies]) =>
    dependencies.includes('activeProductId') && /setSimulationRcaHandoff\(null\)/.test(body)
  )
  assert(productChangeEffect, 'an activeProductId lifecycle effect discards the previous product handoff')
})

verify('An RCA handoff explicitly stores context before opening Simulation', () => {
  const handoff = app.match(/const proceedFromRcaToSimulation = \(context: RcaSimulationHandoffContext\) => \{([\s\S]*?)\n  \}/)?.[1] ?? ''
  assert.match(handoff, /setSimulationRcaHandoff\(\{ productId: activeProductId, context \}\)/)
  assert.match(handoff, /setActiveTab\('simulation'\)/)
})

verify('Direct Simulation routing consumes only currently active handoff context', () => {
  assert.match(app, /<SimulationPage[\s\S]*?rcaContext=\{simulationRcaContext\}/)
  assert.match(app, /const simulationRcaContext = simulationRcaHandoff\?\.productId === activeProductId[\s\S]*?: null/)
})

verify('Direct navigation after a handoff cannot retain RCA-only context', () => {
  const lifecycleEffect = effects.some(([, body, dependencies]) =>
    dependencies.includes('activeTab') && /activeTab !== 'simulation'/.test(body) && /setSimulationRcaHandoff\(null\)/.test(body)
  )
  assert(lifecycleEffect, 'leaving Simulation clears the handoff before a later direct entry')
})

verify('SIM Reset clears only the product-scoped Simulation workspace', () => {
  const reset = app.match(/const resetSimulation = \(\) => \{([\s\S]*?)\n  \}/)?.[1] ?? ''
  assert.match(reset, /setSimulationStatesByProduct\(previous => \(\{/)
  assert.match(reset, /\[activeProductId\]: createEmptySimulationState\(\)/)
  assert.doesNotMatch(reset, /setProductSessions|setMasterData|masterDataSnapshots/)
})

verify('Selected Comparison is invalidated by a Reference or Current source change', () => {
  assert.match(store, /const snapshotSourceFingerprint = useMemo\(\(\) => JSON\.stringify\(\[snapshotPair\.reference, snapshotPair\.current\]\)/)
  assert.match(store, /selectedComparisonScope\?\.sourceFingerprint === snapshotSourceFingerprint/)
  assert.match(store, /if \(selectedComparisonScope && !activeSelectedComparisonScope\) setSelectedComparisonScope\(null\)/)
})

if (failures.length > 0) {
  throw new Error(`${failures.length} RCA/Simulation context lifecycle verification(s) failed`)
}

console.log('RCA/Simulation context lifecycle verification passed')
