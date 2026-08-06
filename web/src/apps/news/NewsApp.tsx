import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Search, RefreshCw, LogIn, LogOut, Plus, X, TrendingUp, Star, User as UserIcon, Lock, CheckCircle } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { api, type TRLatestGroup, type TRNewsItem, type Digest, type KeywordMatchGroup } from './api'
import { useLocalKeywords, matchesKeyword } from './useLocalKeywords'
import { useServerKeywords } from './useServerKeywords'
import { useCountdown } from './useCountdown'
import { useAuth } from './useAuth'

const COUNTDOWN_SEC = 180

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
  const [contentVisible, setContentVisible] = useState(false)
  const [activeTab, setActiveTab] = useState<'hot' | 'subscription'>('hot')

  // Subscription tab state
  const [matchedGroups, setMatchedGroups] = useState<KeywordMatchGroup[]>([])
  const [matchedLoading, setMatchedLoading] = useState(false)
  const [matchedError, setMatchedError] = useState<string | null>(null)
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null)
  const [showRefreshedBadge, setShowRefreshedBadge] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  const { keywords } = useLocalKeywords()
  const auth = useAuth()
  const serverKw = useServerKeywords(auth.user)
  const countdown = useCountdown(COUNTDOWN_SEC)

  const fetchData = useCallback(async (isRefresh = false) => {
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
  }, [])

  useEffect(() => {
    fetchData().then(() => setContentVisible(true))
  }, [fetchData])

  // Fetch matched items when countdown expires
  const fetchMatched = useCallback(async () => {
    if (!auth.user) return
    setMatchedLoading(true)
    setMatchedError(null)
    try {
      const result = await api.matchedItems(auth.user.token)
      setMatchedGroups(result)
      setLastRefreshedAt(new Date())
      setShowRefreshedBadge(true)
      setTimeout(() => setShowRefreshedBadge(false), 3000)
    } catch (err: any) {
      setMatchedError(err.message)
    } finally {
      setMatchedLoading(false)
    }
  }, [auth.user])

  useEffect(() => {
    if (countdown.isExpired && auth.user) {
      fetchMatched().then(() => {
        // Restart countdown for continuous polling
        countdown.start()
      })
    }
  }, [countdown.isExpired]) // eslint-disable-line react-hooks/exhaustive-deps

  // Trigger countdown on keyword change
  const handleServerKeywordAdd = useCallback(
    (kw: string) => {
      serverKw.add(kw)
      countdown.reset()
      countdown.start()
    },
    [serverKw, countdown],
  )

  const handleServerKeywordRemove = useCallback(
    (kw: string) => {
      serverKw.remove(kw)
      countdown.reset()
      countdown.start()
    },
    [serverKw, countdown],
  )

  // Filter and sort items
  const allItems = useMemo(() => {
    const items: TRNewsItem[] = []
    for (const g of groups) {
      if (selectedPlatform !== 'all' && g.platform.name !== selectedPlatform) continue
      items.push(...g.items)
    }
    items.sort((a, b) => b.crawlCount - a.crawlCount || a.rank - b.rank)
    return items
  }, [groups, selectedPlatform])

  const filteredItems = useMemo(() => {
    if (!searchQuery) return allItems
    const q = searchQuery.toLowerCase()
    return allItems.filter((it) => it.title.toLowerCase().includes(q))
  }, [allItems, searchQuery])

  const hotMatchedItems = useMemo(() => {
    if (keywords.length === 0) return []
    return filteredItems.filter((it) => matchesKeyword(it.title, keywords))
  }, [filteredItems, keywords])

  const hotOtherItems = useMemo(() => {
    if (keywords.length === 0) return filteredItems
    return filteredItems.filter((it) => !matchesKeyword(it.title, keywords))
  }, [filteredItems, keywords])

  const platforms = useMemo(() => groups.map((g) => g.platform.name), [groups])

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

      {/* Tab Bar */}
      <div className="flex gap-2">
        <TabButton label="热点资讯" active={activeTab === 'hot'} onClick={() => setActiveTab('hot')} />
        <TabButton label="我的订阅" active={activeTab === 'subscription'} onClick={() => setActiveTab('subscription')} />
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

      {/* Tab Content */}
      {activeTab === 'hot' && (
        <>
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
            <PlatformTab label="全部" active={selectedPlatform === 'all'} onClick={() => setSelectedPlatform('all')} />
            {platforms.map((p) => (
              <PlatformTab key={p} label={p} active={selectedPlatform === p} onClick={() => setSelectedPlatform(p)} />
            ))}
          </div>

          {/* Local keyword matched items */}
          {hotMatchedItems.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Star size={14} className="text-primary" />
                <span className="text-sm font-medium text-primary">本地关键词命中 ({hotMatchedItems.length})</span>
              </div>
              <div className="space-y-2">
                {hotMatchedItems.map((it) => (
                  <NewsItemCard key={`hot-${it.platformId}-${it.id}`} item={it} highlighted />
                ))}
              </div>
            </div>
          )}

          {/* Other Items */}
          {hotOtherItems.length > 0 && (
            <div className="space-y-2">
              {hotOtherItems.map((it) => (
                <NewsItemCard key={`hot-other-${it.platformId}-${it.id}`} item={it} />
              ))}
            </div>
          )}

          {filteredItems.length === 0 && <p className="text-center text-muted-foreground py-8">暂无数据</p>}
        </>
      )}

      {activeTab === 'subscription' && (
        <SubscriptionTab
          user={auth.user}
          keywords={serverKw.keywords}
          kwLoading={serverKw.loading}
          kwSyncing={serverKw.syncing}
          kwSyncError={serverKw.syncError}
          onAdd={handleServerKeywordAdd}
          onRemove={handleServerKeywordRemove}
          countdown={countdown}
          matchedGroups={matchedGroups}
          matchedLoading={matchedLoading}
          matchedError={matchedError}
          lastRefreshedAt={lastRefreshedAt}
          showRefreshedBadge={showRefreshedBadge}
          onLoginClick={() => setShowAuth(true)}
        />
      )}
    </div>
  )
}

// --- Subscription Tab ---

function SubscriptionTab({
  user,
  keywords,
  kwLoading,
  kwSyncing,
  kwSyncError,
  onAdd,
  onRemove,
  countdown,
  matchedGroups,
  matchedLoading,
  matchedError,
  lastRefreshedAt,
  showRefreshedBadge,
  onLoginClick,
}: {
  user: { token: string; username: string } | null
  keywords: string[]
  kwLoading: boolean
  kwSyncing: boolean
  kwSyncError: string | null
  onAdd: (kw: string) => void
  onRemove: (kw: string) => void
  countdown: ReturnType<typeof useCountdown>
  matchedGroups: KeywordMatchGroup[]
  matchedLoading: boolean
  matchedError: string | null
  lastRefreshedAt: Date | null
  showRefreshedBadge: boolean
  onLoginClick: () => void
}) {
  const [input, setInput] = useState('')

  const handleAdd = () => {
    if (input.trim()) {
      onAdd(input.trim())
      setInput('')
    }
  }

  // Not logged in
  if (!user) {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-muted">
          <Lock size={24} className="text-muted-foreground" />
        </div>
        <div>
          <p className="text-foreground font-medium mb-1">登录后即可使用订阅功能</p>
          <p className="text-sm text-muted-foreground">订阅关键词后，系统会自动匹配今日热点并推送</p>
        </div>
        <button
          onClick={onLoginClick}
          className="px-6 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition"
        >
          登录
        </button>
      </div>
    )
  }

  const totalMatched = matchedGroups.reduce((sum, g) => sum + g.items.length, 0)

  return (
    <div className="space-y-4">
      {/* Keyword Manager */}
      <div className="p-4 rounded-lg bg-card border border-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-foreground">订阅关键词</h3>
          <div className="flex items-center gap-2">
            {kwSyncing && <span className="text-xs text-muted-foreground">同步中...</span>}
            {kwSyncError && <span className="text-xs text-destructive">同步失败</span>}
          </div>
        </div>
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
        {kwLoading ? (
          <p className="text-sm text-muted-foreground">加载中...</p>
        ) : keywords.length > 0 ? (
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
          <p className="text-sm text-muted-foreground">暂无关键词，添加后系统将自动匹配热点</p>
        )}
      </div>

      {/* Countdown Bar */}
      {keywords.length > 0 && (
        <div className="p-3 rounded-lg bg-card border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">
              {countdown.isRunning
                ? `${formatTime(countdown.secondsLeft)} 后自动刷新`
                : countdown.isExpired
                  ? matchedLoading
                    ? '正在刷新...'
                    : '等待刷新'
                  : '添加关键词后开始倒计时'}
            </span>
            <div className="flex items-center gap-2">
              {showRefreshedBadge && (
                <span className="inline-flex items-center gap-1 text-xs text-primary">
                  <CheckCircle size={12} />
                  已刷新
                </span>
              )}
              {lastRefreshedAt && !showRefreshedBadge && (
                <span className="text-xs text-muted-foreground">
                  上次刷新 {lastRefreshedAt.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              {matchedLoading && <RefreshCw size={14} className="animate-spin text-primary" />}
            </div>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-1000 ease-linear"
              style={{ width: `${countdown.progress * 100}%` }}
            />
          </div>
          {matchedError && <p className="text-xs text-destructive mt-2">{matchedError}</p>}
        </div>
      )}

      {/* Grouped Results */}
      {keywords.length > 0 && matchedGroups.length > 0 && (
        <div className="space-y-4">
          {totalMatched > 0 && (
            <div className="flex items-center gap-2">
              <Star size={14} className="text-primary" />
              <span className="text-sm font-medium text-primary">
                订阅命中 ({totalMatched} 条 · {matchedGroups.filter((g) => g.items.length > 0).length} 个关键词)
              </span>
            </div>
          )}
          {matchedGroups.map((group) => (
            <div key={group.keyword}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium px-2 py-0.5 rounded bg-primary/10 text-primary">{group.keyword}</span>
                <span className="text-xs text-muted-foreground">{group.items.length} 条匹配</span>
              </div>
              {group.items.length > 0 ? (
                <div className="space-y-2">
                  {group.items.map((it) => (
                    <NewsItemCard key={`sub-${group.keyword}-${it.platformId}-${it.id}`} item={it} highlighted />
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground ml-1">暂无匹配</p>
              )}
            </div>
          ))}
        </div>
      )}

      {keywords.length > 0 && matchedGroups.length === 0 && !matchedLoading && (
        <p className="text-center text-muted-foreground py-8">
          倒计时结束后将自动拉取匹配结果
        </p>
      )}
    </div>
  )
}

// --- Helpers ---

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

// --- Subcomponents ---

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
        active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'
      }`}
    >
      {label}
    </button>
  )
}

function DigestCard({ digest }: { digest: Digest }) {
  return (
    <div className="p-4 rounded-lg bg-card border border-primary/20">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-primary">AI 日报 · {digest.date}</h3>
        <span className="text-xs text-muted-foreground">{new Date(digest.generatedAt).toLocaleString('zh-CN')}</span>
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
