import React, { ReactNode } from 'react'
import { Navbar } from './Navbar'

interface AppLayoutProps {
  children: ReactNode
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  )
}
