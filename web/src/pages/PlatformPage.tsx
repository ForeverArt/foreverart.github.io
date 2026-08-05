import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Headphones, RefreshCw, PersonStanding, Waves, Newspaper } from 'lucide-react'
import { getPlatform, type PlatformApp } from '@/config/platforms'
import { IS_FS_DOMAIN, fsUrl } from '@/lib/domain'

function AppIcon({ icon }: { icon: PlatformApp['icon'] }) {
  switch (icon) {
    case 'headphones':
      return <Headphones size={32} strokeWidth={1.5} />
    case 'refresh':
      return <RefreshCw size={32} strokeWidth={1.5} />
    case 'jump':
      return <PersonStanding size={32} strokeWidth={1.5} />
    case 'skate':
      return <Waves size={32} strokeWidth={1.5} />
    case 'newspaper':
      return <Newspaper size={32} strokeWidth={1.5} />
  }
}

export default function PlatformPage() {
  const { platformId } = useParams<{ platformId: string }>()
  const navigate = useNavigate()

  // FS domain root (/) has no platformId — default to figure-skating
  const resolvedId = platformId ?? (IS_FS_DOMAIN ? 'figure-skating' : undefined)
  const platform = resolvedId ? getPlatform(resolvedId) : undefined

  // Cross-domain redirect: FS platform lives on app.foreverart.vip, life tools on hub
  useEffect(() => {
    if (resolvedId === 'figure-skating' && !IS_FS_DOMAIN) {
      window.location.href = fsUrl('/')
    } else if (resolvedId === 'life-tools' && IS_FS_DOMAIN) {
      window.location.href = 'https://foreverart.github.io/platforms/life-tools'
    }
  }, [resolvedId])

  if (!platform) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-muted-foreground">未找到该平台</p>
        <button
          onClick={() => navigate('/')}
          className="text-sm text-foreground underline underline-offset-4"
        >
          返回首页
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-2xl mb-8">
        {!IS_FS_DOMAIN && (
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft size={15} />
            选择平台
          </button>
        )}
        <h1 className="text-3xl font-bold tracking-tight text-foreground mb-1">
          {platform.title}
        </h1>
        <p className="text-xs text-muted-foreground mb-2">{platform.subtitle}</p>
        <p className="text-sm text-muted-foreground leading-relaxed">{platform.description}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
        {platform.apps.map((app) => {
          const disabled = app.status === 'coming_soon'
          return (
            <button
              key={app.id}
              type="button"
              disabled={disabled}
              onClick={() => {
                if (!disabled && app.path) navigate(app.path)
              }}
              className={`
                group relative flex flex-col items-start gap-3 p-5 rounded-xl
                bg-gradient-to-br ${app.accent}
                border text-left
                transition-all duration-200
                ${disabled
                  ? 'opacity-60 cursor-not-allowed'
                  : 'hover:scale-[1.02] hover:shadow-lg hover:shadow-black/30 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background'}
              `}
            >
              <div className="flex w-full items-start justify-between gap-2">
                <div className="text-muted-foreground group-hover:text-foreground transition-colors">
                  <AppIcon icon={app.icon} />
                </div>
                {disabled && (
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground border border-border/60 rounded px-1.5 py-0.5">
                    待开放
                  </span>
                )}
              </div>
              <div>
                <div className="text-base font-semibold text-foreground">{app.title}</div>
                <div className="text-xs text-muted-foreground mb-2">{app.subtitle}</div>
                <p className="text-sm text-muted-foreground leading-relaxed">{app.description}</p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
