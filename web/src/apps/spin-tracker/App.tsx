import { useState, useCallback, useEffect, useRef } from 'react'
import { useCamera } from '@spin/hooks/useCamera'
import { useRecording, getVideoExtension } from '@spin/hooks/useRecording'
import { usePose } from '@spin/hooks/usePose'
import { useSpinAnalysis } from '@spin/hooks/useSpinAnalysis'
import { CameraView } from '@spin/components/CameraView'
import { SavePrompt } from '@spin/components/SavePrompt'
import {
  DEFAULT_THRESHOLDS,
  isQualityGood,
  type SpinThresholds,
} from '@spin/rules'
import { speechService } from '@spin/lib/speechService'
import { playStartBeep, playStopBeep } from '@spin/lib/beepService'
import { setupHeadsetControl, type HeadsetMode } from '@spin/lib/headsetControl'
import { saveVideoToCameraRoll } from '@spin/lib/videoSave'

function formatTimestamp(): string {
  const d = new Date()
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
}

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [enabled, setEnabled] = useState(false)
  const [thresholds, setThresholds] = useState<SpinThresholds>(DEFAULT_THRESHOLDS)
  const [speechEnabled, setSpeechEnabled] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const { videoRef, streamRef, state: cameraState, zoom, setZoom, frameRate, setFrameRate, startCamera, stopCamera, switchCamera } = useCamera()
  const recording = useRecording()
  const poseState = usePose(videoRef, cameraState.isReady, enabled)
  const { metrics, scores, status, feedback, speechEvents, getHistory } = useSpinAnalysis(
    poseState.landmarks,
    poseState.fps,
    thresholds
  )

  // 录制保存相关状态
  const [savePrompt, setSavePrompt] = useState<{ blob: Blob; filename: string } | null>(null)
  const [isStopping, setIsStopping] = useState(false)
  const [isSavingVideo, setIsSavingVideo] = useState(false)
  const isSavingRef = useRef(false)

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
    // 摄像头就绪后开始录制
    if (recording.isSupported && streamRef.current) {
      recording.startRecording(streamRef.current)
    }
  }, [startCamera, cameraState.facingMode, recording])

  const handleStop = useCallback(async () => {
    setIsStopping(true)
    playStopBeep()
    setEnabled(false)

    // 停止录制并等待最终 Blob（onstop 触发时 resolve）
    const blob = recording.isSupported
      ? await recording.stopRecording()
      : null

    setIsStopping(false)

    if (blob) {
      // 录制成功 — 显示保存弹窗，保持摄像头运行
      speechService.resetCooldowns()
      speechService.speak('save_prompt')
      const ext = getVideoExtension(blob.type)
      setSavePrompt({ blob, filename: `spin-${formatTimestamp()}.${ext}` })
    } else {
      // 录制不支持或失败 — 降级为原行为
      speechService.resetCooldowns()
      speechService.speak('detection_stopped')
      stopCamera()
    }
  }, [recording, stopCamera])

  const handleSave = useCallback(async () => {
    if (!savePrompt || isSavingRef.current) return
    isSavingRef.current = true
    setIsSavingVideo(true)
    try {
      const result = await saveVideoToCameraRoll(savePrompt.blob, savePrompt.filename)
      if (result === 'shared' || result === 'downloaded') {
        speechService.speak('video_saved')
        setSavePrompt(null)
        stopCamera()
      }
      // 'cancelled' / 'failed' → 保持弹窗，用户可重试或放弃
    } finally {
      isSavingRef.current = false
      setIsSavingVideo(false)
    }
  }, [savePrompt, stopCamera])

  const handleDiscard = useCallback(() => {
    if (!savePrompt || isSavingRef.current) return
    speechService.speak('video_discarded')
    setSavePrompt(null)
    stopCamera()
  }, [savePrompt, stopCamera])

  // 耳机控制 ref — 每次依赖变化时更新，setupHeadsetControl 只调用一次
  const headsetRef = useRef({
    onStart: handleStart,
    onStop: handleStop,
    onSave: handleSave,
    onDiscard: handleDiscard,
    isRunning: false,
    mode: 'idle' as HeadsetMode,
  })

  useEffect(() => {
    const mode: HeadsetMode = savePrompt
      ? 'save'
      : (enabled && cameraState.isReady && !isStopping) ? 'detect' : 'idle'
    headsetRef.current = {
      onStart: handleStart,
      onStop: handleStop,
      onSave: handleSave,
      onDiscard: handleDiscard,
      isRunning: enabled && cameraState.isReady,
      mode,
    }
  }, [handleStart, handleStop, handleSave, handleDiscard, enabled, cameraState.isReady, savePrompt, isStopping])

  useEffect(() => {
    return setupHeadsetControl({
      onStart: () => { void headsetRef.current.onStart() },
      onStop: () => { void headsetRef.current.onStop() },
      onSave: () => { void headsetRef.current.onSave() },
      onDiscard: () => { void headsetRef.current.onDiscard() },
      isRunning: () => headsetRef.current.isRunning,
      getMode: () => headsetRef.current.mode,
    })
  }, [])

  const handleThresholdChange = useCallback((partial: Partial<SpinThresholds>) => {
    setThresholds(prev => ({ ...prev, ...partial }))
  }, [])

  const isGood = isQualityGood(status.level)
  const headsetSupported = typeof navigator !== 'undefined' && 'mediaSession' in navigator

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
        frameRate={frameRate}
        isRecording={recording.isRecording}
        onStart={handleStart}
        onStop={handleStop}
        onSwitchCamera={() => switchCamera(enabled && cameraState.isReady)}
        onThresholdChange={handleThresholdChange}
        onSpeechToggle={handleSpeechToggle}
        onToggleFullscreen={toggleFullscreen}
        onZoomChange={setZoom}
        onFrameRateChange={setFrameRate}
      />
      {savePrompt && (
        <SavePrompt
          videoBlob={savePrompt.blob}
          isSaving={isSavingVideo}
          headsetSupported={headsetSupported}
          onSave={handleSave}
          onDiscard={handleDiscard}
        />
      )}
    </div>
  )
}
