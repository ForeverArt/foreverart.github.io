import type { PoseLandmark } from '@/platforms/figure-skating/core'

export const DEFAULT_HISTORY_SIZE = 90

export class FrameBuffer {
  private frames: PoseLandmark[][] = []

  constructor(private readonly capacity: number = DEFAULT_HISTORY_SIZE) {}

  push(landmarks: PoseLandmark[]): PoseLandmark[][] {
    this.frames = [...this.frames.slice(-(this.capacity - 1)), landmarks]
    return this.frames
  }

  getHistory(): PoseLandmark[][] {
    return this.frames
  }

  clear(): void {
    this.frames = []
  }

  get size(): number {
    return this.frames.length
  }
}
