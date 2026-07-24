import { useNavigate } from 'react-router-dom'
import { Headphones, Snowflake } from 'lucide-react'
import { platforms, type Platform } from '@/config/platforms'
import { IS_FS_DOMAIN, fsUrl } from '@/lib/domain'

function PlatformIcon({ icon }: { icon: Platform['icon'] }) {
  if (icon === 'life') return <Headphones size={40} strokeWidth={1.5} />
  return <Snowflake size={40} strokeWidth={1.5} />
}

/** Which platform lives on the other domain? */
function getExternalUrl(platformId: string): string | undefined {
  if (platformId === 'figure-skating' && !IS_FS_DOMAIN) return fsUrl('/')
  if (platformId === 'life-tools' && IS_FS_DOMAIN) return 'https://foreverart.github.io/platforms/life-tools'
  return undefined
}

export default function HomePage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-foreground mb-2">
          ForeverArt
        </h1>
        <p className="text-muted-foreground text-sm">选择平台</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">
        {platforms.map((platform) => (
          <button
            key={platform.id}
            onClick={() => {
              const ext = getExternalUrl(platform.id)
              if (ext) { window.location.href = ext; return }
              navigate(platform.path)
            }}
            className={`
              group relative flex flex-col items-start gap-4 p-6 rounded-xl
              bg-gradient-to-br ${platform.accent}
              border text-left
              transition-all duration-200
              hover:scale-[1.02] hover:shadow-lg hover:shadow-black/30
              focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background
            `}
          >
            <div className="text-muted-foreground group-hover:text-foreground transition-colors">
              <PlatformIcon icon={platform.icon} />
            </div>
            <div>
              <div className="text-lg font-semibold text-foreground">{platform.title}</div>
              <div className="text-xs text-muted-foreground mb-2">{platform.subtitle}</div>
              <p className="text-sm text-muted-foreground leading-relaxed">{platform.description}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-12 text-xs text-muted-foreground/40 font-metric">
        {new Date(__BUILD_TIME__).toLocaleString('zh-CN', {
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit',
        })}
      </div>
    </div>
  )
}
