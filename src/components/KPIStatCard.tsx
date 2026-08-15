import React from 'react'
import { LucideIcon } from 'lucide-react'

interface KPIStatCardProps {
  title: string
  value: string
  subtitle?: string
  icon: LucideIcon
  variant?: 'default' | 'emerald' | 'amber' | 'blue' | 'rose'
}

export const KPIStatCard: React.FC<KPIStatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'default'
}) => {
  const variantStyles = {
    default: 'bg-white border-slate-200 text-slate-900',
    emerald: 'bg-emerald-50/50 border-emerald-200 text-emerald-950',
    amber: 'bg-amber-50/50 border-amber-200 text-amber-950',
    blue: 'bg-blue-50/50 border-blue-200 text-blue-950',
    rose: 'bg-rose-50/50 border-rose-200 text-rose-950'
  }

  const iconStyles = {
    default: 'text-slate-500 bg-slate-100',
    emerald: 'text-emerald-700 bg-emerald-100',
    amber: 'text-amber-700 bg-amber-100',
    blue: 'text-blue-700 bg-blue-100',
    rose: 'text-rose-700 bg-rose-100'
  }

  return (
    <div className={`p-4 rounded-xl border ${variantStyles[variant]} shadow-sm transition-all hover:shadow-md`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 tracking-wide uppercase">{title}</span>
        <div className={`p-2 rounded-lg ${iconStyles[variant]}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight font-mono">{value}</span>
      </div>
      {subtitle && (
        <p className="mt-1 text-xs text-slate-500 truncate">{subtitle}</p>
      )}
    </div>
  )
}
