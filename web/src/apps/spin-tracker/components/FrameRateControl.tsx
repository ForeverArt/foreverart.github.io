import type { FrameRateState } from '@spin/hooks/useCamera'
import { cn } from '@spin/lib/utils'

interface FrameRateControlProps {
  frameRate: FrameRateState
  onFrameRateChange: (value: number) => void
}

/** 根据设备上限生成可选档位：始终包含 30，≥60 加 60，≥120 加 120 */
function buildPresets(max: number): number[] {
  const presets = [30]
  if (max >= 60) presets.push(60)
  if (max >= 120) presets.push(120)
  return presets
}

export function FrameRateControl({ frameRate, onFrameRateChange }: FrameRateControlProps) {
  const presets = buildPresets(frameRate.max)

  return (
    <div className="flex items-center gap-1 px-2.5 py-2 rounded-2xl bg-black/60 backdrop-blur-sm border border-white/10 pointer-events-auto">
      {presets.map(v => (
        <button
          key={v}
          onClick={() => onFrameRateChange(v)}
          className={cn(
            "px-2 py-1 rounded-lg text-[11px] font-metric transition-colors",
            Math.abs(frameRate.current - v) < 1
              ? "bg-primary/30 text-primary border border-primary/40"
              : "text-white/60 hover:text-white/90 hover:bg-white/10 border border-transparent"
          )}
        >
          {v}fps
        </button>
      ))}
    </div>
  )
}
