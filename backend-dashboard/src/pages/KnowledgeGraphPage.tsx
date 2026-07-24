import { useState, useRef } from 'react'
import { GitBranch } from 'lucide-react'
import { KNOWLEDGE_DATA, FEATURE_DATA, RULE_DATA } from '../data'

// ── 图节点定义 ──────────────────────────────────────────────
type NodeType = 'knowledge' | 'feature' | 'rule' | 'prompt' | 'report'

interface GraphNode {
  id: string
  label: string
  sub?: string
  type: NodeType
  x: number
  y: number
}

interface GraphEdge {
  from: string
  to: string
  dashed?: boolean
}

const NODE_COLOR: Record<NodeType, { fill: string; stroke: string; text: string }> = {
  knowledge: { fill: 'rgba(188,140,255,0.12)', stroke: '#bc8cff', text: '#bc8cff' },
  feature:   { fill: 'rgba(88,166,255,0.12)',  stroke: '#58a6ff', text: '#58a6ff' },
  rule:      { fill: 'rgba(63,185,80,0.12)',   stroke: '#3fb950', text: '#3fb950' },
  prompt:    { fill: 'rgba(210,153,34,0.12)',  stroke: '#d29922', text: '#d29922' },
  report:    { fill: 'rgba(248,81,73,0.12)',   stroke: '#f85149', text: '#e6edf3' },
}

// 布局：Knowledge 一列，Feature 一列，Rule 一列，Prompt+Report 一列
function buildGraph(): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = []
  const edges: GraphEdge[] = []

  const COL = { k: 60, f: 240, r: 420, p: 600 }
  const ROW_GAP = 68

  // Knowledge nodes
  KNOWLEDGE_DATA.forEach((k, i) => {
    nodes.push({ id: `k:${k.id}`, label: k.title, sub: k.category, type: 'knowledge', x: COL.k, y: 40 + i * ROW_GAP })
  })

  // Feature nodes
  FEATURE_DATA.forEach((f, i) => {
    nodes.push({ id: `f:${f.id}`, label: f.name, sub: f.unit, type: 'feature', x: COL.f, y: 40 + i * ROW_GAP })
  })

  // Rule nodes
  RULE_DATA.forEach((r, i) => {
    nodes.push({ id: `r:${r.id}`, label: r.name, sub: r.status, type: 'rule', x: COL.r, y: 40 + i * ROW_GAP })
  })

  // Prompt + Report
  nodes.push({ id: 'p:report',   label: 'Report Prompt',   sub: 'v1', type: 'prompt',  x: COL.p, y: 80  })
  nodes.push({ id: 'p:coaching', label: 'Coach Prompt',    sub: 'v1', type: 'prompt',  x: COL.p, y: 148 })
  nodes.push({ id: 'out:report', label: 'LLM Report',      sub: 'analysis.md', type: 'report', x: COL.p, y: 260 })

  // Knowledge → Feature edges
  const kfMap: Record<string, string[]> = {
    'axis_stability': ['spin.axis_stability', 'spin.inclination'],
    'wobble':         ['spin.axis_stability'],
    'center_of_mass': ['spin.com_offset_proxy', 'spin.center_drift'],
    'angular_velocity':['spin.speed', 'spin.angular_deceleration'],
    'balance':        ['spin.center_drift', 'spin.com_offset_proxy'],
  }
  Object.entries(kfMap).forEach(([kid, fids]) => {
    fids.forEach(fid => {
      if (nodes.find(n => n.id === `k:${kid}`) && nodes.find(n => n.id === `f:${fid}`)) {
        edges.push({ from: `k:${kid}`, to: `f:${fid}` })
      }
    })
  })

  // Feature → Rule edges
  RULE_DATA.forEach(r => {
    edges.push({ from: `f:${r.featureId}`, to: `r:${r.id}` })
  })

  // Rule → LLM Report
  RULE_DATA.forEach(r => {
    edges.push({ from: `r:${r.id}`, to: 'out:report', dashed: true })
  })

  // Prompt → LLM Report
  edges.push({ from: 'p:report', to: 'out:report' })

  return { nodes, edges }
}

const { nodes: NODES, edges: EDGES } = buildGraph()

const VIEW_W = 760
const VIEW_H = Math.max(...NODES.map(n => n.y)) + 80

export default function KnowledgeGraphPage() {
  const [hovered, setHovered] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  // 高亮：选中节点 + 其直接邻居 + 相关边
  const activeId = selected ?? hovered
  const highlightedNodes = new Set<string>()
  const highlightedEdges = new Set<number>()

  if (activeId) {
    highlightedNodes.add(activeId)
    EDGES.forEach((e, i) => {
      if (e.from === activeId || e.to === activeId) {
        highlightedNodes.add(e.from)
        highlightedNodes.add(e.to)
        highlightedEdges.add(i)
      }
    })
  }

  const isHighlighted = (id: string) => !activeId || highlightedNodes.has(id)
  const isEdgeHighlighted = (i: number) => !activeId || highlightedEdges.has(i)

  const NODE_W = 150
  const NODE_H = 38

  const nodeById = (id: string) => NODES.find(n => n.id === id)

  // 找到选中节点关联的所有信息
  function getNodeDetail(id: string | null) {
    if (!id) return null
    const node = nodeById(id)
    if (!node) return null
    const connectedEdges = EDGES.filter(e => e.from === id || e.to === id)
    const inbound  = connectedEdges.filter(e => e.to === id).map(e => nodeById(e.from)!)
    const outbound = connectedEdges.filter(e => e.from === id).map(e => nodeById(e.to)!)
    return { node, inbound: inbound.filter(Boolean), outbound: outbound.filter(Boolean) }
  }

  const detail = getNodeDetail(selected ?? hovered)

  return (
    <>
      <div className="topbar">
        <div className="topbar-title flex-center gap-sm">
          <GitBranch size={16} /> Knowledge Graph
        </div>
        <div className="topbar-right">
          <span style={{ fontSize:12, color:'var(--muted)' }}>点击节点查看关联链路</span>
          {selected && (
            <button className="btn-ghost btn-sm" onClick={() => setSelected(null)}>清除选中</button>
          )}
        </div>
      </div>

      <div className="content">
        <div className="page-title">Knowledge Graph</div>
        <div className="page-sub">知识 → Feature → Rule → Prompt → LLM Report 全链路可视化</div>

        {/* 图例 */}
        <div style={{ display:'flex', gap:'1rem', flexWrap:'wrap', marginBottom:'1rem' }}>
          {(Object.entries(NODE_COLOR) as [NodeType, typeof NODE_COLOR[NodeType]][]).map(([type, c]) => (
            <div key={type} className="flex-center gap-sm" style={{ fontSize:12 }}>
              <div style={{ width:10, height:10, borderRadius:2, background:c.fill, border:`1.5px solid ${c.stroke}` }}/>
              <span style={{ color:'var(--muted)' }}>
                {{knowledge:'Knowledge',feature:'Feature',rule:'Rule',prompt:'Prompt',report:'Report'}[type]}
              </span>
            </div>
          ))}
          <div className="flex-center gap-sm" style={{ fontSize:12 }}>
            <svg width={28} height={10}><line x1={0} y1={5} x2={28} y2={5} stroke="#8b949e" strokeWidth={1.5} strokeDasharray="4,3"/></svg>
            <span style={{ color:'var(--muted)' }}>间接关联</span>
          </div>
        </div>

        <div className="row" style={{ alignItems:'flex-start' }}>
          {/* 图形区 */}
          <div className="col">
            <div className="card" style={{ padding:'0.75rem', overflow:'auto' }}>
              {/* 列标题 */}
              <div style={{ display:'flex', marginBottom:'0.5rem', paddingLeft:4 }}>
                {[
                  { x: 60,  label: 'Knowledge', color:'#bc8cff' },
                  { x: 240, label: 'Feature',   color:'#58a6ff' },
                  { x: 420, label: 'Rule',       color:'#3fb950' },
                  { x: 600, label: 'Prompt / Output', color:'#d29922' },
                ].map(c => (
                  <div key={c.label} style={{
                    position:'absolute', left: c.x + 4,
                    fontSize:10, fontWeight:600, textTransform:'uppercase',
                    letterSpacing:'.06em', color: c.color, opacity:0.7,
                  }}>{c.label}</div>
                ))}
              </div>
              <svg
                ref={svgRef}
                viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
                style={{ width:'100%', height:'auto', minWidth:500, cursor:'default' }}
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <marker id="arr-g" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
                    <path d="M0,0 L10,5 L0,10 Z" fill="#8b949e"/>
                  </marker>
                  <marker id="arr-hi" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
                    <path d="M0,0 L10,5 L0,10 Z" fill="#58a6ff"/>
                  </marker>
                </defs>

                {/* Edges */}
                {EDGES.map((e, i) => {
                  const from = nodeById(e.from)
                  const to   = nodeById(e.to)
                  if (!from || !to) return null
                  const x1 = from.x + NODE_W
                  const y1 = from.y + NODE_H / 2
                  const x2 = to.x
                  const y2 = to.y + NODE_H / 2
                  const hi = isEdgeHighlighted(i)
                  const mx = (x1 + x2) / 2
                  return (
                    <path
                      key={i}
                      d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`}
                      fill="none"
                      stroke={hi ? '#58a6ff' : '#30363d'}
                      strokeWidth={hi ? 1.8 : 1}
                      strokeDasharray={e.dashed ? '5,4' : undefined}
                      markerEnd={hi ? 'url(#arr-hi)' : 'url(#arr-g)'}
                      opacity={hi ? 0.9 : 0.35}
                    />
                  )
                })}

                {/* Nodes */}
                {NODES.map(node => {
                  const c = NODE_COLOR[node.type]
                  const hi = isHighlighted(node.id)
                  const isSel = selected === node.id
                  return (
                    <g
                      key={node.id}
                      style={{ cursor:'pointer' }}
                      onClick={() => setSelected(s => s === node.id ? null : node.id)}
                      onMouseEnter={() => setHovered(node.id)}
                      onMouseLeave={() => setHovered(null)}
                    >
                      <rect
                        x={node.x} y={node.y}
                        width={NODE_W} height={NODE_H}
                        rx={6}
                        fill={hi ? c.fill : 'rgba(22,27,34,0.5)'}
                        stroke={isSel ? c.stroke : hi ? c.stroke : '#30363d'}
                        strokeWidth={isSel ? 2 : 1}
                        opacity={hi ? 1 : 0.4}
                      />
                      <text
                        x={node.x + NODE_W / 2} y={node.y + 15}
                        textAnchor="middle"
                        fill={hi ? c.text : '#8b949e'}
                        fontSize={11}
                        fontWeight={600}
                      >{node.label}</text>
                      {node.sub && (
                        <text
                          x={node.x + NODE_W / 2} y={node.y + 28}
                          textAnchor="middle"
                          fill="#8b949e"
                          fontSize={9}
                          opacity={hi ? 0.8 : 0.4}
                        >{node.sub}</text>
                      )}
                    </g>
                  )
                })}
              </svg>
            </div>
          </div>

          {/* 右侧：节点详情 */}
          <div style={{ width:220, flexShrink:0 }}>
            {detail ? (
              <>
                <div className="card" style={{ margin:0, marginBottom:'0.75rem', borderColor: NODE_COLOR[detail.node.type].stroke }}>
                  <div style={{ fontSize:13, fontWeight:700, color: NODE_COLOR[detail.node.type].text, marginBottom:4 }}>
                    {detail.node.label}
                  </div>
                  <div style={{ fontSize:11, color:'var(--muted)' }}>
                    类型：{detail.node.type} · {detail.node.sub}
                  </div>
                </div>

                {detail.inbound.length > 0 && (
                  <div className="card" style={{ margin:0, marginBottom:'0.5rem' }}>
                    <div className="section-title" style={{ marginBottom:'0.4rem' }}>← 上游输入</div>
                    {detail.inbound.map(n => (
                      <div key={n.id} className="flex-center gap-sm" style={{ fontSize:12, marginBottom:4 }}>
                        <div style={{ width:8, height:8, borderRadius:2, background:NODE_COLOR[n.type].stroke, flexShrink:0 }}/>
                        <span style={{ color: NODE_COLOR[n.type].text }}>{n.label}</span>
                      </div>
                    ))}
                  </div>
                )}

                {detail.outbound.length > 0 && (
                  <div className="card" style={{ margin:0 }}>
                    <div className="section-title" style={{ marginBottom:'0.4rem' }}>→ 下游输出</div>
                    {detail.outbound.map(n => (
                      <div key={n.id} className="flex-center gap-sm" style={{ fontSize:12, marginBottom:4 }}>
                        <div style={{ width:8, height:8, borderRadius:2, background:NODE_COLOR[n.type].stroke, flexShrink:0 }}/>
                        <span style={{ color: NODE_COLOR[n.type].text }}>{n.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="card" style={{ margin:0, textAlign:'center', padding:'1.5rem 0.75rem' }}>
                <GitBranch size={24} style={{ color:'var(--muted)', marginBottom:8, display:'block', margin:'0 auto 8px' }}/>
                <div style={{ fontSize:12, color:'var(--muted)' }}>点击图中节点<br/>查看关联链路</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
