import type { PoseLandmark, PoseFrame, PoseSourceAdapter } from '@/platforms/figure-skating/core'

/** Raw landmark-like object from MediaPipe (or compatible). */
export interface MediaPipeLandmarkLike {
  x: number
  y: number
  z?: number
  visibility?: number
}

export function toPoseLandmarks(
  raw: MediaPipeLandmarkLike[] | undefined | null
): PoseLandmark[] | null {
  if (!raw || raw.length === 0) return null
  return raw.map(l => ({
    x: l.x,
    y: l.y,
    z: l.z,
    visibility: l.visibility,
  }))
}

export function toPoseFrame(
  landmarks: PoseLandmark[],
  options: {
    t?: number
    fps?: number
    source?: PoseSourceAdapter
  } = {}
): PoseFrame {
  const vis = landmarks
    .map(l => l.visibility)
    .filter((v): v is number => v !== undefined)
  const meanVisibility = vis.length
    ? vis.reduce((a, b) => a + b, 0) / vis.length
    : undefined

  return {
    t: options.t ?? performance.now(),
    landmarks,
    source: options.source ?? 'mediapipe',
    fps: options.fps,
    quality: {
      detected: landmarks.length > 0,
      meanVisibility,
    },
  }
}
