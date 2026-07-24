import { useState } from 'react'
import { FlaskConical, BookOpen, CheckCircle, AlertCircle } from 'lucide-react'
import { FEATURE_DATA, RULE_DATA, KNOWLEDGE_DATA, type FeatureDefinition } from '../data'

function statusTag(s: string) {
  if (s === 'active') return <span className="tag tag-ok">active</span>
  if (s === 'draft')  return <span className="tag tag-warn">draft</span>
  return <span className="tag tag-muted">deprecated</span>
}

export default function FeatureLabPage() {
  const [selected, setSelected] = useState<FeatureDefinition>(FEATURE_DATA[0])

  const relatedRule = RULE_DATA.find(r => r.featureId === selected.id)
  const relatedKnowledge = KNOWLEDGE_DATA.filter(k =>
    selected.knowledgeRef.includes(k.id)
  )

  return (
    <>
      <div className="topbar">
        <div className="topbar-title flex-center gap-sm">
          <FlaskConical size={16} /> Feature Lab
        </div>
        <div className="topbar-right">
          <button className="btn btn-sm">+ 新增 Feature</button>
        </div>
      </div>

      <div className="content">
        <div className="page-title">Feature Lab</div>
        <div className="page-sub">旋转算法工程师主阵地 · 定义 / 查看 / 调试 Feature</div>

        <div className="stat-grid" style={{ gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', marginBottom:'1.25rem' }}>
          <div className="stat-card">
            <div className="stat-val" style={{ color:'var(--ok)' }}>{FEATURE_DATA.filter(f=>f.status==='active').length}</div>
            <div className="stat-lbl">Active Features</div>
          </div>
          <div className="stat-card">
            <div className="stat-val" style={{ color:'var(--accent)' }}>{RULE_DATA.length}</div>
            <div className="stat-lbl">有规则覆盖</div>
          </div>
          <div className="stat-card">
            <div className="stat-val" style={{ color:'var(--warn)' }}>0</div>
            <div className="stat-lbl">待验证</div>
          </div>
          <div className="stat-card">
            <div className="stat-val" style={{ color:'var(--muted)' }}>spin</div>
            <div className="stat-lbl">当前 Namespace</div>
          </div>
        </div>

        <div className="row">
          {/* Feature 列表 */}
          <div style={{ width: 280, flexShrink: 0 }}>
            <div className="section-title">Spin Features</div>
            <div className="card" style={{ padding:'0.5rem', margin:0 }}>
              {FEATURE_DATA.map(f => (
                <div
                  key={f.id}
                  className={`knowledge-item${selected.id === f.id ? ' active' : ''}`}
                  onClick={() => setSelected(f)}
                >
                  <div style={{ fontWeight: selected.id === f.id ? 600 : 400, fontSize:13 }}>{f.name}</div>
                  <div className="ki-sub mono">{f.id}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Feature 详情 */}
          <div className="col">
            <div className="card" style={{ margin:0, marginBottom:'0.75rem' }}>
              <div className="flex-between mb-md">
                <div className="flex-center gap-sm">
                  <span style={{ fontSize:16, fontWeight:700 }}>{selected.name}</span>
                  {statusTag(selected.status)}
                  <span className="tag tag-muted">{selected.unit}</span>
                </div>
                <div className="flex-center gap-sm">
                  <button className="btn-ghost btn-sm">生成代码</button>
                  <button className="btn-ghost btn-sm">编辑</button>
                </div>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
                <div>
                  <div className="section-title">Feature ID</div>
                  <div className="mono" style={{ fontSize:12, color:'var(--accent)', marginBottom:'0.75rem' }}>{selected.id}</div>

                  <div className="section-title">输入 Landmarks</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:'0.25rem', marginBottom:'0.75rem' }}>
                    {selected.inputs.map(inp => (
                      <span key={inp} style={{ fontSize:12, color:'var(--text)' }}>
                        <span style={{ color:'var(--muted)', marginRight:4 }}>→</span>{inp}
                      </span>
                    ))}
                  </div>

                  <div className="section-title">输出范围</div>
                  <div style={{ fontSize:12, color:'var(--text)', marginBottom:'0.75rem' }}>{selected.outputRange}</div>

                  {selected.notes && (
                    <>
                      <div className="section-title">备注</div>
                      <div style={{ fontSize:12, color:'var(--muted)' }}>{selected.notes}</div>
                    </>
                  )}
                </div>

                <div>
                  <div className="section-title">计算公式</div>
                  <div className="code-block" style={{ fontSize:11, marginBottom:'0.75rem' }}>{selected.formula}</div>

                  <div className="section-title">验证方法</div>
                  <div style={{ fontSize:12, color:'var(--muted)', lineHeight:1.6, marginBottom:'0.75rem' }}>{selected.validation}</div>
                </div>
              </div>
            </div>

            {/* 关联 Rule */}
            {relatedRule && (
              <div className="card" style={{ margin:0, marginBottom:'0.75rem', borderColor:'rgba(63,185,80,0.25)' }}>
                <div className="card-title">
                  <CheckCircle size={13} style={{ color:'var(--ok)' }} /> 关联 Rule：{relatedRule.name}
                  <span className="tag tag-warn" style={{ marginLeft:4, fontSize:10 }}>{relatedRule.status}</span>
                </div>
                <table className="data-table" style={{ fontSize:12 }}>
                  <thead>
                    <tr>
                      <th>等级</th><th>条件</th><th>说明</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relatedRule.grades.map(g => (
                      <tr key={g.grade}>
                        <td>
                          <span className={`tag tag-${g.color === 'ok' ? 'ok' : g.color === 'warn' ? 'warn' : 'danger'}`}>
                            {g.grade}
                          </span>
                        </td>
                        <td><span className="mono">{g.condition}</span></td>
                        <td className="muted">{g.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {relatedRule.note && (
                  <div style={{ fontSize:11, color:'var(--muted)', marginTop:'0.5rem' }}>{relatedRule.note}</div>
                )}
              </div>
            )}

            {/* 关联 Knowledge */}
            {relatedKnowledge.length > 0 && (
              <div className="card" style={{ margin:0, borderColor:'rgba(188,140,255,0.2)' }}>
                <div className="card-title">
                  <BookOpen size={13} style={{ color:'var(--purple)' }} /> 知识来源
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
                  {relatedKnowledge.map(k => (
                    <div key={k.id} style={{ padding:'0.5rem 0.75rem', background:'var(--surface-2)', borderRadius:6, fontSize:12 }}>
                      <div style={{ fontWeight:600, marginBottom:2 }}>{k.title}</div>
                      <div className="muted" style={{ fontSize:11, lineHeight:1.5 }}>
                        {k.definition.slice(0, 100)}…
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 无规则提示 */}
            {!relatedRule && (
              <div className="card" style={{ margin:0, borderColor:'rgba(210,153,34,0.25)', background:'var(--warn-dim)' }}>
                <div className="flex-center gap-sm" style={{ fontSize:12, color:'var(--warn)' }}>
                  <AlertCircle size={13} /> 该 Feature 尚无对应 Rule，建议在 Rule Studio 中创建评分阈值。
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
