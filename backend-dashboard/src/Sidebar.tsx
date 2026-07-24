import { NavLink, useLocation } from 'react-router-dom'
import {
  Brain, FlaskConical, Sliders, Database,
  PlaySquare, Bot, LayoutDashboard, Activity,
  Video, MessageSquare, GitBranch, LogOut,
} from 'lucide-react'
import { useAuth } from './LoginGate'

const NAV_ITEMS = [
  { to: '/',            icon: LayoutDashboard, label: 'Dashboard',       exact: true },
  { section: 'AI 知识工作台' },
  { to: '/knowledge',   icon: Brain,           label: 'Knowledge'        },
  { to: '/graph',       icon: GitBranch,       label: 'Knowledge Graph'  },
  { to: '/features',    icon: FlaskConical,    label: 'Feature Lab'      },
  { to: '/rules',       icon: Sliders,         label: 'Rule Studio'      },
  { to: '/prompts',     icon: MessageSquare,   label: 'Prompt Center'    },
  { section: '数据 & 分析' },
  { to: '/pose',        icon: Video,           label: 'Pose Visualizer'  },
  { to: '/dataset',     icon: Database,        label: 'Dataset'          },
  { to: '/analysis',    icon: PlaySquare,      label: 'Analysis Viewer'  },
  { to: '/validation',  icon: Activity,        label: 'Validation Lab'   },
  { section: 'AI 辅助' },
  { to: '/workspace',   icon: Bot,             label: 'AI Workspace'     },
]

export default function Sidebar() {
  const location = useLocation()
  const { lock } = useAuth()

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-name">
          <span>⛸</span> ForeverArt
        </div>
        <div className="logo-sub">Spin Knowledge Workbench</div>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item, i) => {
          if ('section' in item) {
            return <div key={i} className="nav-section-label">{item.section}</div>
          }
          const Icon = item.icon!
          const isActive = item.exact
            ? location.pathname === item.to
            : location.pathname.startsWith(item.to!)
          return (
            <NavLink
              key={item.to}
              to={item.to!}
              className={`nav-item${isActive ? ' active' : ''}`}
            >
              <Icon size={15} />
              {item.label}
            </NavLink>
          )
        })}
      </nav>

      <div className="sidebar-footer" style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span>MVP v0.1</span>
        <button
          style={{ background:'transparent', border:'none', cursor:'pointer', color:'var(--muted)', padding:'2px 4px', display:'flex', alignItems:'center', gap:4, fontSize:11 }}
          onClick={lock}
          title="退出登录"
        >
          <LogOut size={12}/> 退出
        </button>
      </div>
    </aside>
  )
}
