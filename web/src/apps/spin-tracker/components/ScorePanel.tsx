import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Progress } from './ui/progress'
import type { SpinScores } from '@spin/lib/spinAlgorithm'
import { cn } from '@spin/lib/utils'

interface ScorePanelProps {
  scores: SpinScores
  feedback: string[]
  isActive: boolean
}

function scoreColor(v: number) {
  if (v >= 80) return 'bg-success'
  if (v >= 50) return 'bg-warning'
  return 'bg-destructive'
}

function ScoreRow({ label, value, isActive }: { label: string; value: number; isActive: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground w-14 shrink-0">{label}</span>
      <Progress
        value={isActive ? value : 0}
        colorClass={scoreColor(value)}
        className="flex-1"
      />
      <span className={cn(
        "font-metric text-xs w-8 text-right shrink-0",
        !isActive ? "text-muted-foreground" : value >= 80 ? "text-success" : value >= 50 ? "text-warning" : "text-destructive"
      )}>
        {isActive ? value : '--'}
      </span>
    </div>
  )
}

export function ScorePanel({ scores, feedback, isActive }: ScorePanelProps) {
  const overallColor = scores.overall >= 80 ? 'text-success' : scores.overall >= 50 ? 'text-warning' : 'text-destructive'

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">轴心评分</CardTitle>
          <div className="flex items-center gap-1.5">
            <span className={cn("font-metric font-bold text-2xl leading-none", isActive ? overallColor : "text-foreground/30")}>
              {isActive ? scores.overall : '--'}
            </span>
            <span className="text-xs text-muted-foreground">/100</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2.5">
        <ScoreRow label="稳定性" value={scores.stability} isActive={isActive} />
        <ScoreRow label="对称性" value={scores.symmetry} isActive={isActive} />
        <ScoreRow label="漂移控制" value={scores.drift} isActive={isActive} />
        <ScoreRow label="倾斜控制" value={scores.tilt} isActive={isActive} />

        {/* 建议反馈 */}
        {feedback.length > 0 && isActive && (
          <div className="pt-2 border-t border-border space-y-1.5">
            {feedback.map((tip, i) => (
              <p key={i} className="text-xs text-muted-foreground leading-relaxed">
                {tip}
              </p>
            ))}
          </div>
        )}

        {!isActive && (
          <p className="text-xs text-muted-foreground text-center py-1">
            开始旋转后显示实时评分
          </p>
        )}
      </CardContent>
    </Card>
  )
}
