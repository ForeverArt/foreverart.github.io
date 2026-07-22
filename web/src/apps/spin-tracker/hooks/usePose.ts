import { useEffect, useRef, useState, useCallback } from 'react'
import type { Landmark } from '@spin/lib/spinAlgorithm'

export interface DownloadProgress {
  file: string
  loaded: number
  total: number
}

export interface PoseState {
  landmarks: Landmark[] | null
  isLoading: boolean
  loadingMessage: string
  downloadProgress: DownloadProgress | null
  error: string | null
  fps: number
}

// 已知 MediaPipe 文件大小（字节），用于无 Content-Length 时的估算
const KNOWN_SIZES: Record<string, number> = {
  'pose_solution_simd_wasm_bin.wasm': 6_300_000,
  'pose_solution_wasm_bin.wasm': 6_100_000,
  'pose_solution_packed_assets.data': 3_100_000,
  'pose_solution_simd_wasm_bin.data': 1_200_000,
}

// 拦截 fetch 以追踪下载进度
function fetchWithProgress(
  url: string,
  onProgress: (p: DownloadProgress) => void
): Promise<Response> {
  const fileName = url.split('/').pop() ?? url

  return fetch(url).then(async (res) => {
    if (!res.ok || !res.body) return res
    const contentLength = Number(res.headers.get('content-length') || 0)
    const total = contentLength || KNOWN_SIZES[fileName] || 0

    const reader = res.body.getReader()
    const chunks: Uint8Array[] = []
    let loaded = 0

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (value) {
        chunks.push(value)
        loaded += value.length
        onProgress({ file: fileName, loaded, total: total || loaded })
      }
    }

    const blob = new Blob(chunks)
    return new Response(blob, { status: res.status, headers: res.headers })
  })
}

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
      setState(s => ({ ...s, isLoading: true, loadingMessage: '加载姿态检测模型...', error: null, downloadProgress: null }))

      try {
        const { Pose } = await import('@mediapipe/pose')

        const pose = new Pose({
          locateFile: (file: string) => `/mediapipe/${file}`,
        })

        // 注入进度追踪：覆盖全局 fetch（仅在 /mediapipe/ 路径生效）
        const origFetch = window.fetch.bind(window)
        const patchedFetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
          const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
          if (url.includes('/mediapipe/')) {
            return fetchWithProgress(url, (p) => {
              if (!cancelled) {
                setState(s => ({
                  ...s,
                  loadingMessage: `下载模型文件...`,
                  downloadProgress: p,
                }))
              }
            })
          }
          return origFetch(input, init)
        }
        window.fetch = patchedFetch as typeof fetch

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
          // 首次有结果时恢复 fetch 并清除进度
          window.fetch = origFetch as typeof fetch
          updateFps()
          setState(s => ({
            ...s,
            isLoading: false,
            loadingMessage: '',
            downloadProgress: null,
            landmarks: results.poseLandmarks ?? null,
          }))
        })

        poseRef.current = pose

        setState(s => ({ ...s, loadingMessage: '初始化检测引擎...' }))

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
    }
  }, [isVideoReady, enabled, videoRef, updateFps])

  return state
}
