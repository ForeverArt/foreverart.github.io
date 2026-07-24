import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function ListeningPage() {
  const navigate = useNavigate()

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* 顶部返回栏 */}
      <div className="flex-none h-10 flex items-center px-3 border-b border-border bg-card">
        <button
          onClick={() => navigate('/platforms/life-tools')}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={15} />
          返回平台
        </button>
      </div>

      {/* iframe 全屏嵌入 */}
      <iframe
        src="/listening.html"
        className="flex-1 w-full border-none"
        allow="microphone; autoplay"
        referrerPolicy="same-origin"
        title="Listening"
      />
    </div>
  )
}
