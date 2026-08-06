import { useState, useEffect, useMemo, useRef } from 'react'
import { Search, RefreshCw, Rss, LogIn, LogOut, Plus, X, TrendingUp, Star, User as UserIcon } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { api, type TRLatestGroup, type TRNewsItem, type Digest } from './api'
import { useLocalKeywords, matchesKeyword } from './useLocalKeywords'
import { useAuth } from './useAuth'

export default function NewsApp() {
  const [groups, setGroups] = useState<TRLatestGroup[]>([])
  const [digest, setDigest] = useState<Digest | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showDigest, setShowDigest] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [showSubscription, setShowSubscription] = useState(false)
  const [contentVisible, setContentVisible] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  const { keywords, add: addKeyword, remove: removeKeyword } = useLocalKeywords()
  const auth = useAuth()

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    setError(null)
    try {
      const [g, d] = await Promise.all([api.latest(), api.digest().catch(() => null)])
      setGroups(g || [])
      setDigest(d)
      if (isRefresh) {
        setContentVisible(false)
        requestAnimationFrame(() => setContentVisible(true))
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData().then(() => setContentVisible(true))
  }, [])

  // Filter and sort items
  const allItems = useMemo(() => {
    const items: TRNewsItem[] = []
    for (const g of groups) {
      if (selectedPlatform !== 'all' && g.platform.name !== selectedPlatform) continue
      items.push(...g.items)
    }
    // Sort by crawl_count desc, rank asc
    items.sort((a, b) => b.crawlCount - a.crawlCount || a.rank - b.rank)
    return items
  }, [groups, selectedPlatform])

  const filteredItems = useMemo(() => {
    if (!searchQuery) return allItems
    const q = searchQuery.toLowerCase()
    return allItems.filter((it) => it.title.toLowerCase().includes(q))
  }, [allItems, searchQuery])

  const matchedItems = useMemo(() => {
    if (keywords.length === 0) return []
    return filteredItems.filter((it) => matchesKeyword(it.title, keywords))
  }, [filteredItems, keywords])

  const otherItems = useMemo(() => {
    if (keywords.length === 0) return filteredItems
    return filteredItems.filter((it) => !matchesKeyword(it.title, keywords))
  }, [filteredItems, keywords])

  const platforms = useMemo(() => {
    return groups.map((g) => g.platform.name)
  }, [groups])

  if (loading) {
    return (
      <div className="space-y-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive mb-4">加载失败：{error}</p>
        <button onClick={() => fetchData()} className="px-4 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition">
          重试
        </button>
      </div>
    )
  }

  return (
    <div ref={contentRef} className={`space-y-6 transition-opacity duration-300 ${contentVisible ? 'opacity-100' : 'opacity-50'}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">热点资讯</h1>
          <p className="text-sm text-muted-foreground mt-1">多平台热榜聚合 · 关键词订阅 · AI 日报</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchData(true)}
            className="p-2 rounded-lg hover:bg-accent transition"
            title="刷新"
          >
            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
          </button>
          {digest && (
            <button
              onClick={() => setShowDigest(!showDigest)}
              className={`p-2 rounded-lg transition ${showDigest ? 'bg-primary/20 text-primary' : 'hover:bg-accent'}`}
              title="AI 日报"
            >
              <TrendingUp size={18} />
            </button>
          )}
          <button
            onClick={() => setShowSubscription(!showSubscription)}
            className={`p-2 rounded-lg transition ${showSubscription ? 'bg-primary/20 text-primary' : 'hover:bg-accent'}`}
            title="订阅管理"
          >
            <Rss size={18} />
          </button>
          {auth.user ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium">
              <UserIcon size={14} />
              <span>{auth.user.username}</span>
              <button onClick={auth.logout} className="ml-1 hover:text-destructive transition" title="退出">
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAuth(!showAuth)}
              className={`p-2 rounded-lg transition ${showAuth ? 'bg-primary/20 text-primary' : 'hover:bg-accent'}`}
              title="登录"
            >
              <LogIn size={18} />
            </button>
          )}
        </div>
      </div>

      {/* AI Digest */}
      {showDigest && digest && <DigestCard digest={digest} />}

      {/* Auth Panel */}
      {showAuth && !auth.user && (
        <AuthPanel
          onLogin={auth.login}
          onRegister={auth.register}
          loading={auth.loading}
          error={auth.error}
          onClose={() => setShowAuth(false)}
        />
      )}

      {/* Subscription Panel */}
      {showSubscription && (
        <SubscriptionPanel
          keywords={keywords}
          onAdd={addKeyword}
          onRemove={removeKeyword}
          user={auth.user}
        />
      )}

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="搜索热点..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
        />
      </div>

      {/* Platform Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <PlatformTab
          label="全部"
          active={selectedPlatform === 'all'}
          onClick={() => setSelectedPlatform('all')}
        />
        {platforms.map((p) => (
          <PlatformTab
            key={p}
            label={p}
            active={selectedPlatform === p}
            onClick={() => setSelectedPlatform(p)}
          />
        ))}
      </div>

      {/* Matched Items (keyword hits) */}
      {matchedItems.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Star size={14} className="text-primary" />
            <span className="text-sm font-medium text-primary">订阅命中 ({matchedItems.length})</span>
          </div>
          <div className="space-y-2">
            {matchedItems.map((it) => (
              <NewsItemCard key={`${it.platformId}-${it.id}`} item={it} highlighted />
            ))}
          </div>
        </div>
      )}

      {/* Other Items */}
      {otherItems.length > 0 && (
        <div className="space-y-2">
          {otherItems.map((it) => (
            <NewsItemCard key={`${it.platformId}-${it.id}`} item={it} />
          ))}
        </div>
      )}

      {filteredItems.length === 0 && (
        <p className="text-center text-muted-foreground py-8">暂无数据</p>
      )}
    </div>
  )
}

// --- Subcomponents ---

function DigestCard({ digest }: { digest: Digest }) {
  return (
    <div className="p-4 rounded-lg bg-card border border-primary/20">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-primary">AI 日报 · {digest.date}</h3>
        <span className="text-xs text-muted-foreground">
          {new Date(digest.generatedAt).toLocaleString('zh-CN')}
        </span>
      </div>
      <div className="text-sm text-foreground/90 leading-relaxed prose prose-invert prose-sm max-w-none prose-headings:text-primary/80 prose-strong:text-foreground prose-a:text-primary">
        <ReactMarkdown>{digest.content}</ReactMarkdown>
      </div>
    </div>
  )
}

function AuthPanel({
  onLogin,
  onRegister,
  loading,
  error,
  onClose,
}: {
  onLogin: (u: string, p: string) => Promise<void>
  onRegister: (u: string, p: string) => Promise<void>
  loading: boolean
  error: string | null
  onClose: () => void
}) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (mode === 'login') {
        await onLogin(username, password)
      } else {
        await onRegister(username, password)
      }
      onClose()
    } catch {
      // error is already in auth.error
    }
  }

  return (
    <div className="p-4 rounded-lg bg-card border border-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium">{mode === 'login' ? '登录' : '注册'}</h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X size={16} />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          placeholder="用户名"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
          required
        />
        <input
          type="password"
          placeholder="密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
          required
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 transition"
        >
          {loading ? '处理中...' : mode === 'login' ? '登录' : '注册'}
        </button>
      </form>
      <button
        onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
        className="w-full mt-3 text-sm text-muted-foreground hover:text-foreground"
      >
        {mode === 'login' ? '没有账号？注册' : '已有账号？登录'}
      </button>
    </div>
  )
}

function SubscriptionPanel({
  keywords,
  onAdd,
  onRemove,
  user,
}: {
  keywords: string[]
  onAdd: (kw: string) => void
  onRemove: (kw: string) => void
  user: { token: string; username: string } | null
}) {
  const [input, setInput] = useState('')

  const handleAdd = () => {
    if (input.trim()) {
      onAdd(input.trim())
      setInput('')
    }
  }

  return (
    <div className="p-4 rounded-lg bg-card border border-border">
      <h3 className="font-medium mb-3">本地关键词订阅</h3>
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          placeholder="添加关键词..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          className="flex-1 px-3 py-2 rounded-lg bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
        />
        <button
          onClick={handleAdd}
          className="px-3 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition"
        >
          <Plus size={16} />
        </button>
      </div>
      {keywords.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {keywords.map((kw) => (
            <span
              key={kw}
              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-primary/10 text-primary text-xs"
            >
              {kw}
              <button onClick={() => onRemove(kw)} className="hover:text-destructive">
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">暂无关键词，添加后将高亮匹配的热点</p>
      )}
      {user && (
        <p className="mt-3 text-xs text-muted-foreground">
          已登录为 {user.username}，可同步关键词到服务端获取 RSS 订阅
        </p>
      )}
    </div>
  )
}

function PlatformTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition ${
        active ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent'
      }`}
    >
      {label}
    </button>
  )
}

function NewsItemCard({ item, highlighted }: { item: TRNewsItem; highlighted?: boolean }) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`block p-3 rounded-lg border transition hover:border-primary/40 ${
        highlighted ? 'bg-primary/5 border-primary/30' : 'bg-card border-border'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground line-clamp-2">{item.title}</p>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
            <span>{item.platformName}</span>
            <span>排名 {item.rank}</span>
            <span>热度 {item.crawlCount}</span>
          </div>
        </div>
        {highlighted && <Star size={14} className="text-primary shrink-0 mt-0.5" />}
      </div>
    </a>
  )
}

function SkeletonCard() {
  return (
    <div className="p-4 rounded-lg bg-card border border-border animate-pulse">
      <div className="h-4 bg-muted rounded w-3/4 mb-2" />
      <div className="h-3 bg-muted rounded w-1/2" />
    </div>
  )
}
