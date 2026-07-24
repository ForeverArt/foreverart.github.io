import { useCallback, useEffect, useState } from 'react'
import { RefreshCw, Server, Zap, BarChart2, Clock } from 'lucide-react'
import { fetchHealth, fetchStats, type Health, type Stats } from '../api'
import { SESSION_DATA, FEATURE_DATA, RULE_DATA } from '../data'

const PASSWORD_KEY = 'foreverart-dashboard-password'
const POLL_MS = 15_000

function formatUptime(sec: number): string {
  if (sec < 60) return `${sec}s`
  if (sec < 3600) return `${Math.floor(sec / 60)}m ${sec % 60}s`
  const h = Math.floor(sec / 3600)
  if (h < 24) return `${h}h ${Math.floor((sec % 3600) / 60)}m`
  return `${Math.floor(h / 24)}d ${h % 24}h`
}

export default function DashboardPage() {
  const [health, setHealth] = useState<Health | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [password, setPassword] = useState(() => localStorage.getItem(PASSWORD_KEY) ?? '')
  const [healthError, setHealthError] = useState('')
  const [authError, setAuthError] = useState(false)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)

  const refresh = useCallback(async () => {
    try {
      setHealth(await fetchHealth())
      setHealthError('')
    } catch {
      setHealth(null)
      setHealthError('无法连接 API（/api/v1/healthz）')
    }
    const pwd = localStorage.getItem(PASSWORD_KEY) ?? ''
    if (pwd) {
      try {
        setStats(await fetchStats(pwd))
        setAuthError(false)
      } catch (e) {
        setStats(null)
        setAuthError(e instanceof Error && e.message === 'unauthorized')
      }
    }
    setUpdatedAt(new Date())
  }, [])

  useEffect(() => {
    refresh()
    const timer = setInterval(refresh, POLL_MS)
    return () => clearInterval(timer)
  }, [refresh])

  const savePassword = (value: string) => {
    setPassword(value)
    if (value) localStorage.setItem(PASSWORD_KEY, value)
    else { localStorage.removeItem(PASSWORD_KEY); setStats(null); setAuthError(false) }
  }

  const excellentCount = SESSION_DATA.filter(s => s.grade === 'excellent').length
  const goodCount      = SESSION_DATA.filter(s => s.grade === 'good').length
  const poorCount      = SESSION_DATA.filter(s => s.grade === 'poor').length

  return (
    <>
      <div className="topbar">
        <span className="topbar-title">Dashboard</span>
        <div className="topbar-right">
          {updatedAt && (
            <span className="muted" style={{ fontSize: 12 }}>
              <Clock size={12} style={{ display:'inline', marginRight:4 }} />
              {updatedAt.toLocaleTimeString()}
            </span>
          )}
          <button className="btn-ghost btn-sm" onClick={refresh}>
            <RefreshCw size={12} /> 刷新
          </button>
        </div>
      </div>

      <div className="content">
        <div className="page-title">Knowledge Workbench</div>
        <div className="page-sub">花样滑冰旋转分析平台 · Upright Spin MVP</div>

        {healthError && (
          <div style={{ background:'var(--danger-dim)', border:'1px solid var(--danger)', borderRadius:6, padding:'0.6rem 0.85rem', marginBottom:'1rem', fontSize:13, color:'var(--danger)' }}>
            {healthError}
          </div>
        )}

        {/* API 状态 */}
        <div className="section-title">API 服务</div>
        <div className="stat-grid" style={{ gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))' }}>
          <div className="stat-card">
            <div className="flex-center gap-sm mb-sm">
              <Server size={14} style={{ color:'var(--muted)' }} />
              <span style={{ fontSize:11, color:'var(--muted)' }}>服务状态</span>
            </div>
            {health ? (
              <>
                <div className="flex-center gap-sm">
                  <span className={`dot ${health.ok ? 'dot-ok' : 'dot-bad'}`} />
                  <span className="stat-val" style={{ fontSize:16 }}>{health.ok ? '正常' : '异常'}</span>
                </div>
                <div className="stat-lbl">{formatUptime(health.uptime_sec)} 在线</div>
              </>
            ) : (
              <div className="stat-val" style={{ fontSize:14, color:'var(--muted)' }}>未连接</div>
            )}
          </div>

          <div className="stat-card">
            <div className="flex-center gap-sm mb-sm">
              <Zap size={14} style={{ color:'var(--muted)' }} />
              <span style={{ fontSize:11, color:'var(--muted)' }}>LLM 模型</span>
            </div>
            <div className="stat-val" style={{ fontSize:14 }}>{health?.llm_model ?? '—'}</div>
            <div className="stat-lbl">
              <span className={`dot ${health?.llm_ready ? 'dot-ok' : 'dot-bad'}`} style={{ marginRight:4 }} />
              {health?.llm_ready ? '密钥就绪' : '未配置'}
            </div>
          </div>

          <div className="stat-card">
            <div className="flex-center gap-sm mb-sm">
              <BarChart2 size={14} style={{ color:'var(--muted)' }} />
              <span style={{ fontSize:11, color:'var(--muted)' }}>累计请求</span>
            </div>
            <div className="stat-val">{stats?.requests_total ?? '—'}</div>
            <div className="stat-lbl">进程内统计</div>
          </div>

          <div className="stat-card">
            <div style={{ fontSize:11, color:'var(--muted)', marginBottom:6 }}>最近报告</div>
            <div className="stat-val">{stats?.recent_reports.length ?? '—'}</div>
            <div className="stat-lbl">
              {stats ? `${stats.recent_reports.filter(r => r.status === 'success').length} 成功` : '需管理密码'}
            </div>
          </div>
        </div>

        {/* 知识库状态 */}
        <div className="section-title" style={{ marginTop:'0.5rem' }}>知识资产</div>
        <div className="stat-grid" style={{ gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))' }}>
          <div className="stat-card">
            <div className="stat-val" style={{ color:'var(--accent)' }}>{FEATURE_DATA.length}</div>
            <div className="stat-lbl">Active Features</div>
          </div>
          <div className="stat-card">
            <div className="stat-val" style={{ color:'var(--ok)' }}>{RULE_DATA.length}</div>
            <div className="stat-lbl">Rule 定义</div>
          </div>
          <div className="stat-card">
            <div className="stat-val" style={{ color:'var(--purple)' }}>6</div>
            <div className="stat-lbl">Knowledge 条目</div>
          </div>
          <div className="stat-card">
            <div className="stat-val" style={{ color:'var(--warn)' }}>3</div>
            <div className="stat-lbl">Prompt 版本</div>
          </div>
        </div>

        {/* Session 统计 */}
        <div className="section-title" style={{ marginTop:'0.5rem' }}>旋转 Session 统计</div>
        <div className="stat-grid" style={{ gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))' }}>
          <div className="stat-card">
            <div className="stat-val">{SESSION_DATA.length}</div>
            <div className="stat-lbl">总 Session</div>
          </div>
          <div className="stat-card">
            <div className="stat-val" style={{ color:'var(--ok)' }}>{excellentCount}</div>
            <div className="stat-lbl">Excellent</div>
            <div className="stat-delta delta-up">{Math.round(excellentCount/SESSION_DATA.length*100)}%</div>
          </div>
          <div className="stat-card">
            <div className="stat-val" style={{ color:'var(--warn)' }}>{goodCount}</div>
            <div className="stat-lbl">Good</div>
          </div>
          <div className="stat-card">
            <div className="stat-val" style={{ color:'var(--danger)' }}>{poorCount}</div>
            <div className="stat-lbl">Poor</div>
          </div>
        </div>

        {/* 近期 LLM 报告 */}
        {stats && stats.recent_reports.length > 0 && (
          <>
            <div className="section-title" style={{ marginTop:'0.5rem' }}>近期 LLM 调用</div>
            <div className="card" style={{ padding:0, overflow:'hidden' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>时间</th>
                    <th>Report ID</th>
                    <th>模型</th>
                    <th>状态</th>
                    <th>耗时</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recent_reports.slice(0, 8).map((r, i) => (
                    <tr key={i}>
                      <td className="muted" style={{ fontSize:12 }}>{new Date(r.at).toLocaleString()}</td>
                      <td><span className="mono" style={{ fontSize:11 }}>{r.report_id || '—'}</span></td>
                      <td><span className="mono" style={{ fontSize:11 }}>{r.model || '—'}</span></td>
                      <td><span className={`tag ${r.status === 'success' ? 'tag-ok' : 'tag-danger'}`}>{r.status}</span></td>
                      <td className="muted" style={{ fontSize:12 }}>{(r.latency_ms / 1000).toFixed(1)}s</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* 管理密码 */}
        <div className="section-title" style={{ marginTop:'0.5rem' }}>管理配置</div>
        <div className="card">
          <div className="card-title">管理密码</div>
          <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', flexWrap:'wrap' }}>
            <input
              type="password"
              className="input"
              style={{ width: 260 }}
              placeholder="X-Admin-Password"
              value={password}
              onChange={e => savePassword(e.target.value)}
            />
            {authError && <span style={{ fontSize:12, color:'var(--danger)' }}>密码错误</span>}
            {!authError && stats && <span style={{ fontSize:12, color:'var(--ok)' }}>已验证</span>}
          </div>
        </div>
      </div>
    </>
  )
}
