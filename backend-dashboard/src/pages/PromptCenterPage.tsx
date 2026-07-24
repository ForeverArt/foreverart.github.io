import { useState } from 'react'
import { MessageSquare, Plus, Save, Copy, CheckCircle, Clock, BarChart2, Edit3 } from 'lucide-react'
import { loadPrompts, savePrompts, type PromptVersion } from '../api'

const TYPE_LABELS: Record<string, string> = {
  report: '分析报告',
  coaching: '实时教练',
  explain: 'Feature 解释',
}

function typeTag(type: string) {
  if (type === 'report')   return <span className="tag tag-purple">报告</span>
  if (type === 'coaching') return <span className="tag tag-accent">教练</span>
  return <span className="tag tag-muted">解释</span>
}

export default function PromptCenterPage() {
  const [prompts, setPrompts] = useState<PromptVersion[]>(() => loadPrompts())
  const [selected, setSelected] = useState<PromptVersion>(prompts[0])
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [justCopied, setJustCopied] = useState(false)
  const [justSaved, setJustSaved] = useState(false)
  const [tab, setTab] = useState<'all' | 'report' | 'coaching' | 'explain'>('all')

  const filtered = prompts.filter(p => tab === 'all' || p.type === tab)

  const startEdit = () => {
    setEditContent(selected.content)
    setEditNotes(selected.notes ?? '')
    setEditing(true)
  }

  const saveVersion = () => {
    // 版本号自增
    const vNum = parseInt(selected.version.replace('v', '')) + 1
    const newVersion: PromptVersion = {
      ...selected,
      id: `${selected.type}-v${vNum}`,
      version: `v${vNum}`,
      content: editContent,
      notes: editNotes,
      createdAt: new Date().toISOString(),
      usageCount: 0,
    }
    const updated = [...prompts, newVersion]
    setPrompts(updated)
    savePrompts(updated)
    setSelected(newVersion)
    setEditing(false)
    setJustSaved(true)
    setTimeout(() => setJustSaved(false), 2000)
  }

  const copyContent = () => {
    navigator.clipboard.writeText(selected.content).catch(() => {})
    setJustCopied(true)
    setTimeout(() => setJustCopied(false), 1500)
  }

  const addNew = () => {
    const newP: PromptVersion = {
      id: `custom-v1-${Date.now()}`,
      name: '新 Prompt',
      type: 'report',
      version: 'v1',
      content: '在此输入 Prompt 内容…',
      createdAt: new Date().toISOString(),
      usageCount: 0,
      notes: '',
    }
    const updated = [newP, ...prompts]
    setPrompts(updated)
    savePrompts(updated)
    setSelected(newP)
    setEditContent(newP.content)
    setEditing(true)
  }

  // 找到同 type 的所有版本（版本历史）
  const sameTypeVersions = prompts
    .filter(p => p.type === selected.type)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return (
    <>
      <div className="topbar">
        <div className="topbar-title flex-center gap-sm">
          <MessageSquare size={16} /> Prompt Center
        </div>
        <div className="topbar-right">
          <button className="btn btn-sm" onClick={addNew}>
            <Plus size={12} /> 新建 Prompt
          </button>
        </div>
      </div>

      <div className="content">
        <div className="page-title">Prompt Center</div>
        <div className="page-sub">Prompt 版本管理 · 使用记录 · AB Test 基础</div>

        {/* 统计 */}
        <div className="stat-grid" style={{ gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', marginBottom:'1rem' }}>
          <div className="stat-card">
            <div className="stat-val" style={{ color:'var(--accent)' }}>{prompts.length}</div>
            <div className="stat-lbl">总 Prompt 版本</div>
          </div>
          <div className="stat-card">
            <div className="stat-val" style={{ color:'var(--ok)' }}>
              {prompts.reduce((a, b) => a + b.usageCount, 0)}
            </div>
            <div className="stat-lbl">累计调用次数</div>
          </div>
          <div className="stat-card">
            <div className="stat-val" style={{ color:'var(--purple)' }}>
              {prompts.filter(p => p.type === 'report').length}
            </div>
            <div className="stat-lbl">报告 Prompt 版本</div>
          </div>
          <div className="stat-card">
            <div className="stat-val" style={{ color:'var(--warn)' }}>
              {(() => {
                const last = prompts.filter(p => p.lastUsedAt).sort((a, b) =>
                  new Date(b.lastUsedAt!).getTime() - new Date(a.lastUsedAt!).getTime()
                )[0]
                return last ? new Date(last.lastUsedAt!).toLocaleDateString() : '—'
              })()}
            </div>
            <div className="stat-lbl">最近使用日期</div>
          </div>
        </div>

        <div className="row">
          {/* 左侧列表 */}
          <div style={{ width:240, flexShrink:0 }}>
            {/* 类型筛选 */}
            <div className="tab-list" style={{ marginBottom:'0.75rem' }}>
              {(['all','report','coaching','explain'] as const).map(t => (
                <div key={t} className={`tab-item${tab === t ? ' active' : ''}`} style={{ fontSize:12, padding:'0.35rem 0.65rem' }}
                  onClick={() => setTab(t)}>
                  {t === 'all' ? '全部' : TYPE_LABELS[t]}
                </div>
              ))}
            </div>

            <div className="card" style={{ padding:'0.5rem', margin:0 }}>
              {filtered.map(p => (
                <div
                  key={p.id}
                  className={`knowledge-item${selected.id === p.id ? ' active' : ''}`}
                  onClick={() => { setSelected(p); setEditing(false) }}
                >
                  <div className="flex-center gap-sm" style={{ flexWrap:'wrap' }}>
                    <span style={{ fontWeight: selected.id === p.id ? 600 : 400, fontSize:13 }}>{p.name}</span>
                    <span className="tag tag-muted" style={{ fontSize:10 }}>{p.version}</span>
                  </div>
                  <div className="ki-sub flex-center gap-sm" style={{ marginTop:2 }}>
                    {typeTag(p.type)}
                    <span><BarChart2 size={10} style={{ display:'inline' }}/> {p.usageCount}次</span>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && (
                <div style={{ padding:'1rem', textAlign:'center', color:'var(--muted)', fontSize:12 }}>无匹配</div>
              )}
            </div>
          </div>

          {/* 右侧详情 */}
          <div className="col">
            <div className="card" style={{ margin:0, marginBottom:'0.75rem' }}>
              <div className="flex-between mb-md">
                <div className="flex-center gap-sm" style={{ flexWrap:'wrap' }}>
                  <span style={{ fontSize:15, fontWeight:700 }}>{selected.name}</span>
                  {typeTag(selected.type)}
                  <span className="tag tag-muted">{selected.version}</span>
                  {justSaved && <span className="tag tag-ok"><CheckCircle size={10}/> 已保存新版本</span>}
                </div>
                <div className="flex-center gap-sm">
                  <button className="btn-ghost btn-sm" onClick={copyContent}>
                    {justCopied ? <><CheckCircle size={11}/> 已复制</> : <><Copy size={11}/> 复制</>}
                  </button>
                  {!editing && (
                    <button className="btn-ghost btn-sm" onClick={startEdit}>
                      <Edit3 size={11}/> 修改 / 新版本
                    </button>
                  )}
                  {editing && (
                    <>
                      <button className="btn btn-sm" onClick={saveVersion}>
                        <Save size={11}/> 保存为新版本
                      </button>
                      <button className="btn-ghost btn-sm" onClick={() => setEditing(false)}>取消</button>
                    </>
                  )}
                </div>
              </div>

              {/* 元信息行 */}
              <div style={{ display:'flex', gap:'1.25rem', flexWrap:'wrap', fontSize:12, color:'var(--muted)', marginBottom:'0.75rem' }}>
                <span><Clock size={11} style={{ display:'inline', marginRight:3 }}/>
                  创建：{new Date(selected.createdAt).toLocaleDateString()}
                </span>
                {selected.lastUsedAt && (
                  <span>最近使用：{new Date(selected.lastUsedAt).toLocaleString()}</span>
                )}
                <span><BarChart2 size={11} style={{ display:'inline', marginRight:3 }}/>
                  调用 {selected.usageCount} 次
                </span>
              </div>

              {/* Prompt 内容 */}
              {editing ? (
                <>
                  <div className="section-title" style={{ marginBottom:'0.4rem' }}>编辑 Prompt 内容</div>
                  <textarea
                    style={{
                      width:'100%', minHeight:220, background:'var(--bg)', border:'1px solid var(--accent)',
                      borderRadius:6, color:'var(--text)', padding:'0.75rem', fontSize:12,
                      fontFamily:'ui-monospace, JetBrains Mono, Consolas, monospace',
                      lineHeight:1.7, resize:'vertical', outline:'none',
                    }}
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                  />
                  <div className="section-title" style={{ marginTop:'0.75rem', marginBottom:'0.35rem' }}>修改说明（版本备注）</div>
                  <input
                    className="input"
                    style={{ width:'100%' }}
                    placeholder="例如：收紧输出格式约束，增加 proxy 说明"
                    value={editNotes}
                    onChange={e => setEditNotes(e.target.value)}
                  />
                </>
              ) : (
                <>
                  <div className="section-title" style={{ marginBottom:'0.4rem' }}>Prompt 内容</div>
                  <div className="code-block" style={{ minHeight:120, whiteSpace:'pre-wrap' }}>
                    {selected.content}
                  </div>
                  {selected.notes && (
                    <div style={{ marginTop:'0.6rem', fontSize:12, color:'var(--muted)' }}>
                      <span style={{ fontWeight:600 }}>备注：</span>{selected.notes}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* 版本历史 */}
            <div className="card" style={{ margin:0 }}>
              <div className="card-title">
                <History size={13} style={{ color:'var(--muted)' }}/>
                {TYPE_LABELS[selected.type] ?? selected.type} — 版本历史
              </div>
              <table className="data-table" style={{ fontSize:12 }}>
                <thead>
                  <tr>
                    <th>版本</th>
                    <th>名称</th>
                    <th>调用次数</th>
                    <th>最近使用</th>
                    <th>创建时间</th>
                    <th>备注</th>
                  </tr>
                </thead>
                <tbody>
                  {sameTypeVersions.map(p => (
                    <tr key={p.id} onClick={() => { setSelected(p); setEditing(false) }}
                      style={{ cursor:'pointer', background: selected.id === p.id ? 'var(--accent-dim)' : undefined }}>
                      <td>
                        <span className="tag tag-muted" style={{ fontSize:10 }}>{p.version}</span>
                        {p.id === sameTypeVersions[0]?.id && (
                          <span className="tag tag-ok" style={{ fontSize:9, marginLeft:4 }}>latest</span>
                        )}
                      </td>
                      <td style={{ fontWeight: selected.id === p.id ? 600 : 400 }}>{p.name}</td>
                      <td style={{ color:'var(--accent)' }}>{p.usageCount}</td>
                      <td className="muted">{p.lastUsedAt ? new Date(p.lastUsedAt).toLocaleDateString() : '—'}</td>
                      <td className="muted mono" style={{ fontSize:11 }}>{new Date(p.createdAt).toLocaleDateString()}</td>
                      <td className="muted" style={{ maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {p.notes ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// 需要 import History
function History(props: { size: number; style?: React.CSSProperties }) {
  return <svg xmlns="http://www.w3.org/2000/svg" width={props.size} height={props.size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={props.style}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>
}
