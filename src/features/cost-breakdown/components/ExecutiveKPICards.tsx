import React from 'react'
import {
  CostElementBreakdown,
  formatNumber,
  formatVariance,
  formatPercent
} from '../../../core'
import { KPIStatCard } from '../../../shared'

interface ExecutiveKPICardsProps {
  costBreakdown: CostElementBreakdown
}

export const ExecutiveKPICards: React.FC<ExecutiveKPICardsProps> = ({
  costBreakdown
}) => {
  const {
    totalBase, totalActive, totalVariance,
    materialBase, materialActive,
    laborBase, laborActive,
    burdenBase, burdenActive
  } = costBreakdown

  const matVar = materialActive - materialBase
  const labVar = laborActive - laborBase
  const burVar = burdenActive - burdenBase

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      {/* 1. Total Standard Cost */}
      <KPIStatCard
        title="Current Standard Cost"
        value={formatNumber(totalActive, 4)}
        badgeText={`Reference: ${formatNumber(totalBase, 4)}`}
        delta={{
          value: totalVariance,
          formatted: formatVariance(totalVariance, 4),
          percent: totalBase > 0 ? formatPercent(totalVariance / totalBase, 1) : undefined
        }}
      />

      {/* 2. Direct Material */}
      <KPIStatCard
        title="Current Direct Material"
        value={formatNumber(materialActive, 4)}
        badgeText={`Reference: ${formatNumber(materialBase, 4)}`}
        delta={{
          value: matVar,
          formatted: formatVariance(matVar, 4),
          percent: materialBase > 0 ? formatPercent(matVar / materialBase, 1) : undefined
        }}
      />

      {/* 3. Direct Labor */}
      <KPIStatCard
        title="Current Direct Labor"
        value={formatNumber(laborActive, 4)}
        badgeText={`Reference: ${formatNumber(laborBase, 4)}`}
        delta={{
          value: labVar,
          formatted: formatVariance(labVar, 4),
          percent: laborBase > 0 ? formatPercent(labVar / laborBase, 1) : undefined
        }}
      />

      {/* 4. Manufacturing Burden */}
      <KPIStatCard
        title="Current Mfg Burden"
        value={formatNumber(burdenActive, 4)}
        badgeText={`Reference: ${formatNumber(burdenBase, 4)}`}
        delta={{
          value: burVar,
          formatted: formatVariance(burVar, 4),
          percent: burdenBase > 0 ? formatPercent(burVar / burdenBase, 1) : undefined
        }}
      />
    </div>
  )
}
