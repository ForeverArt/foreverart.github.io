import { useState } from 'react'
import { Brain, BookOpen, GitBranch, Link } from 'lucide-react'
import { KNOWLEDGE_DATA, type KnowledgeItem } from '../data'

const CATEGORIES = [
  { id: 'all',          label: '全部' },
  { id: 'biomechanics', label: '生物力学' },
  { id: 'physics',      label: '物理原理' },
  { id: 'isu',          label: 'ISU 规则' },
  { id: 'features',     label: 'Feature' },
  { id: 'rules',        label: 'Rule' },
  { id: 'prompts',      label: 'Prompt' },
]

function statusTag(s: string) {
  if (s === 'active') return <span className="tag tag-ok">active</span>
  if (s === 'draft')  return <span className="tag tag-warn">draft</span>
  return <span className="tag tag-muted">deprecated</span>
}

function categoryLabel(c: string) {
  return CATEGORIES.find(x => x.id === c)?.label ?? c
}

export default function KnowledgePage() {
  const [cat, setCat] = useState('all')
  const [selected, setSelected] = useState<KnowledgeItem>(KNOWLEDGE_DATA[0])
  const [tab, setTab] = useState<'detail' | 'history'>('detail')

  const filtered = KNOWLEDGE_DATA.filter(k => cat === 'all' || k.category === cat)

  return (
    <>
      <div className="topbar">
        <div className="topbar-title flex-center gap-sm">
          <Brain size={16} /> Knowledge Center
        </div>
        <div className="topbar-right">
          <button className="btn btn-sm">+ 导入论文</button>
          <button className="btn-ghost btn-sm">新增条目</button>
        </div>
      </div>

      <div className="content">
        <div className="page-title">Knowledge Center</div>
        <div className="page-sub">领域知识大脑 · 旋转生物力学 · ISU · 物理原理</div>

        <div className="row" style={{ alignItems:'stretch' }}>
          {/* 左侧分类 + 列表 */}
          <div style={{ width: 220, flexShrink: 0 }}>
            <div className="card" style={{ padding:'0.5rem', marginBottom:'0.75rem' }}>
              {CATEGORIES.map(c => (
                <div
                  key={c.id}
                  className={`knowledge-item${cat === c.id ? ' active' : ''}`}
                  onClick={() => setCat(c.id)}
                >
                  {c.label}
                  <span className="muted" style={{ float:'right', fontSize:11 }}>
                    {c.id === 'all' ? KNOWLEDGE_DATA.length : KNOWLEDGE_DATA.filter(k => k.category === c.id).length}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 中间列表 */}
          <div style={{ width: 200, flexShrink: 0 }}>
            <div className="card" style={{ padding:'0.5rem', height:'100%', margin:0 }}>
              {filtered.map(k => (
                <div
                  key={k.id}
                  className={`knowledge-item${selected.id === k.id ? ' active' : ''}`}
                  onClick={() => { setSelected(k); setTab('detail') }}
                >
                  <div style={{ fontWeight: selected.id === k.id ? 600 : 400 }}>{k.title}</div>
                  <div className="ki-sub">{categoryLabel(k.category)} · {k.version}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 右侧详情 */}
          <div className="col">
            <div className="card" style={{ margin:0 }}>
              <div className="flex-between mb-md">
                <div className="flex-center gap-sm">
                  <BookOpen size={15} style={{ color:'var(--accent)' }} />
                  <span style={{ fontSize:15, fontWeight:600 }}>{selected.title}</span>
                  {statusTag(selected.status)}
                  <span className="tag tag-muted">{selected.version}</span>
                  <span className="tag tag-purple" style={{ fontSize:10 }}>{categoryLabel(selected.category)}</span>
                </div>
                <button className="btn-ghost btn-sm">编辑</button>
              </div>

              <div className="tab-list">
                <div className={`tab-item${tab === 'detail' ? ' active' : ''}`} onClick={() => setTab('detail')}>详情</div>
                <div className={`tab-item${tab === 'history' ? ' active' : ''}`} onClick={() => setTab('history')}>版本历史</div>
              </div>

              {tab === 'detail' && (
                <div>
                  <div className="section-title">定义</div>
                  <p style={{ fontSize:13, lineHeight:1.7, marginBottom:'1rem', color:'var(--text)' }}>{selected.definition}</p>

                  {selected.formula && (
                    <>
                      <div className="section-title">公式</div>
                      <div className="code-block" style={{ marginBottom:'1rem' }}>{selected.formula}</div>
                    </>
                  )}

                  {selected.importance && (
                    <>
                      <div className="section-title">重要性</div>
                      <p style={{ fontSize:13, lineHeight:1.7, marginBottom:'1rem', color:'var(--text)' }}>{selected.importance}</p>
                    </>
                  )}

                  {(selected.relatedFeatures?.length || selected.relatedRules?.length) && (
                    <>
                      <div className="section-title">关联</div>
                      <div className="flex-center gap-sm" style={{ flexWrap:'wrap', marginBottom:'1rem' }}>
                        {selected.relatedFeatures?.map(f => (
                          <span key={f} className="tag tag-accent" style={{ fontFamily:'monospace', fontSize:11 }}>{f}</span>
                        ))}
                        {selected.relatedRules?.map(r => (
                          <span key={r} className="tag tag-ok" style={{ fontSize:11 }}>{r}</span>
                        ))}
                      </div>
                    </>
                  )}

                  {selected.references?.length && (
                    <>
                      <div className="section-title" style={{ display:'flex', alignItems:'center', gap:4 }}>
                        <Link size={11} /> 参考来源
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', gap:'0.3rem' }}>
                        {selected.references.map(r => (
                          <span key={r} style={{ fontSize:12, color:'var(--muted)', fontFamily:'monospace' }}>{r}</span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {tab === 'history' && (
                <div>
                  <div className="timeline">
                    {selected.history.map((h, i) => (
                      <div key={i} className="tl-item">
                        <div className="tl-time">{h.version}{i === 0 ? ' · 最新' : ''}</div>
                        <div>{h.note}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 知识图谱提示 */}
            <div className="card" style={{ borderColor:'rgba(88,166,255,0.2)', background:'var(--accent-dim)' }}>
              <div className="flex-center gap-sm" style={{ fontSize:12, color:'var(--accent)' }}>
                <GitBranch size={13} />
                <span style={{ fontWeight:600 }}>知识图谱</span>
                <span style={{ color:'var(--muted)' }}>— {selected.title} 关联链路：</span>
              </div>
              <div style={{ fontSize:12, color:'var(--muted)', marginTop:'0.4rem', lineHeight:1.8, fontFamily:'monospace' }}>
                Knowledge: {selected.title}
                {selected.relatedFeatures?.length ? ` → Feature: ${selected.relatedFeatures.join(', ')}` : ''}
                {selected.relatedRules?.length ? ` → Rule: ${selected.relatedRules.join(', ')} → LLM Report` : ''}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
