import React from 'react'
import { useAppStore } from '../lib/store'
import { KPIStatCard } from '../components/KPIStatCard'
import { VarianceTree } from '../components/VarianceTree'
import { DollarSign, Layers, Cog, TrendingUp } from 'lucide-react'

export const CostBreakdownPage: React.FC = () => {
  const { costBreakdown } = useAppStore()

  return (
    <div className="space-y-6">
      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPIStatCard
          title="Baseline Std Cost"
          value={`${costBreakdown.totalBase.toFixed(4)} ฿`}
          subtitle="Reference Standard Cost (C_Ref)"
          icon={DollarSign}
          variant="default"
        />
        <KPIStatCard
          title="Active Std Cost"
          value={`${costBreakdown.totalActive.toFixed(4)} ฿`}
          subtitle="Current Month Standard Cost (C_Cur)"
          icon={TrendingUp}
          variant={costBreakdown.totalVariance > 0 ? 'rose' : 'emerald'}
        />
        <KPIStatCard
          title="Direct Material (C_M)"
          value={`${costBreakdown.materialActive.toFixed(4)} ฿`}
          subtitle={`Δ +${(costBreakdown.materialActive - costBreakdown.materialBase).toFixed(4)} ฿ (Market Price)`}
          icon={Layers}
          variant="amber"
        />
        <KPIStatCard
          title="Conversion (C_L + C_B)"
          value={`${(costBreakdown.laborActive + costBreakdown.burdenActive).toFixed(4)} ฿`}
          subtitle={`Δ +${(costBreakdown.laborActive + costBreakdown.burdenActive - (costBreakdown.laborBase + costBreakdown.burdenBase)).toFixed(4)} ฿ (Yield Drop)`}
          icon={Cog}
          variant="blue"
        />
      </div>

      {/* Variance Tree */}
      <VarianceTree />
    </div>
  )
}
