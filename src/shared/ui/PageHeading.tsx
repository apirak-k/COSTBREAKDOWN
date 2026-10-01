import React, { ReactNode } from 'react'

interface PageHeadingProps {
  title: string
  description: string
  actions?: ReactNode
}

export const PageHeading: React.FC<PageHeadingProps> = ({ title, description, actions }) => (
  <section className="flex flex-col gap-2 border-b border-slate-300 pb-4 sm:flex-row sm:items-center sm:justify-between">
    <div className="min-w-0">
      <h1 className="font-mono text-sm font-bold uppercase tracking-wide text-slate-950">{title}</h1>
      <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-600">{description}</p>
    </div>
    {actions && <div className="shrink-0">{actions}</div>}
  </section>
)
