import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import SpinTrackerApp from '@spin/App'

export default function SpinTrackerPage() {
  const navigate = useNavigate()

  return (
    <div className="relative h-screen">
      {/* 悬浮返回按钮 */}
      <button
        onClick={() => navigate('/')}
        className="
          absolute top-2 left-2 z-50
          flex items-center gap-1 px-2 py-1 rounded
          text-xs text-muted-foreground hover:text-foreground
          bg-card/80 hover:bg-card border border-border/50
          transition-colors backdrop-blur-sm
        "
      >
        <ArrowLeft size={13} />
        返回
      </button>

      <SpinTrackerApp />
    </div>
  )
}
