import { useEffect, useRef, useState } from 'react'
import type { Landmark } from '@spin/lib/spinAlgorithm'
// build: 2026-07-22

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

// 实测各文件字节数（从部署目录量得），SIMD 版和非 SIMD 版浏览器各取其一
const KNOWN_SIZES: Record<string, number> = {
  'pose_solution_simd_wasm_bin.wasm': 6_104_372,
  'pose_solution_wasm_bin.wasm':      5_994_571,
  'pose_solution_packed_assets.data': 2_962_288,
  'pose_solution_simd_wasm_bin.data': 0,
}

// 预估总下载量（取 SIMD 路径：wasm + data）
export const MEDIAPIPE_TOTAL_BYTES = 6_104_372 + 2_962_288 // ~8.6 MB

// 拦截 fetch 以追踪下载进度
function fetchWithProgress(
  url: string,
  onProgress: (p: DownloadProgress) => void,
  fetchImpl: typeof fetch
): Promise<Response> {
  const fileName = url.split('/').pop() ?? url

  return fetchImpl(url).then(async (res) => {
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

// 拦截 XHR（MediaPipe 内部用 XHR 加载 wasm/data）
type XhrProgressCallback = (p: DownloadProgress) => void
let xhrInterceptor: XhrProgressCallback | null = null
const OrigXHR = window.XMLHttpRequest

class PatchedXHR extends OrigXHR {
  private _url = ''
  constructor() {
    super()
    this.addEventListener('progress', (e: ProgressEvent) => {
      if (xhrInterceptor && this._url.includes('/mediapipe/')) {
        const fileName = this._url.split('/').pop() ?? this._url
        const total = e.total || KNOWN_SIZES[fileName] || 0
        xhrInterceptor({ file: fileName, loaded: e.loaded, total })
      }
    })
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  open(method: string, url: string | URL, async = true, username?: string | null, password?: string | null): void {
    this._url = url.toString()
    super.open(method, url as string, async, username, password)
  }
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
  const initTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fpsCounterRef = useRef({ frames: 0, lastTime: Date.now() })

  // 用 ref 持有 fps 更新逻辑，避免将其列入 useEffect 依赖导致 init() 重复执行
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

    async function init() {
      setState(s => ({ ...s, isLoading: true, loadingMessage: '加载姿态检测模型...', error: null, downloadProgress: null }))

      // 在 import 之前同时拦截 fetch 和 XHR，覆盖所有 MediaPipe 下载方式
      const origFetch = window.fetch.bind(window)
      const patchedFetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
        if (url.includes('/mediapipe/')) {
          return fetchWithProgress(url, (p) => {
            if (!cancelled) {
              const done = p.total > 0 && p.loaded >= p.total
              setState(s => ({
                ...s,
                loadingMessage: done ? '初始化检测引擎...' : '下载模型文件...',
                downloadProgress: done ? null : p,
              }))
            }
          }, origFetch)
        }
        return origFetch(input, init)
      }
      window.fetch = patchedFetch as typeof fetch

      xhrInterceptor = (p) => {
        if (!cancelled) {
          const done = p.total > 0 && p.loaded >= p.total
          setState(s => ({
            ...s,
            loadingMessage: done ? '初始化检测引擎...' : '下载模型文件...',
            downloadProgress: done ? null : p,
          }))
        }
      }
      window.XMLHttpRequest = PatchedXHR as unknown as typeof XMLHttpRequest

      const restoreGlobals = () => {
        window.fetch = origFetch as typeof fetch
        window.XMLHttpRequest = OrigXHR
        xhrInterceptor = null
      }

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

        // 超时保护：30s 内若从未收到结果则报错
        let gotFirstResult = false
        const timeoutId = setTimeout(() => {
          if (!gotFirstResult && !cancelled) {
            restoreGlobals()
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

        // 严格串行：onResults 触发后再用 RAF 安排下一帧 send，
        // 避免 send 队列无限累积导致 call stack overflow
        const scheduleNext = () => {
          if (cancelled) return
          rafRef.current = requestAnimationFrame(() => {
            if (cancelled) return
            if (videoRef.current && videoRef.current.readyState >= 2) {
              pose.send({ image: videoRef.current }).catch((err) => {
                if (!cancelled) {
                  clearTimeout(timeoutId)
                  restoreGlobals()
                  setState(s => ({
                    ...s,
                    isLoading: false,
                    loadingMessage: '',
                    error: err instanceof Error ? err.message : '姿态检测出错',
                  }))
                }
              })
            } else {
              // 视频还没就绪，稍后重试
              scheduleNext()
            }
          })
        }

        pose.onResults((results: { poseLandmarks?: Landmark[] }) => {
          if (cancelled) return
          if (!gotFirstResult) {
            gotFirstResult = true
            clearTimeout(timeoutId)
            restoreGlobals()
          }
          updateFpsRef.current()
          setState(s => ({
            ...s,
            isLoading: false,
            loadingMessage: '',
            downloadProgress: null,
            landmarks: results.poseLandmarks ?? null,
          }))
          // 处理完当前帧结果后，再安排下一帧
          scheduleNext()
        })

        poseRef.current = pose

        setState(s => ({ ...s, loadingMessage: '初始化检测引擎...' }))

        // 启动第一帧
        scheduleNext()
      } catch (err) {
        restoreGlobals()
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
    }
    // videoRef 是稳定的 ref 对象，不会变化；updateFpsRef 通过 ref 模式规避依赖
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVideoReady, enabled])

  return state
}
