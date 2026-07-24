import { MediaPipePoseProvider } from '@spin/lib/mediapipePoseProvider'
import { OfflineAnalysisSession, type OfflineProgress } from './sessionBuilder'
import type { SpinAnalysis } from '@/platforms/figure-skating/core'

export interface OfflineProcessOptions {
  file: File
  targetFps?: number
  includePose?: boolean
  signal?: AbortSignal
  onProgress?: (p: OfflineProgress) => void
}

function waitForEvent(el: HTMLVideoElement, event: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const onOk = () => { cleanup(); resolve() }
    const onErr = () => { cleanup(); reject(new Error('video error')) }
    const cleanup = () => {
      el.removeEventListener(event, onOk)
      el.removeEventListener('error', onErr)
    }
    el.addEventListener(event, onOk, { once: true })
    el.addEventListener('error', onErr, { once: true })
  })
}

async function seek(video: HTMLVideoElement, time: number): Promise<void> {
  if (Math.abs(video.currentTime - time) < 0.001) return
  video.currentTime = time
  await waitForEvent(video, 'seeked')
}

/**
 * Offline mp4 → SpinAnalysis. Video stays in-browser; never uploaded.
 */
export async function processOfflineVideo(options: OfflineProcessOptions): Promise<SpinAnalysis> {
  const targetFps = options.targetFps ?? 15
  const provider = new MediaPipePoseProvider()
  const session = new OfflineAnalysisSession()
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.preload = 'auto'

  const url = URL.createObjectURL(options.file)
  try {
    options.onProgress?.({ phase: 'loading', currentFrame: 0, totalFrames: 0, percent: 0, message: '加载模型与视频...' })
    await provider.initialize()

    video.src = url
    await waitForEvent(video, 'loadedmetadata')
    const duration = video.duration
    if (!Number.isFinite(duration) || duration <= 0) throw new Error('无法读取视频时长')

    const step = 1 / targetFps
    const totalFrames = Math.max(1, Math.floor(duration / step))
    let index = 0

    for (let t = 0; t < duration; t += step) {
      if (options.signal?.aborted) {
        options.onProgress?.({ phase: 'cancelled', currentFrame: index, totalFrames, percent: Math.round((index / totalFrames) * 100) })
        throw new DOMException('Aborted', 'AbortError')
      }
      await seek(video, Math.min(t, Math.max(0, duration - 0.001)))
      const frame = await provider.detect(video, { t: t * 1000, fps: targetFps })
      if (frame) session.ingest(frame)
      index += 1
      options.onProgress?.({
        phase: 'processing',
        currentFrame: index,
        totalFrames,
        percent: Math.min(99, Math.round((index / totalFrames) * 100)),
        message: `分析帧 ${index}/${totalFrames}`,
      })
    }

    options.onProgress?.({ phase: 'building', currentFrame: index, totalFrames, percent: 99, message: '生成 Analysis...' })
    const analysis = session.build({
      videoFileName: options.file.name,
      durationSec: duration,
      effectiveFps: targetFps,
      includePose: options.includePose ?? false,
    })
    options.onProgress?.({ phase: 'done', currentFrame: index, totalFrames, percent: 100, message: '完成' })
    return analysis
  } finally {
    URL.revokeObjectURL(url)
    video.removeAttribute('src')
    video.load()
    await provider.close()
  }
}
