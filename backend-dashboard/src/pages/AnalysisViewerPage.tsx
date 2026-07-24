import { useState } from 'react'
import { PlaySquare, AlertTriangle, Info, AlertCircle } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts'
import { ANALYSIS_REPORT, SESSION_DATA } from '../data'

function gradeTag(g: string) {
  if (g === 'excellent') return <span className="tag tag-ok">Excellent</span>
  if (g === 'good')      return <span className="tag tag-warn">Good</span>
  return <span className="tag tag-danger">Poor</span>
}

function EventIcon({ severity }: { severity: string }) {
  if (severity === 'danger') return <AlertCircle size={13} style={{ color:'var(--danger)', flexShrink:0 }} />
  if (severity === 'warn')   return <AlertTriangle size={13} style={{ color:'var(--warn)', flexShrink:0 }} />
  return <Info size={13} style={{ color:'var(--accent)', flexShrink:0 }} />
}

export default function AnalysisViewerPage() {
  const [sessionId, setSessionId] = useState('S001')
  const report = ANALYSIS_REPORT
  const session = SESSION_DATA.find(s => s.id === sessionId) ?? SESSION_DATA[0]

  return (
    <>
      <div className="topbar">
        <div className="topbar-title flex-center gap-sm">
          <PlaySquare size={16} /> Analysis Viewer
        </div>
        <div className="topbar-right">
          <select
            className="input"
            style={{ width:180 }}
            value={sessionId}
            onChange={e => setSessionId(e.target.value)}
          >
            {SESSION_DATA.filter(s => s.hasReport).map(s => (
              <option key={s.id} value={s.id}>
                {s.id} — {s.skater} · {new Date(s.date).toLocaleDateString()}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="content">
        <div className="page-title">Analysis Viewer</div>
        <div className="page-sub">单次旋转全链路追溯 · Pose → Feature → Rule → Event → LLM</div>

        {/* 链路追溯 breadcrumb */}
        <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:'1.25rem', flexWrap:'wrap' }}>
          {['MediaPipe Pose', 'Feature计算', 'Rule评估', 'Event检测', 'LLM Report'].map((step, i) => (
            <>
              <div key={step} style={{
                padding:'0.3rem 0.7rem', background:'var(--surface)', border:'1px solid var(--border)',
                borderRadius:5, fontSize:12, fontWeight:500,
              }}>{step}</div>
              {i < 4 && <span style={{ color:'var(--muted)', fontSize:16 }}>→</span>}
            </>
          ))}
          <span className="tag tag-ok" style={{ marginLeft:'auto' }}>{report.reportId}</span>
        </div>

        <div className="row">
          <div className="col">
            {/* Feature Summary */}
            <div className="stat-grid" style={{ gridTemplateColumns:'repeat(3,1fr)' }}>
              <div className="stat-card">
                <div className="stat-lbl">Axis Stability</div>
                <div className="stat-val" style={{ fontSize:20, color:'var(--ok)' }}>
                  {session.features.axis_stability.toFixed(1)}°
                </div>
                <div className="mt-sm">{gradeTag(report.grades['axis_stability'] ?? 'poor')}</div>
              </div>
              <div className="stat-card">
                <div className="stat-lbl">Peak Speed</div>
                <div className="stat-val" style={{ fontSize:20, color:'var(--ok)' }}>
                  {session.features.speed} rpm
                </div>
                <div className="mt-sm">{gradeTag(report.grades['speed'] ?? 'poor')}</div>
              </div>
              <div className="stat-card">
                <div className="stat-lbl">Center Drift</div>
                <div className="stat-val" style={{ fontSize:20, color:'var(--ok)' }}>
                  {session.features.center_drift.toFixed(2)}
                </div>
                <div className="mt-sm">{gradeTag(report.grades['center_drift'] ?? 'poor')}</div>
              </div>
            </div>

            {/* Feature Timeline Chart */}
            <div className="card">
              <div className="card-title">Feature Timeline</div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={report.featureTimeline} margin={{ top:4, right:12, bottom:4, left:-10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="t" stroke="var(--muted)" tick={{ fontSize:11 }} label={{ value:'时间 (s)', position:'insideBottomRight', offset:-5, fill:'var(--muted)', fontSize:10 }} />
                  <YAxis yAxisId="axis" stroke="var(--muted)" tick={{ fontSize:11 }} />
                  <YAxis yAxisId="speed" orientation="right" stroke="var(--muted)" tick={{ fontSize:11 }} />
                  <Tooltip
                    contentStyle={{ background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:6, fontSize:12 }}
                    labelFormatter={v => `t=${v}s`}
                  />
                  <Legend wrapperStyle={{ fontSize:11, color:'var(--muted)' }} />
                  <ReferenceLine yAxisId="axis" y={2} stroke="rgba(63,185,80,0.4)" strokeDasharray="4,3" label={{ value:'Excellent 2°', fill:'var(--ok)', fontSize:9 }}/>
                  <ReferenceLine yAxisId="axis" y={8} stroke="rgba(248,81,73,0.4)" strokeDasharray="4,3" label={{ value:'Poor 8°', fill:'var(--danger)', fontSize:9 }}/>
                  <Line yAxisId="axis" type="monotone" dataKey="axis" name="Axis Stability (°)" stroke="#bc8cff" strokeWidth={2} dot={false} />
                  <Line yAxisId="speed" type="monotone" dataKey="speed" name="Speed (rpm)" stroke="#58a6ff" strokeWidth={2} dot={false} />
                  <Line yAxisId="axis" type="monotone" dataKey="drift" name="Center Drift" stroke="#3fb950" strokeWidth={1.5} dot={false} strokeDasharray="5,3" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* LLM Report */}
            <div className="card" style={{ borderColor:'rgba(188,140,255,0.25)' }}>
              <div className="card-title">
                <span style={{ color:'var(--purple)' }}>LLM 分析报告</span>
                <span className="tag tag-muted" style={{ marginLeft:'auto', fontSize:10 }}>{report.model}</span>
                <span className="muted" style={{ fontSize:11 }}>{(report.latencyMs/1000).toFixed(1)}s</span>
                <span className={`tag ${report.status === 'success' ? 'tag-ok' : 'tag-danger'}`}>{report.status}</span>
              </div>
              <div style={{
                fontSize:13, lineHeight:1.8, whiteSpace:'pre-wrap',
                color:'var(--text)',
                borderLeft:'3px solid var(--purple)',
                paddingLeft:'0.85rem',
              }}>
                {report.llmSummary}
              </div>
              <div style={{ fontSize:11, color:'var(--muted)', marginTop:'0.75rem' }}>
                生成于 {new Date(report.createdAt).toLocaleString()} · 仅作训练反馈，不含 ISU Level/GOE
              </div>
            </div>
          </div>

          {/* 右侧事件列表 */}
          <div style={{ width:240, flexShrink:0 }}>
            <div className="section-title">事件序列</div>
            <div className="timeline">
              {report.events.map((ev, i) => (
                <div key={i} className="tl-item" style={{
                  borderColor: ev.severity === 'danger' ? 'rgba(248,81,73,0.3)' :
                               ev.severity === 'warn' ? 'rgba(210,153,34,0.3)' : 'var(--border)',
                }}>
                  <div className="tl-time" style={{ display:'flex', alignItems:'center', gap:4 }}>
                    <EventIcon severity={ev.severity} />
                    t={ev.t}s · {ev.type}
                  </div>
                  <div style={{ fontSize:11, marginTop:2, lineHeight:1.5 }}>{ev.msg}</div>
                </div>
              ))}
            </div>

            <div className="section-title" style={{ marginTop:'1rem' }}>报告元信息</div>
            <div className="card" style={{ padding:'0.75rem', fontSize:12 }}>
              <div style={{ display:'grid', gridTemplateColumns:'auto 1fr', gap:'0.35rem 0.6rem' }}>
                <span className="muted">Session</span><span>{report.sessionId}</span>
                <span className="muted">Report ID</span><span className="mono" style={{ fontSize:11 }}>{report.reportId}</span>
                <span className="muted">时长</span><span>{session.duration}s</span>
                <span className="muted">选手</span><span>{session.skater}</span>
                <span className="muted">动作</span><span>{session.spinType}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
