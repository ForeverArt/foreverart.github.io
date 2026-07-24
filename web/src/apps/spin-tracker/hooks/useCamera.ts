import { useEffect, useRef, useState, useCallback } from 'react'

export interface CameraState {
  isReady: boolean
  error: string | null
  facingMode: 'environment' | 'user'
}

export interface ZoomState {
  supported: boolean
  min: number
  max: number
  step: number
  current: number
}

const ZOOM_OFF: ZoomState = { supported: false, min: 1, max: 1, step: 0.1, current: 1 }

/** zoom 等扩展能力不在标准 TS DOM 类型中，这里做窄化 */
interface ZoomCapable extends MediaTrackCapabilities {
  zoom?: { min: number; max: number; step?: number }
}

function readZoomState(track: MediaStreamTrack): ZoomState {
  try {
    const caps = track.getCapabilities() as ZoomCapable
    if (!caps.zoom) return ZOOM_OFF
    const settings = track.getSettings() as MediaTrackSettings & { zoom?: number }
    return {
      supported: true,
      min: caps.zoom.min,
      max: caps.zoom.max,
      step: caps.zoom.step || 0.1,
      current: settings.zoom ?? caps.zoom.min,
    }
  } catch {
    return ZOOM_OFF
  }
}

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [state, setState] = useState<CameraState>({
    isReady: false,
    error: null,
    facingMode: 'environment',
  })
  const [zoom, setZoomState] = useState<ZoomState>(ZOOM_OFF)

  const startCamera = useCallback(async (facingMode: 'environment' | 'user' = 'environment') => {
    // 停止现有流
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }

    setState(s => ({ ...s, isReady: false, error: null, facingMode }))
    setZoomState(ZOOM_OFF)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
        audio: false,
      })

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setState(s => ({ ...s, isReady: true }))
        const track = stream.getVideoTracks()[0]
        if (track) setZoomState(readZoomState(track))
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '无法访问摄像头'
      setState(s => ({ ...s, error: msg }))
    }
  }, [])

  const switchCamera = useCallback((isRunning: boolean) => {
    const next = state.facingMode === 'environment' ? 'user' : 'environment'
    if (isRunning) {
      startCamera(next)
    } else {
      // 未运行时只更新方向偏好，不启动摄像头
      setState(s => ({ ...s, facingMode: next }))
    }
  }, [state.facingMode, startCamera])

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    setState(s => ({ ...s, isReady: false }))
    setZoomState(ZOOM_OFF)
  }, [])

  /** 设置变焦倍率，自动 clamp 到设备支持范围 */
  const setZoom = useCallback((value: number) => {
    const track = streamRef.current?.getVideoTracks()[0]
    if (!track) return
    const clamped = Math.min(Math.max(value, zoom.min), zoom.max)
    track.applyConstraints({ advanced: [{ zoom: clamped } as MediaTrackConstraintSet] })
      .then(() => setZoomState(s => ({ ...s, current: clamped })))
      .catch(() => {})
  }, [zoom.min, zoom.max])

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
      }
    }
  }, [])

  return { videoRef, state, zoom, setZoom, startCamera, stopCamera, switchCamera }
}
