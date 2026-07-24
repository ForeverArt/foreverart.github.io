import { useCallback } from 'react'
import { cn } from '@spin/lib/utils'
import type { ZoomState } from '@spin/hooks/useCamera'

interface ZoomControlProps {
  zoom: ZoomState
  onZoomChange: (value: number) => void
}

/** 固定档位标签生成：广角(min)、1x、2x —— 只保留设备能力范围内的档位 */
function buildPresets(zoom: ZoomState): { label: string; value: number }[] {
  const presets: { label: string; value: number }[] = []

  // 广角端：min < 1 时显示实际倍率（如 0.5x/0.6x），否则与 1x 合并
  if (zoom.min < 0.95) {
    presets.push({ label: `${trimNum(zoom.min)}x`, value: zoom.min })
  }
  // 1x：设备范围包含 1 才显示
  if (zoom.min <= 1 && zoom.max >= 1) {
    presets.push({ label: '1x', value: 1 })
  }
  // 2x：设备支持到 2x 才显示
  if (zoom.max >= 2) {
    presets.push({ label: '2x', value: 2 })
  }
  return presets
}

function trimNum(v: number): string {
  return Number(v.toFixed(1)).toString()
}

/** 判断当前值是否命中某档位（考虑 step 精度） */
function isActive(current: number, preset: number, step: number): boolean {
  return Math.abs(current - preset) < Math.max(step, 0.05)
}

export function ZoomControl({ zoom, onZoomChange }: ZoomControlProps) {
  const presets = buildPresets(zoom)

  const handleSlider = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => onZoomChange(Number(e.target.value)),
    [onZoomChange]
  )

  return (
    <div className="flex items-center gap-2.5 px-3 py-2 rounded-2xl bg-black/60 backdrop-blur-sm border border-white/10 pointer-events-auto">
      {/* 固定档位 */}
      <div className="flex items-center gap-1">
        {presets.map(p => (
          <button
            key={p.label}
            onClick={() => onZoomChange(p.value)}
            className={cn(
              "px-2 py-1 rounded-lg text-[11px] font-metric transition-colors",
              isActive(zoom.current, p.value, zoom.step)
                ? "bg-primary/30 text-primary border border-primary/40"
                : "text-white/60 hover:text-white/90 hover:bg-white/10 border border-transparent"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* 连续滑块 */}
      <input
        type="range"
        min={zoom.min}
        max={zoom.max}
        step={zoom.step}
        value={zoom.current}
        onChange={handleSlider}
        aria-label="变焦"
        className={cn(
          "w-24 h-1 rounded-full appearance-none cursor-pointer bg-white/20",
          "[&::-webkit-slider-thumb]:appearance-none",
          "[&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5",
          "[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white",
          "[&::-webkit-slider-thumb]:cursor-pointer"
        )}
      />

      {/* 当前倍率 */}
      <span className="text-[10px] font-metric text-white/60 w-7 text-right">
        {trimNum(zoom.current)}x
      </span>
    </div>
  )
}
