import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import NewsApp from '@/apps/news/NewsApp'
import { IS_NEWS_DOMAIN } from '@/lib/domain'

export default function NewsPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-3xl mx-auto">
        {/* On hub domain, show back button; on news.foreverart.vip, no back button */}
        {!IS_NEWS_DOMAIN && (
          <button
            onClick={() => navigate('/platforms/life-tools')}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft size={15} />
            返回平台
          </button>
        )}
        <NewsApp />
      </div>
    </div>
  )
}
