import { TrendingUp, Move, RotateCcw, ArrowUpDown } from 'lucide-react'
import type { SpinMetrics } from '@spin/lib/spinAlgorithm'
import { cn } from '@spin/lib/utils'

interface MetricsHUDProps {
  metrics: SpinMetrics
  fps: number
}

interface MetricItemProps {
  icon: React.ReactNode
  label: string
  value: string
  unit: string
  isGood: boolean
  isActive: boolean
}

function MetricItem({ icon, label, value, unit, isGood, isActive }: MetricItemProps) {
  return (
    <div className={cn(
      "flex flex-col items-center gap-1 p-2.5 rounded-lg border transition-colors",
      isActive
        ? isGood ? "border-success/30 bg-success/5" : "border-warning/30 bg-warning/5"
        : "border-border bg-card"
    )}>
      <div className={cn(
        "text-muted-foreground",
        isActive && (isGood ? "text-success" : "text-warning")
      )}>
        {icon}
      </div>
      <div className="text-center">
        <div className={cn(
          "font-metric font-bold text-lg leading-none",
          isActive ? (isGood ? "text-success" : "text-warning") : "text-foreground/40"
        )}>
          {value}
          <span className="text-xs font-normal ml-0.5 text-muted-foreground">{unit}</span>
        </div>
        <div className="text-[10px] text-muted-foreground mt-0.5">{label}</div>
      </div>
    </div>
  )
}

export function MetricsHUD({ metrics, fps: _fps }: MetricsHUDProps) {
  const tiltGood = Math.abs(metrics.tiltAngle) < 5
  const driftGood = metrics.driftRange < 0.05
  const rpmGood = metrics.rpm > 60
  const symGood = metrics.armSymmetry > 0.7

  const active = metrics.isSpinning

  return (
    <div className="grid grid-cols-4 gap-2">
      <MetricItem
        icon={<RotateCcw className="w-4 h-4" />}
        label="转速"
        value={active ? metrics.rpm.toString() : '--'}
        unit="rpm"
        isGood={rpmGood}
        isActive={active}
      />
      <MetricItem
        icon={<ArrowUpDown className="w-4 h-4" />}
        label="倾斜"
        value={active ? Math.abs(metrics.tiltAngle).toFixed(1) : '--'}
        unit="°"
        isGood={tiltGood}
        isActive={active}
      />
      <MetricItem
        icon={<Move className="w-4 h-4" />}
        label="漂移"
        value={active ? (metrics.driftRange * 100).toFixed(1) : '--'}
        unit="%"
        isGood={driftGood}
        isActive={active}
      />
      <MetricItem
        icon={<TrendingUp className="w-4 h-4" />}
        label="对称"
        value={active ? Math.round(metrics.armSymmetry * 100).toString() : '--'}
        unit="%"
        isGood={symGood}
        isActive={active}
      />
    </div>
  )
}
