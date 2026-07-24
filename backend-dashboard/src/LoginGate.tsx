import { useState, useEffect, createContext, useContext, type ReactNode } from 'react'
import { Lock, Eye, EyeOff } from 'lucide-react'
import { fetchHealth, getAdminPassword, setAdminPassword } from './api'

// ── Auth Context ──────────────────────────────────────────────
interface AuthCtx {
  unlocked: boolean
  unlock: (pw: string) => Promise<boolean>
  lock: () => void
}

const AuthContext = createContext<AuthCtx>({ unlocked: false, unlock: async () => false, lock: () => {} })

export function useAuth() { return useContext(AuthContext) }

export function AuthProvider({ children }: { children: ReactNode }) {
  // 有保存密码就视为已解锁（密码错误时后端各接口会返回 401 并自然降级）
  const [unlocked, setUnlocked] = useState(() => !!getAdminPassword())

  const unlock = async (pw: string): Promise<boolean> => {
    setAdminPassword(pw)
    setUnlocked(true)
    return true
  }

  const lock = () => {
    setAdminPassword('')
    setUnlocked(false)
  }

  return (
    <AuthContext.Provider value={{ unlocked, unlock, lock }}>
      {children}
    </AuthContext.Provider>
  )
}

// ── Login Gate ──────────────────────────────────────────────
export default function LoginGate({ children }: { children: ReactNode }) {
  const { unlocked, unlock } = useAuth()
  const [pw, setPw]           = useState('')
  const [showPw, setShowPw]   = useState(false)
  const [checking, setChecking] = useState(false)
  const [error, setError]     = useState('')
  const [apiStatus, setApiStatus] = useState<'ok' | 'offline' | 'checking'>('checking')

  useEffect(() => {
    fetchHealth()
      .then(() => setApiStatus('ok'))
      .catch(() => setApiStatus('offline'))
  }, [])

  if (unlocked) return <>{children}</>

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pw.trim()) { setError('请输入密码'); return }
    setChecking(true)
    setError('')
    const ok = await unlock(pw.trim())
    setChecking(false)
    if (!ok) setError('密码错误')
  }

  // 允许无密码直接进入（访客模式，只有公开接口可用）
  const enterGuest = () => unlock('')

  return (
    <div style={{
      minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      background:'var(--bg)',
    }}>
      <div style={{
        width:'100%', maxWidth:380,
        background:'var(--surface)', border:'1px solid var(--border)',
        borderRadius:12, padding:'2rem',
      }}>
        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:'1.75rem' }}>
          <div style={{ fontSize:28, marginBottom:6 }}>⛸</div>
          <div style={{ fontSize:18, fontWeight:700 }}>ForeverArt</div>
          <div style={{ fontSize:12, color:'var(--muted)', marginTop:3 }}>Spin Knowledge Workbench</div>
        </div>

        {/* API 状态 */}
        <div style={{
          display:'flex', alignItems:'center', gap:6, marginBottom:'1.25rem',
          padding:'0.5rem 0.75rem',
          background: apiStatus === 'ok' ? 'var(--ok-dim)' : apiStatus === 'offline' ? 'var(--warn-dim)' : 'var(--surface-2)',
          borderRadius:6, fontSize:12,
        }}>
          <span className={`dot ${apiStatus === 'ok' ? 'dot-ok' : apiStatus === 'offline' ? 'dot-warn' : 'dot-warn'}`}/>
          {apiStatus === 'ok'      && <span style={{ color:'var(--ok)' }}>API 服务正常</span>}
          {apiStatus === 'offline' && <span style={{ color:'var(--warn)' }}>API 离线 — 演示模式可用</span>}
          {apiStatus === 'checking'&& <span style={{ color:'var(--muted)' }}>检测 API…</span>}
        </div>

        <form onSubmit={submit}>
          <div style={{ marginBottom:'1rem' }}>
            <label style={{ fontSize:12, color:'var(--muted)', display:'block', marginBottom:'0.4rem' }}>
              管理员密码（可选）
            </label>
            <div style={{ position:'relative' }}>
              <input
                type={showPw ? 'text' : 'password'}
                className="input"
                style={{ width:'100%', paddingRight:'2.5rem' }}
                placeholder="X-Admin-Password"
                value={pw}
                onChange={e => setPw(e.target.value)}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                style={{ position:'absolute', right:'0.6rem', top:'50%', transform:'translateY(-50%)', background:'transparent', border:'none', cursor:'pointer', color:'var(--muted)', padding:0 }}
              >
                {showPw ? <EyeOff size={14}/> : <Eye size={14}/>}
              </button>
            </div>
            {error && <div style={{ fontSize:12, color:'var(--danger)', marginTop:4 }}>{error}</div>}
          </div>

          <button type="submit" className="btn" style={{ width:'100%', justifyContent:'center', marginBottom:'0.5rem' }} disabled={checking}>
            <Lock size={13} /> {checking ? '验证中…' : '进入工作台'}
          </button>

          <button type="button" className="btn-ghost" style={{ width:'100%', justifyContent:'center', fontSize:12 }} onClick={enterGuest}>
            访客模式（只读，无管理权限）
          </button>
        </form>

        <div style={{ marginTop:'1.25rem', fontSize:11, color:'var(--muted)', textAlign:'center', lineHeight:1.6 }}>
          密码来自服务器 <span className="mono">backend/.env</span> 中的 <span className="mono">ADMIN_PASSWORD</span><br/>
          缓存于浏览器 localStorage
        </div>
      </div>
    </div>
  )
}
