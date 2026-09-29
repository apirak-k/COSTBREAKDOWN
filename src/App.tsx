import React from 'react'
import { AppProvider, useAppStore } from './state'
import { AppLayout } from './shared'

const MasterDataPage = React.lazy(() => import('./features/master-data/MasterDataPage').then(module => ({
  default: module.MasterDataPage
})))
const CostBreakdownPage = React.lazy(() => import('./features/cost-breakdown/CostBreakdownPage').then(module => ({
  default: module.CostBreakdownPage
})))
const CandidateSelectionPage = React.lazy(() => import('./features/candidate-selection/CandidateSelectionPage').then(module => ({
  default: module.CandidateSelectionPage
})))
const RCASimulationPage = React.lazy(() => import('./features/rca-simulation/RCASimulationPage').then(module => ({
  default: module.RCASimulationPage
})))

const AppRouter: React.FC = () => {
  const { activeTab } = useAppStore()

  return (
    <AppLayout>
      <React.Suspense fallback={<div className="p-6 text-sm text-slate-600" role="status">Loading page…</div>}>
        {activeTab === 'master' && <MasterDataPage />}
        {activeTab === 'breakdown' && <CostBreakdownPage />}
        {activeTab === 'candidate' && <CandidateSelectionPage />}
        {activeTab === 'rca' && <RCASimulationPage />}
      </React.Suspense>
    </AppLayout>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppRouter />
    </AppProvider>
  )
}
