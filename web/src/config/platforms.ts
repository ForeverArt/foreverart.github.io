export type AppStatus = 'active' | 'coming_soon'

export interface PlatformApp {
  id: string
  title: string
  subtitle: string
  description: string
  path?: string
  status: AppStatus
  accent: string
  icon: 'headphones' | 'refresh' | 'jump' | 'skate' | 'newspaper'
}

export interface Platform {
  id: string
  title: string
  subtitle: string
  description: string
  path: string
  accent: string
  icon: 'life' | 'skate'
  apps: PlatformApp[]
}

export const platforms: Platform[] = [
  {
    id: 'life-tools',
    title: '生活工具平台',
    subtitle: 'Life Tools',
    description: '本地优先的日常效率工具。当前提供 Listening 听力材料合成和 News 热点资讯聚合。',
    path: '/platforms/life-tools',
    accent: 'from-sky-500/20 to-blue-600/10 border-sky-500/30 hover:border-sky-400/60',
    icon: 'life',
    apps: [
      {
        id: 'listening',
        title: 'Listening',
        subtitle: 'TTS 听力材料',
        description: '本地神经语音合成，支持中英文对话朗读，生成 MP3 与时间对照表。零后端、零外网、纯浏览器运行。',
        path: '/listening',
        status: 'active',
        accent: 'from-sky-500/20 to-blue-600/10 border-sky-500/30 hover:border-sky-400/60',
        icon: 'headphones',
      },
      {
        id: 'news',
        title: 'News Radar',
        subtitle: '热点资讯聚合',
        description: '多平台热榜聚合、关键词订阅、AI 日报。支持 RSS 输出，订阅你关心的热点。',
        path: '/news',
        status: 'active',
        accent: 'from-amber-500/20 to-orange-600/10 border-amber-500/30 hover:border-amber-400/60',
        icon: 'newspaper',
      },
    ],
  },
  {
    id: 'figure-skating',
    title: '花滑分析平台',
    subtitle: 'Figure Skating Analysis',
    description: '知识驱动的花样滑冰分析平台。旋转分析已开放；跳跃与滑行分析待开放。',
    path: '/platforms/figure-skating',
    accent: 'from-emerald-500/20 to-green-600/10 border-emerald-500/30 hover:border-emerald-400/60',
    icon: 'skate',
    apps: [
      {
        id: 'spin-tracker',
        title: 'Spin Tracker',
        subtitle: '旋转实时教练',
        description: '摄像头实时分析轴稳定、漂移与转速，提供 TTS 反馈（Axis / Speed / Travel）。',
        path: '/spin-tracker',
        status: 'active',
        accent: 'from-emerald-500/20 to-green-600/10 border-emerald-500/30 hover:border-emerald-400/60',
        icon: 'refresh',
      },
      {
        id: 'spin-analysis',
        title: 'Upright Spin 离线分析',
        subtitle: 'Offline Analysis MVP',
        description: '本地 mp4 → Feature → Rule → Event → Report JSON →（可选）Go LLM 生成 analysis.md。',
        path: '/spin-analysis',
        status: 'active',
        accent: 'from-teal-500/20 to-cyan-600/10 border-teal-500/30 hover:border-teal-400/60',
        icon: 'refresh',
      },
      {
        id: 'jump-analysis',
        title: '跳跃分析',
        subtitle: 'Jump Analysis',
        description: '起跳、空中姿态与落冰事件分析。结构已预留，功能待开放。',
        status: 'coming_soon',
        accent: 'from-amber-500/10 to-orange-600/5 border-amber-500/20',
        icon: 'jump',
      },
      {
        id: 'skating-analysis',
        title: '滑行分析',
        subtitle: 'Skating Analysis',
        description: '刃线、速度与身体倾斜分析。结构已预留，功能待开放。',
        status: 'coming_soon',
        accent: 'from-violet-500/10 to-indigo-600/5 border-violet-500/20',
        icon: 'skate',
      },
    ],
  },
]

export function getPlatform(id: string): Platform | undefined {
  return platforms.find(p => p.id === id)
}

/** Deep-link app → owning platform (for back navigation). */
export function getPlatformIdForAppPath(appPath: string): string | undefined {
  for (const platform of platforms) {
    if (platform.apps.some(app => app.path === appPath)) return platform.id
  }
  return undefined
}
