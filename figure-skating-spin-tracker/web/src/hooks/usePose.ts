import { useEffect, useRef, useState, useCallback } from 'react'
import type { Landmark } from '@/lib/spinAlgorithm'

export interface PoseState {
  landmarks: Landmark[] | null
  isLoading: boolean
  error: string | null
  fps: number
}

export function usePose(
  videoRef: React.RefObject<HTMLVideoElement>,
  isVideoReady: boolean,
  enabled: boolean
) {
  const [state, setState] = useState<PoseState>({
    landmarks: null,
    isLoading: false,
    error: null,
    fps: 0,
  })

  const poseRef = useRef<unknown>(null)
  const rafRef = useRef<number>(0)
  const fpsCounterRef = useRef({ frames: 0, lastTime: Date.now() })

  const updateFps = useCallback(() => {
    fpsCounterRef.current.frames++
    const now = Date.now()
    const elapsed = now - fpsCounterRef.current.lastTime
    if (elapsed >= 1000) {
      const fps = Math.round(fpsCounterRef.current.frames * 1000 / elapsed)
      setState(s => ({ ...s, fps }))
      fpsCounterRef.current = { frames: 0, lastTime: now }
    }
  }, [])

  useEffect(() => {
    if (!isVideoReady || !enabled) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      return
    }

    let cancelled = false

    async function init() {
      setState(s => ({ ...s, isLoading: true, error: null }))

      try {
        // 动态引入 MediaPipe Pose
        const { Pose } = await import('@mediapipe/pose')

        const pose = new Pose({
          locateFile: (file: string) =>
            `/figure-skating-spin-tracker/dist/mediapipe/${file}`,
        })

        pose.setOptions({
          modelComplexity: 1,
          smoothLandmarks: true,
          enableSegmentation: false,
          smoothSegmentation: false,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        })

        pose.onResults((results: { poseLandmarks?: Landmark[] }) => {
          if (cancelled) return
          updateFps()
          setState(s => ({
            ...s,
            isLoading: false,
            landmarks: results.poseLandmarks ?? null,
          }))
        })

        poseRef.current = pose

        // 推流循环
        const sendFrame = async () => {
          if (cancelled) return
          if (videoRef.current && videoRef.current.readyState >= 2) {
            await pose.send({ image: videoRef.current })
          }
          rafRef.current = requestAnimationFrame(sendFrame)
        }

        rafRef.current = requestAnimationFrame(sendFrame)
      } catch (err) {
        if (!cancelled) {
          setState(s => ({
            ...s,
            isLoading: false,
            error: err instanceof Error ? err.message : 'MediaPipe 加载失败',
          }))
        }
      }
    }

    init()

    return () => {
      cancelled = true
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [isVideoReady, enabled, videoRef, updateFps])

  return state
}
