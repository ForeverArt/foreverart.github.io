import { useState, useCallback } from 'react'
import { useCamera } from '@/hooks/useCamera'
import { usePose } from '@/hooks/usePose'
import { useSpinAnalysis } from '@/hooks/useSpinAnalysis'
import { CameraView } from '@/components/CameraView'
import { MetricsHUD } from '@/components/MetricsHUD'
import { ScorePanel } from '@/components/ScorePanel'
import { SettingsPanel } from '@/components/SettingsPanel'
import { DEFAULT_THRESHOLDS, type SpinThresholds } from '@/lib/spinAlgorithm'

export default function App() {
  const [enabled, setEnabled] = useState(false)
  const [thresholds, setThresholds] = useState<SpinThresholds>(DEFAULT_THRESHOLDS)

  const { videoRef, state: cameraState, startCamera, stopCamera, switchCamera } = useCamera()

  const poseState = usePose(videoRef, cameraState.isReady, enabled)

  const { metrics, scores, status, feedback, getHistory } = useSpinAnalysis(
    poseState.landmarks,
    poseState.fps,
    thresholds
  )

  const handleStart = useCallback(async () => {
    setEnabled(true)
    await startCamera('environment')
  }, [startCamera])

  const handleStop = useCallback(() => {
    setEnabled(false)
    stopCamera()
  }, [stopCamera])

  const handleThresholdChange = useCallback((partial: Partial<SpinThresholds>) => {
    setThresholds(prev => ({ ...prev, ...partial }))
  }, [])

  const isGood = status.level === 'good' || status.level === 'idle'

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* 顶部标题栏 */}
      <header className="border-b border-border px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-sm font-semibold tracking-tight">Spin Tracker</h1>
          <p className="text-[10px] text-muted-foreground">花样滑冰旋转轴心检测</p>
        </div>
        <a
          href="/figure-skating-spin-tracker/web/dist/../../../index.html"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          ← 返回
        </a>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* 摄像头视图 */}
        <CameraView
          videoRef={videoRef}
          isReady={cameraState.isReady}
          isLoading={poseState.isLoading}
          error={cameraState.error ?? poseState.error}
          landmarks={poseState.landmarks}
          getHistory={getHistory}
          isGood={isGood}
          statusText={status.text}
          statusLevel={status.level}
          fps={poseState.fps}
        />

        {/* 实时指标 HUD */}
        <MetricsHUD metrics={metrics} fps={poseState.fps} />

        {/* 评分面板 */}
        <ScorePanel
          scores={scores}
          feedback={feedback}
          isActive={metrics.isSpinning}
        />

        {/* 控制面板 */}
        <SettingsPanel
          isRunning={enabled && cameraState.isReady}
          thresholds={thresholds}
          onStart={handleStart}
          onStop={handleStop}
          onSwitchCamera={switchCamera}
          onThresholdChange={handleThresholdChange}
        />
      </main>
    </div>
  )
}
