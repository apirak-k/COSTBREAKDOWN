import React from 'react'
import { AppProvider, useAppStore } from './lib/store'
import { Navbar } from './components/Navbar'
import { DataMasterPage } from './pages/DataMasterPage'
import { CostBreakdownPage } from './pages/CostBreakdownPage'
import { CandidateSelectionPage } from './pages/CandidateSelectionPage'
import { RCAAndTrialPage } from './pages/RCAAndTrialPage'

const AppContent: React.FC = () => {
  const { activeTab } = useAppStore()

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'master' && <DataMasterPage />}
        {activeTab === 'breakdown' && <CostBreakdownPage />}
        {activeTab === 'candidate' && <CandidateSelectionPage />}
        {activeTab === 'rca' && <RCAAndTrialPage />}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}
