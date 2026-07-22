import { useEffect, useRef, useState, useCallback } from 'react'

export interface CameraState {
  isReady: boolean
  error: string | null
  facingMode: 'environment' | 'user'
}

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [state, setState] = useState<CameraState>({
    isReady: false,
    error: null,
    facingMode: 'environment',
  })

  const startCamera = useCallback(async (facingMode: 'environment' | 'user' = 'environment') => {
    // 停止现有流
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }

    setState(s => ({ ...s, isReady: false, error: null, facingMode }))

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
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '无法访问摄像头'
      setState(s => ({ ...s, error: msg }))
    }
  }, [])

  const switchCamera = useCallback(() => {
    const next = state.facingMode === 'environment' ? 'user' : 'environment'
    startCamera(next)
  }, [state.facingMode, startCamera])

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    setState(s => ({ ...s, isReady: false }))
  }, [])

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
      }
    }
  }, [])

  return { videoRef, state, startCamera, stopCamera, switchCamera }
}
