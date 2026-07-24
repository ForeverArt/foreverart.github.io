import { useState } from 'react'
import { Activity, Play } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts'

const BENCH_DATA = [
  { scenario: '低速 <80rpm',     v2: 88.1, v3: 92.3 },
  { scenario: '中速 80-120rpm',  v2: 92.0, v3: 94.1 },
  { scenario: '高速 >120rpm',    v2: 95.8, v3: 97.2 },
  { scenario: '高速抖动',        v2: 91.2, v3: 92.4 },
  { scenario: '遮挡帧',          v2: 74.5, v3: 88.9 },
  { scenario: '极低速 <50rpm',   v2: 81.0, v3: 85.3 },
]

const RADAR_DATA = [
  { metric: '低速准确率', v2: 88, v3: 92 },
  { metric: '高速准确率', v2: 96, v3: 97 },
  { metric: '抗遮挡',    v2: 75, v3: 89 },
  { metric: '抗噪声',    v2: 84, v3: 88 },
  { metric: '误报率',    v2: 71, v3: 85 },
  { metric: '漏检率',    v2: 83, v3: 90 },
]

const ALGORITHMS = [
  { id: 'axis_v2', name: 'Axis Stability v2', accuracy: 88.2, status: 'deprecated' },
  { id: 'axis_v3', name: 'Axis Stability v3', accuracy: 94.2, status: 'current' },
  { id: 'speed_v1', name: 'Spin Speed v1', accuracy: 91.5, status: 'current' },
  { id: 'drift_v1', name: 'Center Drift v1', accuracy: 87.6, status: 'current' },
]

export default function ValidationLabPage() {
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(0)

  const runBenchmark = () => {
    setRunning(true)
    setProgress(0)
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) { clearInterval(interval); setRunning(false); return 100 }
        return p + 8
      })
    }, 200)
  }

  return (
    <>
      <div className="topbar">
        <div className="topbar-title flex-center gap-sm">
          <Activity size={16} /> Validation Lab
        </div>
        <div className="topbar-right">
          <button className="btn btn-sm" onClick={runBenchmark} disabled={running}>
            <Play size={12} /> {running ? `运行中 ${progress}%` : '运行 Benchmark'}
          </button>
        </div>
      </div>

      <div className="content">
        <div className="page-title">Validation Lab</div>
        <div className="page-sub">算法演化验证 · 新旧版本对比 · 持续演进</div>

        {/* 运行进度 */}
        {running && (
          <div className="card" style={{ marginBottom:'1rem', borderColor:'rgba(88,166,255,0.3)' }}>
            <div className="flex-between mb-sm">
              <span style={{ fontSize:12, color:'var(--accent)' }}>Benchmark 运行中…</span>
              <span style={{ fontSize:12, color:'var(--muted)' }}>{progress}%</span>
            </div>
            <div className="prog-wrap">
              <div className="prog-bar" style={{ width:`${progress}%`, background:'var(--accent)' }} />
            </div>
          </div>
        )}

        {/* 算法版本概览 */}
        <div className="stat-grid" style={{ gridTemplateColumns:'repeat(auto-fill,minmax(170px,1fr))', marginBottom:'1rem' }}>
          {ALGORITHMS.map(a => (
            <div key={a.id} className="stat-card" style={{
              borderColor: a.status === 'current' ? 'rgba(63,185,80,0.35)' : 'var(--border)',
            }}>
              <div className="stat-val" style={{
                fontSize:22,
                color: a.accuracy >= 92 ? 'var(--ok)' : a.accuracy >= 88 ? 'var(--warn)' : 'var(--danger)',
              }}>
                {a.accuracy}%
              </div>
              <div className="stat-lbl">{a.name}</div>
              <div style={{ marginTop:4 }}>
                <span className={`tag ${a.status === 'current' ? 'tag-ok' : 'tag-muted'}`} style={{ fontSize:10 }}>
                  {a.status === 'current' ? 'current' : 'deprecated'}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="row">
          <div className="col">
            {/* 准确率对比柱状图 */}
            <div className="card">
              <div className="card-title">Axis Stability v2 → v3 准确率对比</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={BENCH_DATA} margin={{ top:4, right:12, bottom:4, left:-12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="scenario" tick={{ fontSize:10, fill:'var(--muted)' }} />
                  <YAxis domain={[70, 100]} tick={{ fontSize:11, fill:'var(--muted)' }} />
                  <Tooltip
                    contentStyle={{ background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:6, fontSize:12 }}
                    formatter={(v) => [`${v}%`]}
                  />
                  <Legend wrapperStyle={{ fontSize:11, color:'var(--muted)' }} />
                  <Bar dataKey="v2" name="v2 算法" fill="rgba(37,99,235,0.65)" radius={[3,3,0,0]} />
                  <Bar dataKey="v3" name="v3 算法" fill="rgba(63,185,80,0.7)" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* AI 总结 */}
            <div className="card" style={{ borderColor:'rgba(188,140,255,0.25)' }}>
              <div className="card-title" style={{ color:'var(--purple)' }}>AI 自动评估总结</div>
              <div style={{
                fontSize:13, lineHeight:1.8, color:'var(--text)',
                borderLeft:'3px solid var(--purple)', paddingLeft:'0.85rem',
              }}>
                <strong>v3 整体优于 v2。</strong>关键改进：<br/>
                ✓ 遮挡帧处理：MAD 异常帧剔除使遮挡场景准确率从 74.5% 提升至 88.9%，+14.4pp<br/>
                ✓ 低速旋转（&lt;80rpm）：从 88.1% 提升至 92.3%，+4.2pp<br/>
                <br/>
                <span style={{ color:'var(--warn)' }}>
                  ⚠ 注意：高速抖动场景仅提升 1.2pp（91.2→92.4%），接近天花板。
                  建议针对 &gt;150rpm 场景增加插值平滑（window=3f）或引入频域滤波。
                </span>
              </div>
            </div>
          </div>

          <div style={{ width:280, flexShrink:0 }}>
            {/* 雷达图 */}
            <div className="card">
              <div className="card-title">多维度综合对比</div>
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={RADAR_DATA}>
                  <PolarGrid stroke="var(--border)" />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize:10, fill:'var(--muted)' }} />
                  <PolarRadiusAxis domain={[60, 100]} tick={{ fontSize:9, fill:'var(--muted)' }} />
                  <Radar name="v2" dataKey="v2" stroke="#2563eb" fill="rgba(37,99,235,0.2)" strokeWidth={1.5} />
                  <Radar name="v3" dataKey="v3" stroke="#3fb950" fill="rgba(63,185,80,0.2)" strokeWidth={1.5} />
                  <Legend wrapperStyle={{ fontSize:11, color:'var(--muted)' }} />
                  <Tooltip contentStyle={{ background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:6, fontSize:12 }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Benchmark 配置 */}
            <div className="card">
              <div className="card-title">Benchmark 配置</div>
              <div style={{ fontSize:12, display:'grid', gridTemplateColumns:'auto 1fr', gap:'0.4rem 0.75rem' }}>
                <span className="muted">数据集大小</span><span>12 Sessions</span>
                <span className="muted">置信阈值</span><span style={{ color:'var(--warn)' }}>需 ≥50（当前不足）</span>
                <span className="muted">基准版本</span><span>Axis Stability v2</span>
                <span className="muted">测试版本</span><span>Axis Stability v3</span>
                <span className="muted">最近运行</span><span>2026-07-22</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
