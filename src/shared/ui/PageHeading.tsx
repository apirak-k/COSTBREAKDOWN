import React, { ReactNode } from 'react'

interface PageHeadingProps {
  title: string
  description: string
  actions?: ReactNode
}

export const PageHeading: React.FC<PageHeadingProps> = ({ title, description, actions }) => (
  <section className="flex flex-col gap-3 border-b border-slate-300 pb-4 sm:flex-row sm:items-end sm:justify-between">
    <div className="min-w-0">
      <h1 className="text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">{title}</h1>
      <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
    </div>
    {actions && <div className="shrink-0">{actions}</div>}
  </section>
)
