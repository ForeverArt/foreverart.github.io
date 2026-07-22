import { Loader2, CameraOff } from 'lucide-react'
import { SkeletonOverlay } from './SkeletonOverlay'
import { Badge } from './ui/badge'
import type { Landmark } from '@/lib/spinAlgorithm'

interface CameraViewProps {
  videoRef: React.RefObject<HTMLVideoElement>
  isReady: boolean
  isLoading: boolean
  error: string | null
  landmarks: Landmark[] | null
  getHistory: () => Landmark[][]
  isGood: boolean
  statusText: string
  statusLevel: 'good' | 'warn' | 'bad' | 'idle'
  fps: number
}

export function CameraView({
  videoRef,
  isReady,
  isLoading,
  error,
  landmarks,
  getHistory,
  isGood,
  statusText,
  statusLevel,
  fps,
}: CameraViewProps) {
  return (
    <div className="relative w-full bg-black overflow-hidden" style={{ aspectRatio: '9/16', maxHeight: '70vh' }}>
      {/* 摄像头视频 */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        playsInline
        muted
        autoPlay
      />

      {/* 骨骼叠加层 */}
      {landmarks && (
        <SkeletonOverlay
          landmarks={landmarks}
          getHistory={getHistory}
          isGood={isGood}
        />
      )}

      {/* 扫描线效果（检测中） */}
      {isReady && !isLoading && (
        <div className="absolute inset-0 pointer-events-none scan-overlay" />
      )}

      {/* 顶部状态 HUD */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
        {/* 录制指示 */}
        <div className="flex items-center gap-1.5 bg-black/60 rounded-full px-2.5 py-1">
          <div className={`w-2 h-2 rounded-full ${isReady ? 'bg-red-500 animate-pulse' : 'bg-muted'}`} />
          <span className="text-xs font-metric text-white/80">{isReady ? 'LIVE' : 'OFF'}</span>
        </div>

        {/* 状态 Badge */}
        <Badge
          variant={statusLevel}
          className={`text-xs font-metric ${statusLevel === 'good' ? 'status-pulse-good' : statusLevel === 'warn' ? 'status-pulse-warn' : ''}`}
        >
          {statusText}
        </Badge>

        {/* FPS */}
        <div className="bg-black/60 rounded-full px-2.5 py-1">
          <span className="text-xs font-metric text-white/60">{fps > 0 ? `${fps}fps` : '--'}</span>
        </div>
      </div>

      {/* 十字准星（未检测到人时显示） */}
      {isReady && !landmarks && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 border-2 border-primary/50 rounded-full animate-pulse" />
            <div className="absolute top-1/2 left-0 right-0 h-px bg-primary/40 -translate-y-1/2" />
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-primary/40 -translate-x-1/2" />
          </div>
        </div>
      )}

      {/* 加载中遮罩 */}
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">加载姿态检测模型...</p>
        </div>
      )}

      {/* 错误遮罩 */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 gap-3 p-4">
          <CameraOff className="w-10 h-10 text-destructive" />
          <p className="text-sm text-destructive text-center">{error}</p>
          <p className="text-xs text-muted-foreground text-center">请确保已授权摄像头权限，并使用 HTTPS 访问</p>
        </div>
      )}

      {/* 未开始提示 */}
      {!isReady && !error && !isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 gap-4">
          <div className="w-16 h-16 rounded-full border-2 border-dashed border-primary/40 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border border-primary/60" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground/80">花样滑冰旋转轴心检测</p>
            <p className="text-xs text-muted-foreground mt-1">点击下方"开始检测"启动摄像头</p>
          </div>
        </div>
      )}
    </div>
  )
}
