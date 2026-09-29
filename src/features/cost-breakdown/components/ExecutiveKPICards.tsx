import React from 'react'
import { CostComparison, formatNumber, formatPercent, formatVariance } from '../../../core'
import { KPIStatCard } from '../../../shared'

interface ExecutiveKPICardsProps {
  comparison: CostComparison
}

const formatCost = (value: number | null): string => value === null ? '—' : formatNumber(value, 4)

export const ExecutiveKPICards: React.FC<ExecutiveKPICardsProps> = ({ comparison }) => {
  const metrics = [
    {
      title: 'Current Standard Cost',
      reference: comparison.referenceCost.total,
      current: comparison.currentCost.total,
      gap: comparison.totalGap
    },
    {
      title: 'Current Direct Material',
      reference: comparison.referenceCost.material,
      current: comparison.currentCost.material,
      gap: comparison.elementGaps.material
    },
    {
      title: 'Current Direct Labor',
      reference: comparison.referenceCost.labor,
      current: comparison.currentCost.labor,
      gap: comparison.elementGaps.labor
    },
    {
      title: 'Current Mfg Burden',
      reference: comparison.referenceCost.burden,
      current: comparison.currentCost.burden,
      gap: comparison.elementGaps.burden
    }
  ]

  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map(metric => (
        <KPIStatCard
          key={metric.title}
          title={metric.title}
          value={formatCost(metric.current)}
          badgeText={`Reference: ${formatCost(metric.reference)}`}
          delta={metric.gap === null ? undefined : {
            value: metric.gap,
            formatted: formatVariance(metric.gap, 4),
            percent: metric.reference !== null && metric.reference > 0
              ? formatPercent(metric.gap / metric.reference, 1)
              : undefined
          }}
        />
      ))}
    </div>
  )
}
