import { useEffect, useRef, useState } from 'react'
import type { PoseLandmark } from '@/platforms/figure-skating/core'
import { toPoseLandmarks } from '@spin/lib/mediapipeAdapter'

export interface DownloadProgress {
  file: string
  loaded: number
  total: number
}

export interface PoseState {
  landmarks: PoseLandmark[] | null
  isLoading: boolean
  loadingMessage: string
  downloadProgress: DownloadProgress | null
  error: string | null
  fps: number
}

/** Estimated MediaPipe full model download (SIMD wasm + data). */
export const MEDIAPIPE_TOTAL_BYTES = 6_104_372 + 2_962_288

/**
 * MediaPipe Pose vision adapter.
 * Produces platform-standard PoseLandmark[] — consumers must not import @mediapipe types.
 */
export function usePose(
  videoRef: React.RefObject<HTMLVideoElement>,
  isVideoReady: boolean,
  enabled: boolean
) {
  const [state, setState] = useState<PoseState>({
    landmarks: null,
    isLoading: false,
    loadingMessage: '',
    downloadProgress: null,
    error: null,
    fps: 0,
  })

  const poseRef = useRef<{ close: () => Promise<void> } | null>(null)
  const rafRef = useRef<number>(0)
  const initTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fpsCounterRef = useRef({ frames: 0, lastTime: Date.now() })

  const updateFpsRef = useRef<() => void>(() => {})
  updateFpsRef.current = () => {
    fpsCounterRef.current.frames++
    const now = Date.now()
    const elapsed = now - fpsCounterRef.current.lastTime
    if (elapsed >= 1000) {
      const fps = Math.round(fpsCounterRef.current.frames * 1000 / elapsed)
      setState(s => ({ ...s, fps }))
      fpsCounterRef.current = { frames: 0, lastTime: now }
    }
  }

  useEffect(() => {
    if (!isVideoReady || !enabled) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      return
    }

    let cancelled = false
    let initialized = false

    async function init() {
      setState(s => ({
        ...s,
        isLoading: true,
        loadingMessage: '加载姿态检测模型...',
        error: null,
        downloadProgress: null,
      }))

      try {
        const { Pose } = await import('@mediapipe/pose')

        const pose = new Pose({
          locateFile: (file: string) => `/mediapipe/${file}`,
        })

        pose.setOptions({
          modelComplexity: 1,
          smoothLandmarks: true,
          enableSegmentation: false,
          smoothSegmentation: false,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        })

        let gotFirstResult = false
        const timeoutId = setTimeout(() => {
          if (!gotFirstResult && !cancelled) {
            cancelAnimationFrame(rafRef.current)
            setState(s => ({
              ...s,
              isLoading: false,
              loadingMessage: '',
              error: '初始化超时，请检查摄像头是否正常或刷新重试',
            }))
          }
        }, 30_000)
        initTimeoutRef.current = timeoutId

        pose.onResults((results: { poseLandmarks?: Array<{ x: number; y: number; z?: number; visibility?: number }> }) => {
          if (cancelled) return
          if (!gotFirstResult) {
            gotFirstResult = true
            clearTimeout(timeoutId)
          }
          updateFpsRef.current()
          setState(s => ({
            ...s,
            isLoading: false,
            loadingMessage: '',
            downloadProgress: null,
            landmarks: toPoseLandmarks(results.poseLandmarks),
          }))
        })

        poseRef.current = pose

        setState(s => ({ ...s, loadingMessage: '初始化检测引擎...' }))

        await pose.initialize()
        initialized = true
        if (cancelled) {
          await pose.close()
          if (poseRef.current === pose) poseRef.current = null
          return
        }

        const sendFrame = async () => {
          if (cancelled) return
          try {
            if (videoRef.current && videoRef.current.readyState >= 2) {
              await pose.send({ image: videoRef.current })
            }
          } catch (err) {
            if (!cancelled) {
              clearTimeout(timeoutId)
              setState(s => ({
                ...s,
                isLoading: false,
                loadingMessage: '',
                error: err instanceof Error ? err.message : '姿态检测出错',
              }))
            }
            return
          }
          if (!cancelled) rafRef.current = requestAnimationFrame(sendFrame)
        }

        rafRef.current = requestAnimationFrame(sendFrame)
      } catch (err) {
        if (!cancelled) {
          setState(s => ({
            ...s,
            isLoading: false,
            loadingMessage: '',
            downloadProgress: null,
            error: err instanceof Error ? err.message : 'MediaPipe 加载失败',
          }))
        }
      }
    }

    init()

    return () => {
      cancelled = true
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (initTimeoutRef.current) clearTimeout(initTimeoutRef.current)
      const pose = poseRef.current
      poseRef.current = null
      if (initialized) void pose?.close().catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVideoReady, enabled])

  return state
}
