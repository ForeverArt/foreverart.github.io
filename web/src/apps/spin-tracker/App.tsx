import { useState, useCallback, useEffect, useRef } from 'react'
import { useCamera } from '@spin/hooks/useCamera'
import { usePose } from '@spin/hooks/usePose'
import { useSpinAnalysis } from '@spin/hooks/useSpinAnalysis'
import { CameraView } from '@spin/components/CameraView'
import {
  DEFAULT_THRESHOLDS,
  isQualityGood,
  type SpinThresholds,
} from '@spin/rules'
import { speechService } from '@spin/lib/speechService'
import { playStartBeep, playStopBeep } from '@spin/lib/beepService'
import { setupHeadsetControl } from '@spin/lib/headsetControl'

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [enabled, setEnabled] = useState(false)
  const [thresholds, setThresholds] = useState<SpinThresholds>(DEFAULT_THRESHOLDS)
  const [speechEnabled, setSpeechEnabled] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const { videoRef, state: cameraState, zoom, setZoom, startCamera, stopCamera, switchCamera } = useCamera()
  const poseState = usePose(videoRef, cameraState.isReady, enabled)
  const { metrics, scores, status, feedback, speechEvents, getHistory } = useSpinAnalysis(
    poseState.landmarks,
    poseState.fps,
    thresholds
  )

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

  useEffect(() => {
    if (fsPreferRef.current) enterFullscreen()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
  }, [])

  useEffect(() => {
    speechService.setEnabled(true)
  }, [])

  useEffect(() => {
    if (!speechEnabled) return
    for (const event of speechEvents) {
      // Realtime coach MVP: Axis / Speed / Travel (+ tracking)
      if (
        event === 'axis_stable'
        || event === 'axis_wobble'
        || event === 'drift_detected'
        || event === 'speed_drop'
        || event === 'tracking_acquired'
        || event === 'tracking_lost'
      ) {
        speechService.speak(event)
      }
    }
  }, [speechEnabled, speechEvents])

  const handleSpeechToggle = useCallback((v: boolean) => {
    setSpeechEnabled(v)
    speechService.setEnabled(v)
  }, [])

  const handleStart = useCallback(async () => {
    playStartBeep()
    speechService.speak('detection_started')
    setEnabled(true)
    await startCamera(cameraState.facingMode)
  }, [startCamera, cameraState.facingMode])

  const handleStop = useCallback(() => {
    playStopBeep()
    setEnabled(false)
    stopCamera()
    speechService.resetCooldowns()
    speechService.speak('detection_stopped')
  }, [stopCamera])

  const headsetRef = useRef({ onStart: handleStart, onStop: handleStop, isRunning: false })
  useEffect(() => {
    headsetRef.current = { onStart: handleStart, onStop: handleStop, isRunning: enabled && cameraState.isReady }
  }, [handleStart, handleStop, enabled, cameraState.isReady])

  useEffect(() => {
    return setupHeadsetControl({
      onStart: () => { void headsetRef.current.onStart() },
      onStop: () => headsetRef.current.onStop(),
      isRunning: () => headsetRef.current.isRunning,
    })
  }, [])

  const handleThresholdChange = useCallback((partial: Partial<SpinThresholds>) => {
    setThresholds(prev => ({ ...prev, ...partial }))
  }, [])

  const isGood = isQualityGood(status.level)

  return (
    <div ref={containerRef} className="relative w-full h-screen overflow-hidden bg-black">
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
        zoom={zoom}
        onStart={handleStart}
        onStop={handleStop}
        onSwitchCamera={() => switchCamera(enabled && cameraState.isReady)}
        onThresholdChange={handleThresholdChange}
        onSpeechToggle={handleSpeechToggle}
        onToggleFullscreen={toggleFullscreen}
        onZoomChange={setZoom}
      />
    </div>
  )
}
