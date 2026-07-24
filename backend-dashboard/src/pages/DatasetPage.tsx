import { useState } from 'react'
import { Database, Search, PlayCircle, Download } from 'lucide-react'
import { SESSION_DATA, type SpinSession } from '../data'
import { useNavigate } from 'react-router-dom'

function gradeTag(g: string) {
  if (g === 'excellent') return <span className="tag tag-ok">Excellent</span>
  if (g === 'good')      return <span className="tag tag-warn">Good</span>
  return <span className="tag tag-danger">Poor</span>
}

type Filter = {
  grade: string
  skater: string
  minAxis: string
  maxDrift: string
  minSpeed: string
}

export default function DatasetPage() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<Filter>({
    grade: 'all', skater: 'all',
    minAxis: '', maxDrift: '', minSpeed: '',
  })
  const [sort, setSort] = useState<{ key: keyof SpinSession['features'] | 'date'; dir: 'asc' | 'desc' }>({
    key: 'date', dir: 'desc',
  })

  const skaters = Array.from(new Set(SESSION_DATA.map(s => s.skater)))

  const filtered = SESSION_DATA.filter(s => {
    if (filter.grade !== 'all' && s.grade !== filter.grade) return false
    if (filter.skater !== 'all' && s.skater !== filter.skater) return false
    if (filter.minAxis && s.features.axis_stability > parseFloat(filter.minAxis)) return false
    if (filter.maxDrift && s.features.center_drift > parseFloat(filter.maxDrift)) return false
    if (filter.minSpeed && s.features.speed < parseFloat(filter.minSpeed)) return false
    return true
  })

  const sorted = [...filtered].sort((a, b) => {
    let av: number, bv: number
    if (sort.key === 'date') {
      av = new Date(a.date).getTime()
      bv = new Date(b.date).getTime()
    } else {
      av = a.features[sort.key as keyof SpinSession['features']] as number
      bv = b.features[sort.key as keyof SpinSession['features']] as number
    }
    return sort.dir === 'asc' ? av - bv : bv - av
  })

  const setSort2 = (key: typeof sort.key) => {
    setSort(prev => ({ key, dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc' }))
  }

  const thArrow = (key: typeof sort.key) =>
    sort.key === key ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : ''

  return (
    <>
      <div className="topbar">
        <div className="topbar-title flex-center gap-sm">
          <Database size={16} /> Dataset Explorer
        </div>
        <div className="topbar-right">
          <span style={{ fontSize:12, color:'var(--muted)' }}>{filtered.length} / {SESSION_DATA.length} 条</span>
          <button className="btn-ghost btn-sm"><Download size={12} /> 导出 CSV</button>
          <button className="btn btn-sm">+ 导入视频</button>
        </div>
      </div>

      <div className="content">
        <div className="page-title">Dataset Explorer</div>
        <div className="page-sub">浏览 Spin Session · Feature 条件检索 · 未来训练数据</div>

        {/* 统计 */}
        <div className="stat-grid" style={{ gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))', marginBottom:'1rem' }}>
          <div className="stat-card">
            <div className="stat-val">{SESSION_DATA.length}</div>
            <div className="stat-lbl">总 Session</div>
          </div>
          <div className="stat-card">
            <div className="stat-val" style={{ color:'var(--ok)' }}>
              {(SESSION_DATA.reduce((a,b) => a + b.features.axis_stability, 0) / SESSION_DATA.length).toFixed(1)}°
            </div>
            <div className="stat-lbl">平均 Axis Stability</div>
          </div>
          <div className="stat-card">
            <div className="stat-val" style={{ color:'var(--accent)' }}>
              {Math.round(SESSION_DATA.reduce((a,b) => a + b.features.speed, 0) / SESSION_DATA.length)}
            </div>
            <div className="stat-lbl">平均转速 (rpm)</div>
          </div>
          <div className="stat-card">
            <div className="stat-val" style={{ color:'var(--ok)' }}>
              {SESSION_DATA.filter(s=>s.hasReport).length}
            </div>
            <div className="stat-lbl">已生成报告</div>
          </div>
        </div>

        {/* 过滤条件 */}
        <div className="card" style={{ padding:'0.75rem', marginBottom:'1rem' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', flexWrap:'wrap' }}>
            <Search size={13} style={{ color:'var(--muted)' }} />
            <span style={{ fontSize:12, color:'var(--muted)', marginRight:4 }}>过滤：</span>

            <select className="input" style={{ width:110 }} value={filter.grade} onChange={e => setFilter(p => ({...p, grade: e.target.value}))}>
              <option value="all">所有等级</option>
              <option value="excellent">Excellent</option>
              <option value="good">Good</option>
              <option value="poor">Poor</option>
            </select>

            <select className="input" style={{ width:100 }} value={filter.skater} onChange={e => setFilter(p => ({...p, skater: e.target.value}))}>
              <option value="all">所有选手</option>
              {skaters.map(s => <option key={s} value={s}>选手 {s}</option>)}
            </select>

            <input className="input" style={{ width:130 }} type="number" placeholder="Axis ≤ (°)"
              value={filter.minAxis} onChange={e => setFilter(p => ({...p, minAxis: e.target.value}))} />

            <input className="input" style={{ width:130 }} type="number" step={0.01} placeholder="Drift ≤"
              value={filter.maxDrift} onChange={e => setFilter(p => ({...p, maxDrift: e.target.value}))} />

            <input className="input" style={{ width:130 }} type="number" placeholder="Speed ≥ (rpm)"
              value={filter.minSpeed} onChange={e => setFilter(p => ({...p, minSpeed: e.target.value}))} />

            <button className="btn-ghost btn-sm" onClick={() => setFilter({ grade:'all', skater:'all', minAxis:'', maxDrift:'', minSpeed:'' })}>
              重置
            </button>
          </div>
        </div>

        {/* Session 表格 */}
        <div className="card" style={{ padding:0, overflow:'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Session ID</th>
                <th style={{ cursor:'pointer' }} onClick={() => setSort2('date')}>日期{thArrow('date')}</th>
                <th>选手</th>
                <th>时长</th>
                <th style={{ cursor:'pointer' }} onClick={() => setSort2('axis_stability')}>Axis{thArrow('axis_stability')}</th>
                <th style={{ cursor:'pointer' }} onClick={() => setSort2('speed')}>Speed{thArrow('speed')}</th>
                <th style={{ cursor:'pointer' }} onClick={() => setSort2('center_drift')}>Drift{thArrow('center_drift')}</th>
                <th>COM</th>
                <th>Incl.</th>
                <th>等级</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(s => (
                <tr key={s.id}>
                  <td><span className="mono" style={{ fontSize:11 }}>{s.id}</span></td>
                  <td className="muted" style={{ fontSize:11 }}>{s.date}</td>
                  <td>{s.skater}</td>
                  <td className="muted">{s.duration}s</td>
                  <td style={{ color: s.features.axis_stability < 2 ? 'var(--ok)' : s.features.axis_stability < 5 ? 'var(--warn)' : 'var(--danger)' }}>
                    {s.features.axis_stability.toFixed(1)}°
                  </td>
                  <td style={{ color: s.features.speed >= 120 ? 'var(--ok)' : s.features.speed >= 80 ? 'var(--warn)' : 'var(--danger)' }}>
                    {s.features.speed}
                  </td>
                  <td style={{ color: s.features.center_drift < 0.08 ? 'var(--ok)' : s.features.center_drift < 0.20 ? 'var(--warn)' : 'var(--danger)' }}>
                    {s.features.center_drift.toFixed(2)}
                  </td>
                  <td className="muted">{s.features.com_offset.toFixed(2)}</td>
                  <td className="muted">{s.features.inclination.toFixed(1)}°</td>
                  <td>{gradeTag(s.grade)}</td>
                  <td>
                    <div style={{ display:'flex', gap:4 }}>
                      {s.hasReport && (
                        <button className="btn-ghost btn-sm" onClick={() => navigate('/analysis')}>
                          <PlayCircle size={11} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr><td colSpan={11} style={{ textAlign:'center', color:'var(--muted)', padding:'2rem' }}>无匹配 Session</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 快速检索提示 */}
        <div className="card" style={{ marginTop:'0.5rem', borderColor:'rgba(88,166,255,0.2)', background:'var(--accent-dim)' }}>
          <div style={{ fontSize:12, color:'var(--muted)' }}>
            <span style={{ color:'var(--accent)', fontWeight:600 }}>快速检索示例：</span>
            {' '}设置 Axis ≤ 2° 找到 Excellent 轴稳定样本；设置 Speed ≥ 120 找高速旋转；Drift ≤ 0.08 找重心控制优秀动作。
            这些 Session 将成为未来算法升级的 Benchmark 数据集。
          </div>
        </div>
      </div>
    </>
  )
}
