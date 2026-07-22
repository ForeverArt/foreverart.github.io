import { useNavigate } from 'react-router-dom'
import { Headphones, RefreshCw } from 'lucide-react'

interface AppCard {
  icon: React.ReactNode
  title: string
  subtitle: string
  description: string
  path: string
  accent: string
}

const apps: AppCard[] = [
  {
    icon: <Headphones size={40} strokeWidth={1.5} />,
    title: 'Listening',
    subtitle: 'TTS 听力材料',
    description: '本地神经语音合成，支持中英文对话朗读，生成 MP3 与时间对照表。零后端、零外网、纯浏览器运行。',
    path: '/listening',
    accent: 'from-sky-500/20 to-blue-600/10 border-sky-500/30 hover:border-sky-400/60',
  },
  {
    icon: <RefreshCw size={40} strokeWidth={1.5} />,
    title: 'Spin Tracker',
    subtitle: '花样滑冰旋转检测',
    description: '使用摄像头与 MediaPipe 实时分析旋转轴心稳定性，提供倾斜角、漂移、转速、对称性评分与语音播报。',
    path: '/spin-tracker',
    accent: 'from-emerald-500/20 to-green-600/10 border-emerald-500/30 hover:border-emerald-400/60',
  },
]

export default function HomePage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      {/* 标题 */}
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-foreground mb-2">
          ForeverArt
        </h1>
        <p className="text-muted-foreground text-sm">选择应用</p>
      </div>

      {/* 应用卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">
        {apps.map((app) => (
          <button
            key={app.path}
            onClick={() => navigate(app.path)}
            className={`
              group relative flex flex-col items-start gap-4 p-6 rounded-xl
              bg-gradient-to-br ${app.accent}
              border text-left
              transition-all duration-200
              hover:scale-[1.02] hover:shadow-lg hover:shadow-black/30
              focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background
            `}
          >
            <div className="text-muted-foreground group-hover:text-foreground transition-colors">
              {app.icon}
            </div>
            <div>
              <div className="text-lg font-semibold text-foreground">{app.title}</div>
              <div className="text-xs text-muted-foreground mb-2">{app.subtitle}</div>
              <p className="text-sm text-muted-foreground leading-relaxed">{app.description}</p>
            </div>
          </button>
        ))}
      </div>

      {/* 版本 */}
      <div className="mt-12 text-xs text-muted-foreground/40 font-metric">
        {new Date(__BUILD_TIME__).toLocaleString('zh-CN', {
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit',
        })}
      </div>
    </div>
  )
}
