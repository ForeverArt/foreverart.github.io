import { useEffect, useRef, useCallback } from 'react'
import type { PoseLandmark } from '@/platforms/figure-skating/core'
import { renderAll } from '@spin/lib/poseRenderer'

interface SkeletonOverlayProps {
  landmarks: PoseLandmark[] | null
  getHistory: () => PoseLandmark[][]
  isGood: boolean
}

export function SkeletonOverlay({ landmarks, getHistory, isGood }: SkeletonOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const resize = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return
    canvas.width = container.offsetWidth
    canvas.height = container.offsetHeight
  }, [])

  useEffect(() => {
    resize()
    const observer = new ResizeObserver(resize)
    if (containerRef.current) observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [resize])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (!landmarks || landmarks.length === 0) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      return
    }

    renderAll(ctx, landmarks, getHistory(), canvas.width, canvas.height, isGood)
  // getHistory 读的是 ref，引用稳定，无需列为依赖
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [landmarks, isGood])

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
      />
    </div>
  )
}
