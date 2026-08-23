import React from 'react'
import {
  CostElementBreakdown,
  WorkCenterRate,
  BOMItem,
  RoutingStep,
  formatNumber,
  formatVariance,
  formatPercent,
  calculateDataConfidenceSummary
} from '../../../core'
import { KPIStatCard } from '../../../shared'

interface ExecutiveKPICardsProps {
  costBreakdown: CostElementBreakdown
  rates?: WorkCenterRate[]
  bom?: BOMItem[]
  routing?: RoutingStep[]
}

export const ExecutiveKPICards: React.FC<ExecutiveKPICardsProps> = ({
  costBreakdown,
  rates = [],
  bom = [],
  routing = []
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

  const confidenceSummary = calculateDataConfidenceSummary(rates, bom, routing)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
      {/* 1. Total Standard Cost */}
      <KPIStatCard
        title="Total Standard Cost"
        value={formatNumber(totalActive, 4)}
        badgeText={`Base: ${formatNumber(totalBase, 4)}`}
        delta={{
          value: totalVariance,
          formatted: formatVariance(totalVariance, 4),
          percent: totalBase > 0 ? formatPercent(totalVariance / totalBase, 1) : undefined
        }}
      />

      {/* 2. Direct Material */}
      <KPIStatCard
        title="Direct Material (C_M)"
        value={formatNumber(materialActive, 4)}
        badgeText={`Base: ${formatNumber(materialBase, 4)}`}
        delta={{
          value: matVar,
          formatted: formatVariance(matVar, 4),
          percent: materialBase > 0 ? formatPercent(matVar / materialBase, 1) : undefined
        }}
      />

      {/* 3. Direct Labor */}
      <KPIStatCard
        title="Direct Labor (C_L)"
        value={formatNumber(laborActive, 4)}
        badgeText={`Base: ${formatNumber(laborBase, 4)}`}
        delta={{
          value: labVar,
          formatted: formatVariance(labVar, 4),
          percent: laborBase > 0 ? formatPercent(labVar / laborBase, 1) : undefined
        }}
      />

      {/* 4. Manufacturing Burden */}
      <KPIStatCard
        title="Mfg Burden (C_B)"
        value={formatNumber(burdenActive, 4)}
        badgeText={`Base: ${formatNumber(burdenBase, 4)}`}
        delta={{
          value: burVar,
          formatted: formatVariance(burVar, 4),
          percent: burdenBase > 0 ? formatPercent(burVar / burdenBase, 1) : undefined
        }}
      />

      {/* 5. Data Confidence Roll-up */}
      <div className="bg-white rounded-none border border-slate-300/80 p-3 shadow-2xs flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold font-mono text-slate-500 uppercase tracking-tight">
            Data Confidence
          </span>
          <span
            className={`px-1.5 py-0.2 text-[9px] font-mono font-bold rounded-none ${
              confidenceSummary.verifiedPercentage >= 80
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : confidenceSummary.verifiedPercentage >= 50
                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                : 'bg-rose-100 text-rose-900 border border-rose-300'
            }`}
          >
            {confidenceSummary.verifiedCount}/{confidenceSummary.totalFields} VER
          </span>
        </div>
        <div className="mt-2">
          <div className="text-xl font-bold font-mono text-slate-900 tracking-tight">
            {confidenceSummary.verifiedPercentage.toFixed(1)}%
          </div>
          <div className="text-[10px] font-mono text-slate-500 mt-1 flex items-center justify-between">
            <span className="text-emerald-700">✓ {confidenceSummary.verifiedCount} Ver</span>
            <span className="text-amber-700">! {confidenceSummary.estimatedCount} Est</span>
            <span className="text-rose-700">✕ {confidenceSummary.missingCount} Mis</span>
          </div>
        </div>
      </div>
    </div>
  )
}
