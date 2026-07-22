import { useState, useCallback, useEffect, useRef } from 'react'
import { useCamera } from '@spin/hooks/useCamera'
import { usePose } from '@spin/hooks/usePose'
import { useSpinAnalysis } from '@spin/hooks/useSpinAnalysis'
import { CameraView } from '@spin/components/CameraView'
import { DEFAULT_THRESHOLDS, type SpinThresholds } from '@spin/lib/spinAlgorithm'
import { speechService, type SpeechEvent } from '@spin/lib/speechService'

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [enabled, setEnabled] = useState(false)
  const [thresholds, setThresholds] = useState<SpinThresholds>(DEFAULT_THRESHOLDS)
  const [speechEnabled, setSpeechEnabled] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const { videoRef, state: cameraState, startCamera, stopCamera, switchCamera } = useCamera()
  const poseState = usePose(videoRef, cameraState.isReady, enabled)
  const { metrics, scores, status, feedback, getHistory } = useSpinAnalysis(
    poseState.landmarks,
    poseState.fps,
    thresholds
  )

  // 全屏管理：用 localStorage 记录偏好，避免手动退出后被强制弹回
  const FS_KEY = 'spin-tracker-fullscreen'
  const fsPreferRef = useRef(localStorage.getItem(FS_KEY) !== 'false')
  const fsRestoringRef = useRef(false)

  const enterFullscreen = useCallback(() => {
    const el = containerRef.current
    if (!el || document.fullscreenElement) return
    el.requestFullscreen?.().catch(() => {})
  }, [])

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      fsPreferRef.current = false
      localStorage.setItem(FS_KEY, 'false')
      document.exitFullscreen?.().catch(() => {})
    } else {
      fsPreferRef.current = true
      localStorage.setItem(FS_KEY, 'true')
      enterFullscreen()
    }
  }, [enterFullscreen])

  // 首次进入：按偏好决定是否全屏（默认全屏）
  useEffect(() => {
    if (fsPreferRef.current) enterFullscreen()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 监听全屏变化，effect 只注册一次，通过 ref 访问最新的 enterFullscreen
  const enterFullscreenRef = useRef(enterFullscreen)
  useEffect(() => { enterFullscreenRef.current = enterFullscreen }, [enterFullscreen])

  useEffect(() => {
    const onFsChange = () => {
      const inFs = !!document.fullscreenElement
      setIsFullscreen(inFs)
      if (!inFs && fsPreferRef.current && !fsRestoringRef.current) {
        fsRestoringRef.current = true
        setTimeout(() => {
          fsRestoringRef.current = false
          if (fsPreferRef.current && !document.fullscreenElement) {
            enterFullscreenRef.current()
          }
        }, 300)
      }
    }
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 语音播报
  const prevStateRef = useRef({
    hasLandmarks: false,
    isSpinning: false,
    statusLevel: 'idle' as 'good' | 'warn' | 'bad' | 'idle',
    tiltAngle: 0,
    driftRange: 0,
  })

  useEffect(() => {
    if (!speechEnabled) return
    const prev = prevStateRef.current
    const hasLandmarks = poseState.landmarks !== null && poseState.landmarks.length > 0

    if (hasLandmarks && !prev.hasLandmarks) speechService.speak('tracking_acquired')
    else if (!hasLandmarks && prev.hasLandmarks) speechService.speak('tracking_lost')

    if (metrics.isSpinning && hasLandmarks) {
      const tilt = metrics.tiltAngle
      const drift = metrics.driftRange
      if (status.level === 'good' && prev.statusLevel !== 'good') speechService.speak('axis_stable')
      if (Math.abs(tilt) >= thresholds.maxTiltDeg) {
        const event: SpeechEvent = tilt > 0 ? 'tilt_right' : 'tilt_left'
        speechService.speak(event)
      }
      if (drift >= thresholds.maxDrift && prev.driftRange < thresholds.maxDrift) {
        speechService.speak('drift_detected')
      }
    }

    prevStateRef.current = {
      hasLandmarks,
      isSpinning: metrics.isSpinning,
      statusLevel: status.level,
      tiltAngle: metrics.tiltAngle,
      driftRange: metrics.driftRange,
    }
  }, [speechEnabled, poseState.landmarks, metrics.isSpinning, metrics.tiltAngle,
      metrics.driftRange, status.level, thresholds.maxTiltDeg, thresholds.maxDrift])

  const handleSpeechToggle = useCallback((v: boolean) => {
    setSpeechEnabled(v)
    speechService.setEnabled(v)
  }, [])

  const handleStart = useCallback(async () => {
    setEnabled(true)
    await startCamera(cameraState.facingMode)
  }, [startCamera, cameraState.facingMode])

  const handleStop = useCallback(() => {
    setEnabled(false)
    stopCamera()
    speechService.resetCooldowns()
    prevStateRef.current = { hasLandmarks: false, isSpinning: false, statusLevel: 'idle', tiltAngle: 0, driftRange: 0 }
  }, [stopCamera])

  const handleThresholdChange = useCallback((partial: Partial<SpinThresholds>) => {
    setThresholds(prev => ({ ...prev, ...partial }))
  }, [])

  const isGood = status.level === 'good' || status.level === 'idle'

  return (
    <div ref={containerRef} className="relative w-full h-screen overflow-hidden bg-black">
      {/* 全屏摄像头画面 */}
      <CameraView
        videoRef={videoRef}
        isReady={cameraState.isReady}
        isLoading={poseState.isLoading}
        loadingMessage={poseState.loadingMessage}
        downloadProgress={poseState.downloadProgress}
        error={cameraState.error ?? poseState.error}
        landmarks={poseState.landmarks}
        getHistory={getHistory}
        isGood={isGood}
        statusText={status.text}
        statusLevel={status.level}
        fps={poseState.fps}
        metrics={metrics}
        scores={scores}
        feedback={feedback}
        thresholds={thresholds}
        speechEnabled={speechEnabled}
        isRunning={enabled && cameraState.isReady}
        facingMode={cameraState.facingMode}
        isFullscreen={isFullscreen}
        onStart={handleStart}
        onStop={handleStop}
        onSwitchCamera={() => switchCamera(enabled && cameraState.isReady)}
        onThresholdChange={handleThresholdChange}
        onSpeechToggle={handleSpeechToggle}
        onToggleFullscreen={toggleFullscreen}
      />
    </div>
  )
}
