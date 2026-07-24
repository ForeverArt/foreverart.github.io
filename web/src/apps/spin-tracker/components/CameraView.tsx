import { useState } from 'react'
import { Loader2, CameraOff, Camera, CameraOff as StopIcon, FlipHorizontal,
         SlidersHorizontal, X, Volume2, VolumeX, RotateCcw, ArrowUpDown,
         Move, TrendingUp, Maximize, Minimize, Headphones } from 'lucide-react'
import { SkeletonOverlay } from './SkeletonOverlay'
import { Badge } from './ui/badge'
import { Progress } from './ui/progress'
import type { PoseLandmark } from '@/platforms/figure-skating/core'
import type { SpinMetrics } from '@spin/features'
import type { SpinScores, SpinThresholds } from '@spin/rules'

type Landmark = PoseLandmark
import type { DownloadProgress } from '@spin/hooks/usePose'
import { MEDIAPIPE_TOTAL_BYTES } from '@spin/hooks/usePose'
import { cn } from '@spin/lib/utils'

interface CameraViewProps {
  videoRef: React.RefObject<HTMLVideoElement>
  isReady: boolean
  isLoading: boolean
  loadingMessage: string
  downloadProgress: DownloadProgress | null
  error: string | null
  landmarks: Landmark[] | null
  getHistory: () => Landmark[][]
  isGood: boolean
  statusText: string
  statusLevel: 'good' | 'warn' | 'bad' | 'idle'
  fps: number
  metrics: SpinMetrics
  scores: SpinScores
  feedback: string[]
  thresholds: SpinThresholds
  speechEnabled: boolean
  isRunning: boolean
  facingMode: 'environment' | 'user'
  isFullscreen: boolean
  onStart: () => void
  onStop: () => void
  onSwitchCamera: () => void
  onThresholdChange: (t: Partial<SpinThresholds>) => void
  onSpeechToggle: (enabled: boolean) => void
  onToggleFullscreen: () => void
}

function fmt(b: number) {
  if (b >= 1_000_000) return `${(b / 1_000_000).toFixed(1)} MB`
  if (b >= 1_000) return `${(b / 1_000).toFixed(0)} KB`
  return `${b} B`
}

function scoreColor(v: number) {
  if (v >= 80) return 'bg-success'
  if (v >= 50) return 'bg-warning'
  return 'bg-destructive'
}

export function CameraView({
  videoRef, isReady, isLoading, loadingMessage, downloadProgress,
  error, landmarks, getHistory, isGood, statusText, statusLevel, fps,
  metrics, scores, feedback, thresholds, speechEnabled, isRunning, facingMode,
  isFullscreen, onStart, onStop, onSwitchCamera, onThresholdChange, onSpeechToggle,
  onToggleFullscreen,
}: CameraViewProps) {
  const [showSettings, setShowSettings] = useState(false)
  const [showScore, setShowScore] = useState(false)

  const active = metrics.isSpinning
  const wobbleGood = metrics.tiltWobble < thresholds.maxWobbleDeg
  const driftGood = metrics.driftRange < thresholds.maxDrift
  const rpmGood = metrics.rpm >= thresholds.minRPM
  const symGood = metrics.armSymmetry > 0.7
  // 耳机按键控制依赖 Media Session API
  const headsetSupported = typeof navigator !== 'undefined' && 'mediaSession' in navigator
  const overallColor = scores.overall >= 80 ? 'text-success' : scores.overall >= 50 ? 'text-warning' : 'text-destructive'

  return (
    <div className="relative w-full h-full bg-black">
      {/* 全屏摄像头视频 */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        playsInline muted autoPlay
      />

      {/* 骨骼叠加层 */}
      {landmarks && (
        <SkeletonOverlay
          landmarks={landmarks}
          getHistory={getHistory}
          isGood={isGood}
        />
      )}

      {/* 扫描线效果 */}
      {isReady && !isLoading && (
        <div className="absolute inset-0 pointer-events-none scan-overlay" />
      )}

      {/* ── 左上角：录制状态 + 状态 Badge ── */}
      <div className="absolute top-3 left-3 z-10 flex flex-col items-start gap-1.5 pointer-events-none">
        <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-full px-2.5 py-1">
          <div className={`w-2 h-2 rounded-full ${isReady ? 'bg-red-500 animate-pulse' : 'bg-muted'}`} />
          <span className="text-xs font-metric text-white/80">{isReady ? 'LIVE' : 'OFF'}</span>
        </div>
        <Badge
          variant={statusLevel}
          className={`text-xs font-metric ${statusLevel === 'good' ? 'status-pulse-good' : statusLevel === 'warn' ? 'status-pulse-warn' : ''}`}
        >
          {statusText}
        </Badge>
      </div>

      {/* ── 右上角：FPS + 全屏按钮 ── */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
        <div className="bg-black/60 backdrop-blur-sm rounded-full px-2.5 py-1 pointer-events-none">
          <span className="text-xs font-metric text-white/60">{fps > 0 ? `${fps}fps` : '--'}</span>
        </div>
        <button
          onClick={onToggleFullscreen}
          className="bg-black/60 hover:bg-black/80 backdrop-blur-sm rounded-full p-1.5 text-white/60 hover:text-white/90 transition-colors"
          title={isFullscreen ? '退出全屏' : '进入全屏'}
        >
          {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* ── 左侧：实时指标 HUD（竖排）── */}
      {isReady && (
        <div className="absolute left-3 top-1/2 z-10 -translate-y-1/2 flex flex-col gap-2 pointer-events-none">
          {[
            { icon: <RotateCcw className="w-3.5 h-3.5" />, label: '转速', value: active ? metrics.rpm.toString() : '--', unit: 'rpm', good: rpmGood },
            { icon: <ArrowUpDown className="w-3.5 h-3.5" />, label: '晃动', value: active ? metrics.tiltWobble.toFixed(1) : '--', unit: '°', good: wobbleGood },
            { icon: <Move className="w-3.5 h-3.5" />, label: '漂移', value: active ? (metrics.driftRange * 100).toFixed(1) : '--', unit: '%', good: driftGood },
            { icon: <TrendingUp className="w-3.5 h-3.5" />, label: '对称', value: active ? Math.round(metrics.armSymmetry * 100).toString() : '--', unit: '%', good: symGood },
          ].map(m => (
            <div key={m.label} className={cn(
              "flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg backdrop-blur-sm border transition-colors min-w-[52px]",
              active
                ? m.good ? "border-success/40 bg-black/50" : "border-warning/40 bg-black/50"
                : "border-white/10 bg-black/40"
            )}>
              <div className={cn("text-muted-foreground", active && (m.good ? "text-success" : "text-warning"))}>
                {m.icon}
              </div>
              <span className={cn(
                "font-metric font-bold text-base leading-none",
                active ? (m.good ? "text-success" : "text-warning") : "text-white/30"
              )}>
                {m.value}
              </span>
              <span className="text-[9px] text-white/40">{m.unit}</span>
              <span className="text-[9px] text-white/50">{m.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── 右侧：评分面板（可展开）── */}
      {isReady && (
        <div className="absolute right-3 top-1/2 z-10 -translate-y-1/2 flex flex-col items-end gap-2">
          {/* 总分按钮 */}
          <button
            onClick={() => setShowScore(s => !s)}
            className={cn(
              "flex flex-col items-center px-2.5 py-2 rounded-xl backdrop-blur-sm border transition-all",
              "bg-black/60 hover:bg-black/80",
              active ? (scores.overall >= 80 ? "border-success/50" : scores.overall >= 50 ? "border-warning/50" : "border-destructive/50")
                     : "border-white/15"
            )}
          >
            <span className="text-[9px] text-white/50 mb-0.5">评分</span>
            <span className={cn("font-metric font-bold text-xl leading-none", active ? overallColor : "text-white/25")}>
              {active ? scores.overall : '--'}
            </span>
          </button>

          {/* 展开详情 */}
          {showScore && (
            <div className="bg-black/75 backdrop-blur-sm border border-white/15 rounded-xl p-3 w-40 space-y-2">
              {[
                { label: '稳定性', value: scores.stability },
                { label: '对称性', value: scores.symmetry },
                { label: '漂移', value: scores.drift },
                { label: '晃动', value: scores.tilt },
              ].map(row => (
                <div key={row.label} className="flex items-center gap-2">
                  <span className="text-[10px] text-white/50 w-10 shrink-0">{row.label}</span>
                  <Progress value={active ? row.value : 0} colorClass={scoreColor(row.value)} className="flex-1 h-1" />
                  <span className={cn("font-metric text-[10px] w-6 text-right shrink-0",
                    !active ? "text-white/30" : row.value >= 80 ? "text-success" : row.value >= 50 ? "text-warning" : "text-destructive"
                  )}>
                    {active ? row.value : '--'}
                  </span>
                </div>
              ))}

              {/* 反馈 */}
              {feedback.length > 0 && active && (
                <div className="pt-2 border-t border-white/10 space-y-1">
                  {feedback.map((tip, i) => (
                    <p key={i} className="text-[10px] text-white/60 leading-relaxed">{tip}</p>
                  ))}
                </div>
              )}
              {!active && (
                <p className="text-[10px] text-white/40 text-center">旋转后显示评分</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── 底部控制区 ── */}
      <div className="absolute bottom-0 left-0 right-0 z-10 px-4 pb-safe-4 pb-4">
        {/* 参数设置面板（向上展开）*/}
        {showSettings && (
          <div className="mb-3 bg-black/80 backdrop-blur-sm border border-white/15 rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-white/70 uppercase tracking-wider">检测阈值</span>
              <button onClick={() => setShowSettings(false)} className="text-white/40 hover:text-white/80">
                <X className="w-4 h-4" />
              </button>
            </div>

            <SliderRow label="最大晃动角" value={thresholds.maxWobbleDeg} min={1} max={15} step={0.5} unit="°"
              onChange={v => onThresholdChange({ maxWobbleDeg: v })} />
            <SliderRow label="最大漂移" value={Math.round(thresholds.maxDrift * 100)} min={1} max={20} step={1} unit="%"
              onChange={v => onThresholdChange({ maxDrift: v / 100 })} />
            <SliderRow label="最低转速" value={thresholds.minRPM} min={30} max={200} step={10} unit="rpm"
              onChange={v => onThresholdChange({ minRPM: v })} />

            {/* 语音 */}
            <div className="pt-1 border-t border-white/10">
              <div
                className={cn(
                  "flex items-center justify-between rounded-lg border px-3 py-2 cursor-pointer transition-colors",
                  speechEnabled ? "border-primary/40 bg-primary/10" : "border-white/10"
                )}
                onClick={() => onSpeechToggle(!speechEnabled)}
              >
                <div className="flex items-center gap-2">
                  {speechEnabled ? <Volume2 className="w-4 h-4 text-primary" /> : <VolumeX className="w-4 h-4 text-white/40" />}
                  <span className="text-xs text-white/70">语音播报</span>
                </div>
                <div className={cn("w-9 h-5 rounded-full transition-colors relative", speechEnabled ? "bg-primary" : "bg-white/20")}>
                  <div className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform",
                    speechEnabled ? "translate-x-4" : "translate-x-0.5")} />
                </div>
              </div>
            </div>

            {/* 使用提示 */}
            <div className="pt-1 border-t border-white/10 space-y-1">
              <p className="text-[11px] text-white/40">📍 将手机固定于侧面 45°，全身可见</p>
              <p className="text-[11px] text-white/40">💡 需 HTTPS 才能使用摄像头</p>
              {headsetSupported && (
                <p className="text-[11px] text-white/40">🎧 连接耳机后，单击耳机按键即可开始/结束检测</p>
              )}
            </div>
          </div>
        )}

        {/* 主按钮行 */}
        <div className="flex items-center gap-2">
          {/* 开始/停止 */}
          <button
            onClick={isRunning ? onStop : onStart}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-medium text-sm transition-all",
              isRunning
                ? "bg-destructive/90 hover:bg-destructive text-white"
                : "bg-primary/90 hover:bg-primary text-primary-foreground"
            )}
          >
            {isRunning
              ? <><StopIcon className="w-4 h-4" /> 停止检测</>
              : <><Camera className="w-4 h-4" /> 开始检测</>
            }
          </button>

          {/* 切换摄像头 - 始终显示 */}
          <button onClick={onSwitchCamera}
            className={cn(
              "p-3 rounded-2xl backdrop-blur-sm border transition-colors flex flex-col items-center gap-0.5",
              facingMode === 'user'
                ? "bg-primary/20 border-primary/40 text-primary"
                : "bg-white/10 hover:bg-white/20 border-white/10 text-white/60"
            )}
            title={facingMode === 'user' ? '切换到后置摄像头' : '切换到前置摄像头'}>
            <FlipHorizontal className="w-5 h-5" />
            <span className="text-[9px] leading-none">{facingMode === 'user' ? '前置' : '后置'}</span>
          </button>

          {/* 语音快捷 */}
          <button
            onClick={() => onSpeechToggle(!speechEnabled)}
            className={cn(
              "p-3 rounded-2xl backdrop-blur-sm border transition-colors",
              speechEnabled
                ? "bg-primary/20 border-primary/40 text-primary"
                : "bg-white/10 hover:bg-white/20 border-white/10 text-white/60"
            )}
            title={speechEnabled ? '关闭语音' : '开启语音'}
          >
            {speechEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>

          {/* 设置 */}
          <button
            onClick={() => setShowSettings(s => !s)}
            className={cn(
              "p-3 rounded-2xl backdrop-blur-sm border transition-colors",
              showSettings
                ? "bg-white/20 border-white/30 text-white"
                : "bg-white/10 hover:bg-white/20 border-white/10 text-white/60"
            )}
            title="检测参数"
          >
            <SlidersHorizontal className="w-5 h-5" />
          </button>
        </div>

        {/* 耳机控制提示 */}
        {headsetSupported && (
          <div className="mt-2 flex items-center justify-center gap-1.5 pointer-events-none">
            <Headphones className="w-3 h-3 text-white/40" />
            <span className="text-[10px] text-white/40">
              耳机单击{isRunning ? '结束' : '开始'}检测
            </span>
          </div>
        )}
      </div>

      {/* 十字准星 */}
      {isReady && !landmarks && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 border-2 border-primary/50 rounded-full animate-pulse" />
            <div className="absolute top-1/2 left-0 right-0 h-px bg-primary/40 -translate-y-1/2" />
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-primary/40 -translate-x-1/2" />
          </div>
        </div>
      )}

      {/* ── 加载中遮罩（含进度）── */}
      {isLoading && (
        <div className="absolute inset-0 z-[5] flex flex-col items-center justify-center bg-black/80 gap-4 p-6">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <div className="text-center space-y-1">
            <p className="text-sm text-white/80">{loadingMessage || '加载中...'}</p>
            <div className="w-64 space-y-1.5">
              {downloadProgress ? (
                <>
                  <p className="text-xs text-white/50 font-metric truncate">{downloadProgress.file}</p>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-150"
                      style={{
                        width: downloadProgress.total > 0
                          ? `${Math.min(100, (downloadProgress.loaded / downloadProgress.total) * 100)}%`
                          : '0%'
                      }}
                    />
                  </div>
                  <p className="text-xs text-white/40 font-metric">
                    {fmt(downloadProgress.loaded)}
                    {downloadProgress.total > 0 && ` / ${fmt(downloadProgress.total)}`}
                    {downloadProgress.total > 0 && (
                      <span className="ml-1.5 text-primary">
                        {Math.round((downloadProgress.loaded / downloadProgress.total) * 100)}%
                      </span>
                    )}
                  </p>
                </>
              ) : (
                <p className="text-xs text-white/40 font-metric text-center">
                  模型大小约 {fmt(MEDIAPIPE_TOTAL_BYTES)}，首次加载需等待
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 错误遮罩 */}
      {error && (
        <div className="absolute inset-0 z-[5] flex flex-col items-center justify-center bg-black/85 gap-4 p-6">
          <CameraOff className="w-12 h-12 text-destructive" />
          <p className="text-sm text-destructive text-center">{error}</p>
          <p className="text-xs text-white/40 text-center">请确保已授权摄像头权限，并使用 HTTPS 访问</p>
        </div>
      )}

      {/* 未开始提示 */}
      {!isReady && !error && !isLoading && (
        <div className="absolute inset-0 z-[5] flex flex-col items-center justify-center bg-black/90 gap-5 pointer-events-none">
          <div className="w-20 h-20 rounded-full border-2 border-dashed border-primary/40 flex items-center justify-center">
            <div className="w-10 h-10 rounded-full border border-primary/60" />
          </div>
          <div className="text-center">
            <p className="text-base font-medium text-white/80">花样滑冰旋转轴心检测</p>
            <p className="text-xs text-white/40 mt-1.5">点击下方"开始检测"启动摄像头</p>
          </div>
          <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-success shrink-0" />
            <p className="text-[11px] text-white/40">纯本地运行，摄像头画面不会上传至网络</p>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── SliderRow ── */
interface SliderRowProps {
  label: string; value: number; min: number; max: number; step: number; unit: string
  onChange: (v: number) => void
}

function SliderRow({ label, value, min, max, step, unit, onChange }: SliderRowProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/70">{label}</span>
        <span className="font-metric text-xs text-primary">{value}{unit}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className={cn(
          "w-full h-1.5 rounded-full appearance-none cursor-pointer bg-white/20",
          "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4",
          "[&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full",
          "[&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer"
        )}
        style={{ accentColor: 'hsl(var(--primary))' }}
      />
    </div>
  )
}
