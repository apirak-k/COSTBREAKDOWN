import React from 'react'
import { AppProvider, useAppStore } from './state'
import { AppLayout } from './shared'
import {
  MasterDataPage,
  CostBreakdownPage,
  CandidateSelectionPage,
  RCASimulationPage
} from './features'

const AppRouter: React.FC = () => {
  const { activeTab } = useAppStore()

  return (
    <AppLayout>
      {activeTab === 'master' && <MasterDataPage />}
      {activeTab === 'breakdown' && <CostBreakdownPage />}
      {activeTab === 'candidate' && <CandidateSelectionPage />}
      {activeTab === 'rca' && <RCASimulationPage />}
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
