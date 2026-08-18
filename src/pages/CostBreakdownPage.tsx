import React from 'react'
import { useAppStore } from '../lib/store'
import { KPIStatCard } from '../components/KPIStatCard'
import { VarianceTree } from '../components/VarianceTree'

export const CostBreakdownPage: React.FC = () => {
  const { costBreakdown } = useAppStore()

  const matVar  = costBreakdown.materialActive - costBreakdown.materialBase
  const convVar = (costBreakdown.laborActive + costBreakdown.burdenActive)
                - (costBreakdown.laborBase   + costBreakdown.burdenBase)
  const totalVar = costBreakdown.totalVariance

  const matPct = costBreakdown.totalActive > 0 
    ? ((costBreakdown.materialActive / costBreakdown.totalActive) * 100).toFixed(1)
    : '0.0'

  const convPct = costBreakdown.totalActive > 0
    ? (((costBreakdown.laborActive + costBreakdown.burdenActive) / costBreakdown.totalActive) * 100).toFixed(1)
    : '0.0'

  const totalPct = costBreakdown.totalBase > 0
    ? ((totalVar / costBreakdown.totalBase) * 100).toFixed(2)
    : '0.00'

  const fmtSign = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(4)}`

  return (
    <div className="space-y-6">
      {/* Executive Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <KPIStatCard
          title="Baseline Standard"
          value={costBreakdown.totalBase.toFixed(4)}
          badgeText="C_Ref"
          description="Target baseline cost"
        />

        <KPIStatCard
          title="Current Standard"
          value={costBreakdown.totalActive.toFixed(4)}
          badgeText="C_Cur"
          delta={{
            value: totalVar,
            formatted: fmtSign(totalVar),
            percent: `${totalVar >= 0 ? '+' : ''}${totalPct}%`
          }}
          description="Active month std"
        />

        <KPIStatCard
          title="Direct Material"
          value={costBreakdown.materialActive.toFixed(4)}
          badgeText={`C_M (${matPct}%)`}
          delta={{
            value: matVar,
            formatted: fmtSign(matVar)
          }}
          description="Material variance"
        />

        <KPIStatCard
          title="Conversion (L + B)"
          value={(costBreakdown.laborActive + costBreakdown.burdenActive).toFixed(4)}
          badgeText={`C_L+B (${convPct}%)`}
          delta={{
            value: convVar,
            formatted: fmtSign(convVar)
          }}
          description="Process variance"
        />
      </div>

      {/* Variance Tree */}
      <VarianceTree />
    </div>
  )
}
