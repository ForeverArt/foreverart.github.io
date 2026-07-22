import { useState, useCallback, useEffect, useRef } from 'react'
import { useCamera } from '@spin/hooks/useCamera'
import { usePose } from '@spin/hooks/usePose'
import { useSpinAnalysis } from '@spin/hooks/useSpinAnalysis'
import { CameraView } from '@spin/components/CameraView'
import { MetricsHUD } from '@spin/components/MetricsHUD'
import { ScorePanel } from '@spin/components/ScorePanel'
import { SettingsPanel } from '@spin/components/SettingsPanel'
import { DEFAULT_THRESHOLDS, type SpinThresholds } from '@spin/lib/spinAlgorithm'
import { speechService, type SpeechEvent } from '@spin/lib/speechService'

export default function App() {
  const [enabled, setEnabled] = useState(false)
  const [thresholds, setThresholds] = useState<SpinThresholds>(DEFAULT_THRESHOLDS)
  const [speechEnabled, setSpeechEnabled] = useState(false)

  const { videoRef, state: cameraState, startCamera, stopCamera, switchCamera } = useCamera()

  const poseState = usePose(videoRef, cameraState.isReady, enabled)

  const { metrics, scores, status, feedback, getHistory } = useSpinAnalysis(
    poseState.landmarks,
    poseState.fps,
    thresholds
  )

  // 用于追踪上一帧状态，以便检测状态变化触发语音
  const prevStateRef = useRef({
    hasLandmarks: false,
    isSpinning: false,
    statusLevel: 'idle' as 'good' | 'warn' | 'bad' | 'idle',
    tiltAngle: 0,
    driftRange: 0,
  })

  // 语音播报逻辑：监听状态变化
  useEffect(() => {
    if (!speechEnabled) return

    const prev = prevStateRef.current
    const hasLandmarks = poseState.landmarks !== null && poseState.landmarks.length > 0

    // 1. 追踪/丢失目标
    if (hasLandmarks && !prev.hasLandmarks) {
      speechService.speak('tracking_acquired')
    } else if (!hasLandmarks && prev.hasLandmarks) {
      speechService.speak('tracking_lost')
    }

    // 2. 旋转中轴心状态播报（只在旋转中有效）
    if (metrics.isSpinning && hasLandmarks) {
      const tilt = metrics.tiltAngle
      const drift = metrics.driftRange

      // 轴心稳定（从不稳定变为稳定）
      if (status.level === 'good' && prev.statusLevel !== 'good') {
        speechService.speak('axis_stable')
      }

      // 倾斜方向播报（超过阈值时）
      if (Math.abs(tilt) >= thresholds.maxTiltDeg) {
        // 花样滑冰视角：摄像头在侧面
        // gamma（横滚）> 0 = 右倾，< 0 = 左倾
        // beta（俯仰）> 0 = 前倾，< 0 = 后倾
        // 这里用脊柱tiltAngle：正 = 右侧，负 = 左侧
        const event: SpeechEvent = tilt > 0 ? 'tilt_right' : 'tilt_left'
        speechService.speak(event)
      }

      // 漂移检测
      if (drift >= thresholds.maxDrift && prev.driftRange < thresholds.maxDrift) {
        speechService.speak('drift_detected')
      }
    }

    // 更新上一帧状态
    prevStateRef.current = {
      hasLandmarks,
      isSpinning: metrics.isSpinning,
      statusLevel: status.level,
      tiltAngle: metrics.tiltAngle,
      driftRange: metrics.driftRange,
    }
  }, [
    speechEnabled,
    poseState.landmarks,
    metrics.isSpinning,
    metrics.tiltAngle,
    metrics.driftRange,
    status.level,
    thresholds.maxTiltDeg,
    thresholds.maxDrift,
  ])

  const handleSpeechToggle = useCallback((enabled: boolean) => {
    setSpeechEnabled(enabled)
    speechService.setEnabled(enabled)
  }, [])

  const handleStart = useCallback(async () => {
    setEnabled(true)
    await startCamera('environment')
  }, [startCamera])

  const handleStop = useCallback(() => {
    setEnabled(false)
    stopCamera()
    speechService.resetCooldowns()
    prevStateRef.current = {
      hasLandmarks: false,
      isSpinning: false,
      statusLevel: 'idle',
      tiltAngle: 0,
      driftRange: 0,
    }
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
          <p className="text-[10px] text-muted-foreground">
            花样滑冰旋转轴心检测
            <span className="ml-1.5 font-metric opacity-50">
              {new Date(__BUILD_TIME__).toLocaleString('zh-CN', {
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit', hour12: false,
              })}
            </span>
          </p>
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
          speechEnabled={speechEnabled}
          onStart={handleStart}
          onStop={handleStop}
          onSwitchCamera={switchCamera}
          onThresholdChange={handleThresholdChange}
          onSpeechToggle={handleSpeechToggle}
        />
      </main>
    </div>
  )
}
