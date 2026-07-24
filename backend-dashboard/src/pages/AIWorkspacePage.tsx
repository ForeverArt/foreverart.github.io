import { useState } from 'react'
import { Bot, Upload, Sparkles, ArrowRight, FileText, Check } from 'lucide-react'

type Message = { role: 'user' | 'ai'; text: string }

const SUGGEST_PROMPTS = [
  '新增 Feature：Spin Radius（旋转半径）',
  '上传 ISU Communication 2400，检测规则变更',
  '生成 Camel Spin 的 Knowledge Draft',
  'Axis Stability Rule 当前阈值合理吗？',
]

const AI_RESPONSES: Record<string, string> = {
  '新增 Feature：Spin Radius（旋转半径）': `我来帮你定义 Spin Radius Feature。

**查询 Knowledge：**
- 相关：center_of_mass.md、balance.md
- 公式参考：踝中点时间序列 → 拟合圆 → 提取半径

**建议 Feature 定义：**
- Feature ID: spin.radius
- 单位: body-normalized（需身高校准转换为 cm）
- 输入: ankleMid.x/y 历史序列（建议 2s 窗口）
- 公式: 最小二乘圆拟合 → radius = √((Σ(xi-cx)² + Σ(yi-cy)²)/n)

**建议 Rule 阈值（heuristic）：**
- Excellent: radius < 0.05 body-norm
- Good: radius < 0.12
- Poor: ≥ 0.20

**建议代码结构：**
\`computeSpinRadius(ankleMidHistory: Point[], fps: number): number\`

是否要我生成完整的 YAML 定义和 TypeScript 代码草稿？`,

  '上传 ISU Communication 2400，检测规则变更': `检测到以下潜在 Rule 变更（模拟分析）：

**§3.2 Spin 稳定性**：
- 原文：wobble deduction 参考值调整
- 影响 Feature：spin.axis_stability
- 建议修改：Axis Stability Rule 的 good 阈值从 5° → 4°

**§5.1 Travel**：
- 原文：travel 距离判罚标准更新
- 影响 Feature：spin.center_drift
- 建议修改：Center Drift Rule poor 阈值从 0.35 → 0.30

**已生成 Review 草稿：**
- Knowledge: ISU Communication 2400 分析
- 影响范围：2 个 Rule，2 个 Feature
- 建议 Review 后 Approve

请在 Rule Studio 中确认修改。`,
}

const DEFAULT_AI_RESPONSE = `我会按以下步骤处理：

1. **查询 Knowledge** — 检索相关领域知识和已有定义
2. **分析影响范围** — 确认涉及的 Feature 和 Rule
3. **生成草稿** — 输出 Knowledge / Feature / Rule 草稿
4. **等待 Review** — 你确认后写入知识库

请提供更具体的信息，或选择上方快速操作。`

export default function AIWorkspacePage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: '你好！我是 AI 开发助手。\n\n我可以帮你：\n• 上传论文 → 自动抽取 Knowledge / Feature / Rule\n• 检测 ISU 规则变更 → 生成影响分析\n• 生成新 Feature 定义和代码草稿\n• 对话式开发 Prompt\n\n请输入需求或选择快速操作：' },
  ])
  const [input, setInput] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadDone, setUploadDone] = useState(false)
  const [tab, setTab] = useState<'chat' | 'upload' | 'drafts'>('chat')

  const send = (text: string) => {
    if (!text.trim()) return
    const userMsg: Message = { role: 'user', text }
    const aiText = AI_RESPONSES[text] ?? DEFAULT_AI_RESPONSE
    const aiMsg: Message = { role: 'ai', text: aiText }
    setMessages(prev => [...prev, userMsg, aiMsg])
    setInput('')
  }

  const simulateUpload = () => {
    setUploading(true)
    setTimeout(() => { setUploading(false); setUploadDone(true) }, 2200)
  }

  return (
    <>
      <div className="topbar">
        <div className="topbar-title flex-center gap-sm">
          <Bot size={16} /> AI Workspace
        </div>
        <div className="topbar-right">
          <span className="tag tag-accent" style={{ fontSize:10 }}>AI Agent</span>
        </div>
      </div>

      <div className="content">
        <div className="page-title">AI Workspace</div>
        <div className="page-sub">AI 开发助手 · 论文导入 · 知识生成 · 代码草稿</div>

        <div className="tab-list">
          <div className={`tab-item${tab === 'chat' ? ' active' : ''}`} onClick={() => setTab('chat')}>AI 对话</div>
          <div className={`tab-item${tab === 'upload' ? ' active' : ''}`} onClick={() => setTab('upload')}>论文导入</div>
          <div className={`tab-item${tab === 'drafts' ? ' active' : ''}`} onClick={() => setTab('drafts')}>生成草稿</div>
        </div>

        {tab === 'chat' && (
          <div className="row">
            <div className="col">
              {/* 快速操作 */}
              <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap', marginBottom:'1rem' }}>
                {SUGGEST_PROMPTS.map(p => (
                  <button key={p} className="btn-ghost btn-sm" onClick={() => send(p)}>
                    <Sparkles size={11} /> {p}
                  </button>
                ))}
              </div>

              {/* 聊天窗口 */}
              <div className="ai-chat">
                {messages.map((m, i) => (
                  <div key={i} className={`ai-msg ${m.role}`}>
                    <div className="ai-avatar">{m.role === 'ai' ? 'AI' : 'Me'}</div>
                    <div className="bubble" style={{ whiteSpace:'pre-wrap', lineHeight:1.7 }}>{m.text}</div>
                  </div>
                ))}
              </div>

              {/* 输入框 */}
              <div style={{ display:'flex', gap:'0.5rem' }}>
                <input
                  className="input"
                  style={{ flex:1 }}
                  placeholder="输入需求…例如：新增 Feature: Spin Radius"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send(input))}
                />
                <button className="btn" onClick={() => send(input)}>
                  <ArrowRight size={13} /> 发送
                </button>
              </div>
            </div>

            {/* 右侧 AI 流程说明 */}
            <div style={{ width:220, flexShrink:0 }}>
              <div className="section-title">AI 工作流</div>
              <div className="timeline">
                {[
                  { step:'输入需求 / 上传文件', color:'var(--accent)' },
                  { step:'AI 查询 Knowledge', color:'var(--purple)' },
                  { step:'生成 Feature / Rule 草稿', color:'var(--purple)' },
                  { step:'生成代码 + 测试草稿', color:'var(--warn)' },
                  { step:'人工 Review & Approve', color:'var(--ok)' },
                  { step:'写入知识库', color:'var(--ok)' },
                ].map((s, i) => (
                  <div key={i} className="tl-item">
                    <div style={{ fontSize:12, color: s.color }}>{s.step}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'upload' && (
          <div style={{ maxWidth:600 }}>
            <div className="card">
              <div className="card-title"><FileText size={14} /> 上传学术论文 / ISU Communication</div>
              <div style={{
                border:'2px dashed var(--border)', borderRadius:8, padding:'2rem',
                textAlign:'center', marginBottom:'1rem',
                background: uploadDone ? 'var(--ok-dim)' : 'transparent',
              }}>
                {uploadDone ? (
                  <div style={{ color:'var(--ok)' }}>
                    <Check size={32} style={{ marginBottom:8 }} />
                    <div style={{ fontSize:14, fontWeight:600 }}>文件已上传并解析</div>
                    <div style={{ fontSize:12, color:'var(--muted)', marginTop:4 }}>ISU_Communication_2400.pdf · 23 页</div>
                  </div>
                ) : (
                  <>
                    <Upload size={28} style={{ color:'var(--muted)', marginBottom:8 }} />
                    <div style={{ fontSize:14, color:'var(--muted)', marginBottom:'1rem' }}>
                      拖拽 PDF 到此处或点击选择<br/>
                      <span style={{ fontSize:11 }}>支持：论文 PDF、ISU Communication、教练手册</span>
                    </div>
                    <button className="btn" onClick={simulateUpload} disabled={uploading}>
                      {uploading ? '解析中…' : '选择文件'}
                    </button>
                  </>
                )}
              </div>

              {uploadDone && (
                <div>
                  <div className="section-title">AI 解析结果（待 Review）</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
                    {[
                      { type:'Knowledge Draft', title:'ISU Communication 2400 分析', status:'待 Review' },
                      { type:'Rule 变更', title:'Axis Stability good 阈值 5° → 4°', status:'待确认' },
                      { type:'Rule 变更', title:'Center Drift poor 阈值 0.35 → 0.30', status:'待确认' },
                    ].map((item, i) => (
                      <div key={i} style={{ display:'flex', alignItems:'center', gap:'0.75rem', padding:'0.6rem 0.75rem', background:'var(--surface-2)', borderRadius:6 }}>
                        <span className="tag tag-warn" style={{ fontSize:10 }}>{item.type}</span>
                        <span style={{ flex:1, fontSize:12 }}>{item.title}</span>
                        <button className="btn btn-sm">Approve</button>
                        <button className="btn-ghost btn-sm">忽略</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'drafts' && (
          <div>
            <div className="section-title">待 Review 草稿</div>
            <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
              {[
                {
                  id: 'DRAFT-001',
                  type: 'Feature',
                  title: 'Spin Radius',
                  desc: 'AI 生成 · 基于 center_of_mass.md + balance.md',
                  content: 'Feature ID: spin.radius\n单位: body-normalized\n公式: 最小二乘圆拟合踝中点轨迹\n输出: 旋转圆半径（body-norm）',
                },
                {
                  id: 'DRAFT-002',
                  type: 'Rule',
                  title: 'Spin Radius Rule',
                  desc: 'AI 生成 · heuristic 阈值',
                  content: 'Excellent: < 0.05\nGood: < 0.12\nPoor: ≥ 0.20',
                },
              ].map(d => (
                <div key={d.id} className="card" style={{ margin:0 }}>
                  <div className="flex-between mb-md">
                    <div className="flex-center gap-sm">
                      <span className="tag tag-accent" style={{ fontSize:10 }}>{d.type}</span>
                      <span style={{ fontWeight:600 }}>{d.title}</span>
                      <span className="muted mono" style={{ fontSize:11 }}>{d.id}</span>
                    </div>
                    <div className="flex-center gap-sm">
                      <button className="btn btn-sm">Approve 写入</button>
                      <button className="btn-ghost btn-sm">编辑</button>
                      <button className="btn-ghost btn-sm">拒绝</button>
                    </div>
                  </div>
                  <div style={{ fontSize:12, color:'var(--muted)', marginBottom:'0.5rem' }}>{d.desc}</div>
                  <div className="code-block" style={{ fontSize:11 }}>{d.content}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
