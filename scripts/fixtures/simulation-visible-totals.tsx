import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { SimulationStoryGraph } from '../../src/features/simulation/SimulationStoryGraph'
import { createScenarioFinancialResult, createScenarioStory } from '../../src/core/calculations/scenario-story'
import { calculateScenarioBusinessMetrics } from '../../src/core/calculations/scenario-business'
import type { SnapshotCost } from '../../src/core/types'
import { HeaderValue } from '../../src/shared/layout/HeaderValue'
import { SelectedValueProvider } from '../../src/shared/ui/selected-value'
import '../../src/index.css'

function Fixture() {
  const [price, setPrice] = useState(300)
  const cost: SnapshotCost = { snapshotId: 'visible-totals', material: 200, labor: 60, burden: 40, total: 300, status: 'complete', warnings: [] }
  const financial = createScenarioFinancialResult(cost, calculateScenarioBusinessMetrics({ sellingPrice: price, sgaPercent: 0 }, cost.total))
  return <SelectedValueProvider>
    <main style={{ maxWidth: 760, margin: '0 auto', padding: 12 }}>
      <HeaderValue inDialog />
      <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
        <button onClick={() => setPrice(300)}>Positive only</button>
        <button onClick={() => setPrice(250)}>Mixed sign</button>
        <button onClick={() => setPrice(600)}>Separated</button>
      </div>
      <SimulationStoryGraph key={price} story={createScenarioStory(financial, financial, financial)} unit="KG" selectionContext={`visible-totals:${price}`} activeRole="current" onSelectActiveDataset={() => {}} />
    </main>
  </SelectedValueProvider>
}
createRoot(document.getElementById('root')!).render(<Fixture />)
