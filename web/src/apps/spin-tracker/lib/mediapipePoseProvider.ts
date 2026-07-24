import { toPoseFrame, toPoseLandmarks } from './mediapipeAdapter'
import type { PoseFrame } from '@/platforms/figure-skating/core'

type PoseInstance = {
  setOptions: (opts: Record<string, unknown>) => void
  onResults: (cb: (results: { poseLandmarks?: Array<{ x: number; y: number; z?: number; visibility?: number }> }) => void) => void
  initialize: () => Promise<void>
  send: (input: { image: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement }) => Promise<void>
  close: () => Promise<void>
}

export interface MediaPipePoseProviderOptions {
  locateFile?: (file: string) => string
}

/**
 * Shared MediaPipe Pose provider for realtime and offline pipelines.
 */
export class MediaPipePoseProvider {
  private pose: PoseInstance | null = null
  private ready = false

  constructor(private readonly options: MediaPipePoseProviderOptions = {}) {}

  async initialize(): Promise<void> {
    if (this.ready && this.pose) return
    const { Pose } = await import('@mediapipe/pose')
    const pose = new Pose({
      locateFile: this.options.locateFile ?? ((file: string) => `/mediapipe/${file}`),
    }) as unknown as PoseInstance

    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      smoothSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    })

    await pose.initialize()
    this.pose = pose
    this.ready = true
  }

  async detect(
    image: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement,
    meta: { t: number; fps?: number }
  ): Promise<PoseFrame | null> {
    if (!this.pose) throw new Error('MediaPipePoseProvider not initialized')

    return new Promise((resolve, reject) => {
      const pose = this.pose!
      let settled = false
      const timeout = setTimeout(() => {
        if (!settled) {
          settled = true
          resolve(null)
        }
      }, 5000)

      pose.onResults((results) => {
        if (settled) return
        settled = true
        clearTimeout(timeout)
        const landmarks = toPoseLandmarks(results.poseLandmarks)
        if (!landmarks) {
          resolve(null)
          return
        }
        resolve(toPoseFrame(landmarks, { t: meta.t, fps: meta.fps, source: 'mediapipe' }))
      })

      pose.send({ image }).catch((err) => {
        if (!settled) {
          settled = true
          clearTimeout(timeout)
          reject(err)
        }
      })
    })
  }

  async close(): Promise<void> {
    const pose = this.pose
    this.pose = null
    this.ready = false
    if (pose) await pose.close().catch(() => {})
  }
}
