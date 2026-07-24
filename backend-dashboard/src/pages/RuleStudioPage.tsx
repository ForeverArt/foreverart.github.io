import { useState } from 'react'
import { Sliders, Save, CheckCircle } from 'lucide-react'
import { RULE_DATA, FEATURE_DATA, type RuleDefinition, type RuleGrade } from '../data'

function gradeColor(c: RuleGrade['color']) {
  if (c === 'ok')     return 'var(--ok)'
  if (c === 'warn')   return 'var(--warn)'
  return 'var(--danger)'
}

function RuleCard({
  rule,
  onSave,
}: {
  rule: RuleDefinition
  onSave: (id: string, grades: RuleGrade[]) => void
}) {
  const [grades, setGrades] = useState<RuleGrade[]>(() => rule.grades.map(g => ({ ...g })))
  const [saved, setSaved] = useState(false)

  const updateValue = (i: number, val: string) => {
    const n = parseFloat(val)
    if (isNaN(n)) return
    setGrades(prev => prev.map((g, idx) => idx === i ? { ...g, value: n, condition: `${g.condition.replace(/[\d.]+/, String(n))}` } : g))
    setSaved(false)
  }

  const handleSave = () => {
    onSave(rule.id, grades)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const feature = FEATURE_DATA.find(f => f.id === rule.featureId)
  const maxVal = Math.max(...grades.map(g => g.value)) || 1

  return (
    <div className="card">
      <div className="flex-between mb-md">
        <div className="flex-center gap-sm">
          <span style={{ fontWeight:600, fontSize:14 }}>{rule.name}</span>
          <span className={`tag tag-${rule.status === 'heuristic' ? 'warn' : rule.status === 'isu' ? 'ok' : 'muted'}`}>
            {rule.status}
          </span>
        </div>
        <button
          className={saved ? 'btn btn-sm' : 'btn-ghost btn-sm'}
          onClick={handleSave}
          style={saved ? { background:'var(--ok)', color:'#fff' } : {}}
        >
          {saved ? <><CheckCircle size={11} /> 已保存</> : <><Save size={11} /> 保存</>}
        </button>
      </div>

      <div style={{ fontSize:11, color:'var(--muted)', marginBottom:'0.75rem', fontFamily:'monospace' }}>
        Feature: {rule.featureId} · 单位: {feature?.unit ?? '—'}
      </div>

      {grades.map((g, i) => (
        <div key={g.grade} className="threshold-row">
          <div className="threshold-grade" style={{ color: gradeColor(g.color) }}>{g.grade}</div>
          <input
            type="number"
            className="threshold-input"
            defaultValue={g.value}
            step={g.unit === '°' || g.unit === 'rpm/s' ? 0.5 : 0.01}
            onChange={e => updateValue(i, e.target.value)}
          />
          <span style={{ fontSize:11, color:'var(--muted)', width:40 }}>{g.unit}</span>
          <div style={{ flex:1 }}>
            <div className="prog-wrap">
              <div
                className="prog-bar"
                style={{
                  width: `${Math.min((g.value / maxVal) * 100, 100)}%`,
                  background: gradeColor(g.color),
                }}
              />
            </div>
          </div>
          <div className="threshold-desc">{g.condition}</div>
        </div>
      ))}

      {rule.warnBand && (
        <div style={{ marginTop:'0.6rem', fontSize:11, color:'var(--warn)' }}>
          ⚠ 警告区间：{rule.warnBand}
        </div>
      )}
      {rule.note && (
        <div style={{ marginTop:'0.3rem', fontSize:11, color:'var(--muted)' }}>{rule.note}</div>
      )}
    </div>
  )
}

export default function RuleStudioPage() {
  const [rules, setRules] = useState<RuleDefinition[]>(RULE_DATA)
  const [globalSaved, setGlobalSaved] = useState(false)

  const handleSave = (id: string, grades: RuleGrade[]) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, grades } : r))
  }

  const saveAll = () => {
    setGlobalSaved(true)
    setTimeout(() => setGlobalSaved(false), 2500)
  }

  return (
    <>
      <div className="topbar">
        <div className="topbar-title flex-center gap-sm">
          <Sliders size={16} /> Rule Studio
        </div>
        <div className="topbar-right">
          <span style={{ fontSize:12, color:'var(--muted)' }}>修改即时预览 · 保存写入 rules.json</span>
          <button
            className={globalSaved ? 'btn btn-sm' : 'btn btn-sm'}
            onClick={saveAll}
            style={globalSaved ? { background:'var(--ok)' } : {}}
          >
            {globalSaved ? '✓ 全部已保存' : '保存全部规则'}
          </button>
        </div>
      </div>

      <div className="content">
        <div className="page-title">Rule Studio</div>
        <div className="page-sub">可视化配置评分阈值 · 修改无需改代码 · 旋转专项</div>

        <div className="row">
          <div className="col">
            {/* 规则关系图 */}
            <div className="card" style={{ marginBottom:'1rem' }}>
              <div className="card-title">规则 → Feature → LLM 关系</div>
              <svg viewBox="0 0 580 130" xmlns="http://www.w3.org/2000/svg" style={{ width:'100%', height:'auto' }}>
                <defs>
                  <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
                    <path d="M0,0 L10,5 L0,10 Z" fill="#8b949e"/>
                  </marker>
                </defs>
                {/* Feature nodes */}
                {['Axis', 'Speed', 'Drift', 'Incl.', 'Decel.'].map((n, i) => (
                  <g key={n}>
                    <rect x={10 + i*88} y={10} width={76} height={28} rx={5}
                      fill="rgba(88,166,255,0.1)" stroke="rgba(88,166,255,0.4)"/>
                    <text x={48 + i*88} y={29} textAnchor="middle" fill="#e6edf3" fontSize={11}>{n}</text>
                  </g>
                ))}
                {/* Arrows */}
                {[0,1,2,3,4].map(i => (
                  <line key={i} x1={48+i*88} y1={38} x2={48+i*88} y2={56}
                    stroke="#8b949e" strokeWidth={1.2} markerEnd="url(#arr)"/>
                ))}
                {/* Rule nodes */}
                {['Axis Rule', 'Speed Rule', 'Travel Rule', 'Incl. Rule', 'Decel. Rule'].map((n, i) => (
                  <g key={n}>
                    <rect x={10+i*88} y={56} width={76} height={28} rx={5}
                      fill="rgba(63,185,80,0.1)" stroke="rgba(63,185,80,0.35)"/>
                    <text x={48+i*88} y={75} textAnchor="middle" fill="#e6edf3" fontSize={10}>{n}</text>
                  </g>
                ))}
                {/* Converge arrows */}
                {[0,1,2,3,4].map(i => (
                  <line key={i} x1={48+i*88} y1={84} x2={290} y2={102}
                    stroke="#8b949e" strokeWidth={1} strokeDasharray="4,3" markerEnd="url(#arr)"/>
                ))}
                {/* LLM Report */}
                <rect x={230} y={102} width={120} height={28} rx={5}
                  fill="rgba(188,140,255,0.12)" stroke="rgba(188,140,255,0.4)"/>
                <text x={290} y={121} textAnchor="middle" fill="#bc8cff" fontSize={12} fontWeight={600}>LLM Report</text>
              </svg>
            </div>

            {/* Rule 卡片 — 两列 */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem' }}>
              {rules.slice(0, 4).map(r => (
                <RuleCard key={r.id} rule={r} onSave={handleSave} />
              ))}
            </div>
            {rules.slice(4).map(r => (
              <RuleCard key={r.id} rule={r} onSave={handleSave} />
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
