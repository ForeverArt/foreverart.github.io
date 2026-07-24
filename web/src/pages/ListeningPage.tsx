import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import ListeningApp from '@listen/ListeningApp'

export default function ListeningPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate('/platforms/life-tools')}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft size={15} />
          返回平台
        </button>

        <ListeningApp />
      </div>
    </div>
  )
}
