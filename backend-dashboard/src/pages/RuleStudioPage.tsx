import { useState, useEffect } from 'react'
import { Sliders, Save, CheckCircle, AlertTriangle, History } from 'lucide-react'
import { RULE_DATA, SESSION_DATA, type RuleDefinition, type RuleGrade } from '../data'
import { saveRuleThresholds, loadSavedRules } from '../api'

function gradeColor(c: RuleGrade['color']) {
  if (c === 'ok')   return 'var(--ok)'
  if (c === 'warn') return 'var(--warn)'
  return 'var(--danger)'
}

// 评估单个 session 在某条 rule 下的等级
function evalGrade(featureId: string, value: number, grades: RuleGrade[]): string {
  // 数值越小越好的 feature（角度、漂移）
  const ascending = ['spin.axis_stability','spin.center_drift','spin.com_offset_proxy','spin.inclination','spin.angular_deceleration']
  const isAsc = ascending.includes(featureId)
  const sorted = [...grades].sort((a, b) => isAsc ? a.value - b.value : b.value - a.value)
  for (const g of sorted) {
    if (isAsc ? value < g.value : value >= g.value) return g.grade
  }
  return sorted[sorted.length - 1]?.grade ?? 'poor'
}

function RuleCard({
  rule,
  onSave,
}: {
  rule: RuleDefinition
  onSave: (id: string, grades: RuleGrade[]) => void
}) {
  const saved = loadSavedRules()
  const savedGrades = saved[rule.id]?.grades

  const [grades, setGrades] = useState<RuleGrade[]>(() =>
    rule.grades.map((g, i) => ({
      ...g,
      value: savedGrades?.[i]?.value ?? g.value,
    }))
  )
  const [justSaved, setJustSaved] = useState(false)
  const [showImpact, setShowImpact] = useState(false)

  const updateValue = (i: number, val: string) => {
    const n = parseFloat(val)
    if (isNaN(n)) return
    setGrades(prev => prev.map((g, idx) => idx === i ? { ...g, value: n } : g))
    setJustSaved(false)
  }

  const handleSave = () => {
    saveRuleThresholds(rule.id, grades.map(g => ({ grade: g.grade, value: g.value, unit: g.unit })))
    onSave(rule.id, grades)
    setJustSaved(true)
    setTimeout(() => setJustSaved(false), 2000)
  }

  // 计算受影响 Session
  const featureKey = rule.featureId.replace('spin.', '') as keyof typeof SESSION_DATA[0]['features']
  const impactedSessions = SESSION_DATA.filter(s => {
    const val = s.features[featureKey]
    if (val === undefined) return false
    const origGrade = evalGrade(rule.featureId, val, rule.grades)
    const newGrade  = evalGrade(rule.featureId, val, grades)
    return origGrade !== newGrade
  })

  const maxVal = Math.max(...grades.map(g => g.value)) || 1
  const savedAt = saved[rule.id]?.savedAt

  return (
    <div className="card" style={{ borderColor: justSaved ? 'rgba(63,185,80,0.4)' : undefined }}>
      <div className="flex-between mb-md">
        <div className="flex-center gap-sm" style={{ flexWrap:'wrap' }}>
          <span style={{ fontWeight:600, fontSize:14 }}>{rule.name}</span>
          <span className={`tag tag-${rule.status === 'heuristic' ? 'warn' : 'ok'}`}>{rule.status}</span>
          {savedAt && (
            <span style={{ fontSize:10, color:'var(--muted)', fontFamily:'monospace' }}>
              已保存 {new Date(savedAt).toLocaleTimeString()}
            </span>
          )}
        </div>
        <div className="flex-center gap-sm">
          {impactedSessions.length > 0 && (
            <button
              className="btn-ghost btn-sm"
              onClick={() => setShowImpact(v => !v)}
              style={{ color:'var(--warn)', borderColor:'rgba(210,153,34,0.4)' }}
            >
              <AlertTriangle size={11} /> {impactedSessions.length} 条受影响
            </button>
          )}
          <button
            className="btn-sm"
            onClick={handleSave}
            style={{ background: justSaved ? 'var(--ok)' : 'var(--accent)', color:'#0d1117', border:'none', borderRadius:5, cursor:'pointer', display:'flex', alignItems:'center', gap:4, fontWeight:600 }}
          >
            {justSaved ? <><CheckCircle size={11} /> 已保存</> : <><Save size={11} /> 保存</>}
          </button>
        </div>
      </div>

      <div style={{ fontSize:11, color:'var(--muted)', marginBottom:'0.75rem', fontFamily:'monospace' }}>
        {rule.featureId}
      </div>

      {grades.map((g, i) => (
        <div key={g.grade} className="threshold-row">
          <div className="threshold-grade" style={{ color: gradeColor(g.color) }}>{g.grade}</div>
          <input
            type="number"
            className="threshold-input"
            value={g.value}
            step={g.unit === '°' || g.unit === 'rpm/s' ? 0.5 : 0.01}
            onChange={e => updateValue(i, e.target.value)}
          />
          <span style={{ fontSize:11, color:'var(--muted)', width:44 }}>{g.unit}</span>
          <div style={{ flex:1 }}>
            <div className="prog-wrap">
              <div className="prog-bar" style={{
                width: `${Math.min((g.value / maxVal) * 100, 100)}%`,
                background: gradeColor(g.color),
              }}/>
            </div>
          </div>
        </div>
      ))}

      {rule.warnBand && (
        <div style={{ marginTop:'0.5rem', fontSize:11, color:'var(--warn)' }}>⚠ 警告区间：{rule.warnBand}</div>
      )}
      {rule.note && (
        <div style={{ marginTop:'0.25rem', fontSize:11, color:'var(--muted)' }}>{rule.note}</div>
      )}

      {/* 影响分析展开 */}
      {showImpact && impactedSessions.length > 0 && (
        <div style={{ marginTop:'0.75rem', borderTop:'1px solid var(--border)', paddingTop:'0.65rem' }}>
          <div style={{ fontSize:11, fontWeight:600, color:'var(--warn)', marginBottom:'0.4rem', display:'flex', alignItems:'center', gap:4 }}>
            <AlertTriangle size={11} /> 阈值变更影响以下 Session（等级将改变）
          </div>
          {impactedSessions.map(s => {
            const val = s.features[featureKey] as number
            const origGrade = evalGrade(rule.featureId, val, rule.grades)
            const newGrade  = evalGrade(rule.featureId, val, grades)
            return (
              <div key={s.id} style={{ display:'flex', alignItems:'center', gap:'0.5rem', fontSize:11, marginBottom:'0.3rem' }}>
                <span className="mono" style={{ color:'var(--muted)' }}>{s.id}</span>
                <span>{s.skater} · {new Date(s.date).toLocaleDateString()}</span>
                <span className="mono">{val.toFixed(2)}</span>
                <span style={{ color:'var(--muted)' }}>{origGrade}</span>
                <span style={{ color:'var(--muted)' }}>→</span>
                <span style={{ color: newGrade === 'Excellent' ? 'var(--ok)' : newGrade === 'Good' ? 'var(--warn)' : 'var(--danger)', fontWeight:600 }}>{newGrade}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function RuleStudioPage() {
  const [rules, setRules] = useState<RuleDefinition[]>(() =>
    RULE_DATA.map(r => {
      const saved = loadSavedRules()[r.id]
      if (!saved) return r
      return {
        ...r,
        grades: r.grades.map((g, i) => ({
          ...g,
          value: saved.grades[i]?.value ?? g.value,
        })),
      }
    })
  )
  const [globalSaved, setGlobalSaved] = useState(false)
  const [savedCount, setSavedCount] = useState(0)

  useEffect(() => {
    setSavedCount(Object.keys(loadSavedRules()).length)
  }, [])

  const handleSave = (id: string, grades: RuleGrade[]) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, grades } : r))
    setSavedCount(Object.keys(loadSavedRules()).length)
  }

  const saveAll = () => {
    rules.forEach(r => {
      saveRuleThresholds(r.id, r.grades.map(g => ({ grade: g.grade, value: g.value, unit: g.unit })))
    })
    setGlobalSaved(true)
    setSavedCount(rules.length)
    setTimeout(() => setGlobalSaved(false), 2500)
  }

  return (
    <>
      <div className="topbar">
        <div className="topbar-title flex-center gap-sm">
          <Sliders size={16} /> Rule Studio
        </div>
        <div className="topbar-right">
          <div className="flex-center gap-sm">
            <History size={12} style={{ color:'var(--muted)' }}/>
            <span style={{ fontSize:11, color:'var(--muted)' }}>{savedCount}/{rules.length} 条已持久化到 localStorage</span>
          </div>
          <button
            className="btn btn-sm"
            onClick={saveAll}
            style={globalSaved ? { background:'var(--ok)' } : {}}
          >
            {globalSaved ? '✓ 全部已保存' : '保存全部'}
          </button>
        </div>
      </div>

      <div className="content">
        <div className="page-title">Rule Studio</div>
        <div className="page-sub">可视化配置评分阈值 · 保存即持久化 · 自动分析受影响 Session</div>

        {/* 关系图 */}
        <div className="card" style={{ marginBottom:'1rem' }}>
          <div className="card-title">Feature → Rule → LLM Report 链路</div>
          <svg viewBox="0 0 580 130" xmlns="http://www.w3.org/2000/svg" style={{ width:'100%', height:'auto' }}>
            <defs>
              <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
                <path d="M0,0 L10,5 L0,10 Z" fill="#8b949e"/>
              </marker>
            </defs>
            {['Axis', 'Speed', 'Drift', 'Incl.', 'Decel.'].map((n, i) => (
              <g key={n}>
                <rect x={10+i*88} y={10} width={76} height={28} rx={5} fill="rgba(88,166,255,0.1)" stroke="rgba(88,166,255,0.4)"/>
                <text x={48+i*88} y={29} textAnchor="middle" fill="#e6edf3" fontSize={11}>{n}</text>
              </g>
            ))}
            {[0,1,2,3,4].map(i => (
              <line key={i} x1={48+i*88} y1={38} x2={48+i*88} y2={56} stroke="#8b949e" strokeWidth={1.2} markerEnd="url(#arr)"/>
            ))}
            {['Axis Rule','Speed Rule','Travel Rule','Incl. Rule','Decel. Rule'].map((n, i) => (
              <g key={n}>
                <rect x={10+i*88} y={56} width={76} height={28} rx={5} fill="rgba(63,185,80,0.1)" stroke="rgba(63,185,80,0.35)"/>
                <text x={48+i*88} y={75} textAnchor="middle" fill="#e6edf3" fontSize={10}>{n}</text>
              </g>
            ))}
            {[0,1,2,3,4].map(i => (
              <line key={i} x1={48+i*88} y1={84} x2={290} y2={102} stroke="#8b949e" strokeWidth={1} strokeDasharray="4,3" markerEnd="url(#arr)"/>
            ))}
            <rect x={230} y={102} width={120} height={28} rx={5} fill="rgba(188,140,255,0.12)" stroke="rgba(188,140,255,0.4)"/>
            <text x={290} y={121} textAnchor="middle" fill="#bc8cff" fontSize={12} fontWeight={600}>LLM Report</text>
          </svg>
        </div>

        {/* Rule 卡片两列 */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem' }}>
          {rules.slice(0, 4).map(r => (
            <RuleCard key={r.id} rule={r} onSave={handleSave} />
          ))}
        </div>
        {rules.slice(4).map(r => (
          <RuleCard key={r.id} rule={r} onSave={handleSave} />
        ))}
      </div>
    </>
  )
}
