import { Camera, CameraOff, FlipHorizontal, SlidersHorizontal, X, Volume2, VolumeX } from 'lucide-react'
import { Button } from './ui/button'
import { useState } from 'react'
import type { SpinThresholds } from '@/lib/spinAlgorithm'
import { cn } from '@/lib/utils'

interface SettingsPanelProps {
  isRunning: boolean
  thresholds: SpinThresholds
  speechEnabled: boolean
  onStart: () => void
  onStop: () => void
  onSwitchCamera: () => void
  onThresholdChange: (t: Partial<SpinThresholds>) => void
  onSpeechToggle: (enabled: boolean) => void
}

export function SettingsPanel({
  isRunning,
  thresholds,
  speechEnabled,
  onStart,
  onStop,
  onSwitchCamera,
  onThresholdChange,
  onSpeechToggle,
}: SettingsPanelProps) {
  const [showSettings, setShowSettings] = useState(false)

  return (
    <div className="space-y-2">
      {/* 主控按钮行 */}
      <div className="flex gap-2">
        <Button
          variant={isRunning ? "destructive" : "default"}
          className="flex-1 gap-2"
          onClick={isRunning ? onStop : onStart}
        >
          {isRunning ? (
            <><CameraOff className="w-4 h-4" /> 停止检测</>
          ) : (
            <><Camera className="w-4 h-4" /> 开始检测</>
          )}
        </Button>

        {isRunning && (
          <Button variant="outline" size="icon" onClick={onSwitchCamera} title="切换摄像头">
            <FlipHorizontal className="w-4 h-4" />
          </Button>
        )}

        {/* 声音开关 */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => onSpeechToggle(!speechEnabled)}
          title={speechEnabled ? '关闭语音播报' : '开启语音播报'}
          className={cn(speechEnabled && "border-primary text-primary")}
        >
          {speechEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </Button>

        <Button
          variant="outline"
          size="icon"
          onClick={() => setShowSettings(s => !s)}
          title="检测参数"
        >
          {showSettings ? <X className="w-4 h-4" /> : <SlidersHorizontal className="w-4 h-4" />}
        </Button>
      </div>

      {/* 参数设置面板 */}
      {showSettings && (
        <div className="rounded-lg border border-border bg-card p-4 space-y-4">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">检测阈值</h3>

          <SliderRow
            label="最大倾斜角"
            value={thresholds.maxTiltDeg}
            min={1} max={15} step={0.5}
            unit="°"
            onChange={v => onThresholdChange({ maxTiltDeg: v })}
          />

          <SliderRow
            label="最大漂移"
            value={Math.round(thresholds.maxDrift * 100)}
            min={1} max={20} step={1}
            unit="%"
            onChange={v => onThresholdChange({ maxDrift: v / 100 })}
          />

          <SliderRow
            label="最低转速"
            value={thresholds.minRPM}
            min={30} max={200} step={10}
            unit="rpm"
            onChange={v => onThresholdChange({ minRPM: v })}
          />

          {/* 声音设置说明 */}
          <div className="pt-1 border-t border-border">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">语音播报</h3>
            <div
              className={cn(
                "flex items-center justify-between rounded-md border px-3 py-2 cursor-pointer transition-colors",
                speechEnabled ? "border-primary/40 bg-primary/5" : "border-border"
              )}
              onClick={() => onSpeechToggle(!speechEnabled)}
            >
              <div className="flex items-center gap-2">
                {speechEnabled
                  ? <Volume2 className="w-4 h-4 text-primary" />
                  : <VolumeX className="w-4 h-4 text-muted-foreground" />
                }
                <span className="text-xs">语音播报</span>
              </div>
              {/* Toggle 开关 */}
              <div className={cn(
                "w-9 h-5 rounded-full transition-colors relative",
                speechEnabled ? "bg-primary" : "bg-muted"
              )}>
                <div className={cn(
                  "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform",
                  speechEnabled ? "translate-x-4" : "translate-x-0.5"
                )} />
              </div>
            </div>
            {speechEnabled && (
              <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed">
                播报内容：追踪到目标、目标丢失、轴心稳定、轴心偏左/右/前/后、旋转中心漂移
              </p>
            )}
          </div>
        </div>
      )}

      {/* 使用说明 */}
      <div className="text-xs text-muted-foreground space-y-1 pt-1">
        <p>📍 将手机固定于侧面45°，全身可见为佳</p>
        <p>💡 需要 HTTPS 访问才能使用摄像头</p>
      </div>
    </div>
  )
}

interface SliderRowProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit: string
  onChange: (v: number) => void
}

function SliderRow({ label, value, min, max, step, unit, onChange }: SliderRowProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-foreground/80">{label}</span>
        <span className="font-metric text-xs text-primary">{value}{unit}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className={cn(
          "w-full h-1.5 rounded-full appearance-none cursor-pointer",
          "bg-muted [&::-webkit-slider-thumb]:appearance-none",
          "[&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5",
          "[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary",
          "[&::-webkit-slider-thumb]:cursor-pointer"
        )}
        style={{ accentColor: 'hsl(var(--primary))' }}
      />
    </div>
  )
}
