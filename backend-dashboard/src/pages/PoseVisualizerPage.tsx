import { useState, useRef, useCallback } from 'react'
import { Video, Upload, Play, Loader, Download, CheckCircle, AlertTriangle } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { postSpinReport, type SpinReportRequest, type SpinReportResponse } from '../api'
import { ANALYSIS_REPORT } from '../data'

type Stage = 'idle' | 'loaded' | 'processing' | 'done' | 'error'

// 生成合成 Feature Timeline（模拟 MediaPipe 输出）
function generateTimeline(durationSec: number) {
  const fps = 12 // 模拟帧率
  const frames = Math.round(durationSec * fps)
  const data = []
  for (let i = 0; i < frames; i++) {
    const t = parseFloat((i / fps).toFixed(2))
    const phase = t / durationSec // 0~1
    // 加速段：axis 从5降到2，speed从60升到130
    // 维持段：axis约2，speed约130
    // 衰减段：axis升回8，speed降到50
    const axis = phase < 0.25
      ? 5 - (5 - 2) * (phase / 0.25) + (Math.random() - 0.5) * 0.8
      : phase < 0.7
      ? 2 + (Math.random() - 0.5) * 0.6
      : 2 + (8 - 2) * ((phase - 0.7) / 0.3) + (Math.random() - 0.5) * 1.2
    const speed = phase < 0.2
      ? 60 + (130 - 60) * (phase / 0.2) + (Math.random() - 0.5) * 8
      : phase < 0.7
      ? 128 + (Math.random() - 0.5) * 10
      : 128 - (128 - 50) * ((phase - 0.7) / 0.3) + (Math.random() - 0.5) * 8
    const drift = phase < 0.6
      ? 0.04 + Math.random() * 0.03
      : 0.04 + (0.25 - 0.04) * ((phase - 0.6) / 0.4) + Math.random() * 0.04

    data.push({
      t,
      axis: Math.max(0.5, parseFloat(axis.toFixed(2))),
      speed: Math.max(20, Math.round(speed)),
      drift: Math.max(0, parseFloat(drift.toFixed(3))),
    })
  }
  return data
}

// 从模拟 timeline 计算 Feature 摘要
function summarizeFeatures(timeline: ReturnType<typeof generateTimeline>) {
  if (!timeline.length) return {}
  const axes  = timeline.map(d => d.axis)
  const speeds = timeline.map(d => d.speed)
  const drifts = timeline.map(d => d.drift)
  const mean = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length
  const std  = (arr: number[]) => { const m = mean(arr); return Math.sqrt(mean(arr.map(v => (v-m)**2))) }
  return {
    axisStd:    parseFloat(std(axes).toFixed(2)),
    axisMean:   parseFloat(mean(axes).toFixed(2)),
    speedPeak:  Math.round(Math.max(...speeds)),
    speedMean:  Math.round(mean(speeds)),
    driftMax:   parseFloat(Math.max(...drifts).toFixed(3)),
    driftMean:  parseFloat(mean(drifts).toFixed(3)),
  }
}

function gradeAxis(v: number) { return v < 2 ? 'excellent' : v < 5 ? 'good' : 'poor' }
function gradeSpeed(v: number) { return v >= 120 ? 'excellent' : v >= 80 ? 'good' : 'poor' }
function gradeDrift(v: number) { return v < 0.08 ? 'excellent' : v < 0.20 ? 'good' : 'poor' }

function gradeScore(g: string) { return g === 'excellent' ? 95 : g === 'good' ? 78 : 55 }

function gradeTag(g: string) {
  if (g === 'excellent') return <span className="tag tag-ok">Excellent</span>
  if (g === 'good')      return <span className="tag tag-warn">Good</span>
  return <span className="tag tag-danger">Poor</span>
}

export default function PoseVisualizerPage() {
  const [stage, setStage]     = useState<Stage>('idle')
  const [fileName, setFileName] = useState('')
  const [duration, setDuration] = useState(0)
  const [timeline, setTimeline] = useState<ReturnType<typeof generateTimeline>>([])
  const [features, setFeatures] = useState<ReturnType<typeof summarizeFeatures>>({})
  const [report, setReport]   = useState<SpinReportResponse | null>(null)
  const [error, setError]     = useState('')
  const [progress, setProgress] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)
  const fileRef  = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('video/')) { setError('请选择视频文件'); return }
    setFileName(file.name)
    setStage('loaded')
    setError('')
    setReport(null)
    setTimeline([])

    const url = URL.createObjectURL(file)
    if (videoRef.current) {
      videoRef.current.src = url
      videoRef.current.onloadedmetadata = () => {
        setDuration(parseFloat((videoRef.current?.duration ?? 8).toFixed(1)))
      }
    }
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const runAnalysis = async () => {
    if (stage !== 'loaded') return
    setStage('processing')
    setError('')
    setProgress(0)

    // 模拟 MediaPipe 处理进度
    const steps = [
      { label: '解析视频帧…',          pct: 15 },
      { label: 'MediaPipe Pose 推理…', pct: 45 },
      { label: '计算 Feature…',        pct: 65 },
      { label: '评估 Rule…',           pct: 75 },
      { label: '调用 LLM 生成报告…',   pct: 90 },
    ]

    for (const step of steps) {
      await new Promise(r => setTimeout(r, 600 + Math.random() * 400))
      setProgress(step.pct)
    }

    // 生成合成 timeline
    const dur = duration || 8
    const tl = generateTimeline(dur)
    const feat = summarizeFeatures(tl)
    setTimeline(tl)
    setFeatures(feat)

    // 构建真实 SpinReportRequest
    const axisGrade  = gradeAxis(feat.axisStd ?? 3)
    const speedGrade = gradeSpeed(feat.speedPeak ?? 90)
    const driftGrade = gradeDrift(feat.driftMax ?? 0.15)
    const overallScore = Math.round((gradeScore(axisGrade) * 0.4 + gradeScore(speedGrade) * 0.3 + gradeScore(driftGrade) * 0.3))
    const overallGrade = overallScore >= 88 ? 'excellent' : overallScore >= 70 ? 'good' : 'poor'

    const req: SpinReportRequest = {
      schemaVersion: '2.0.0',
      report: {
        schemaVersion: '2.0.0',
        skill: 'upright_spin',
        summary: {
          overallScore,
          overallGrade,
          durationSec: dur,
          processedFrames: tl.length,
          warnings: feat.axisStd! > 5 ? ['高轴不稳定性检测'] : [],
        },
        features: {
          'spin.axis_stability': { featureId:'spin.axis_stability', unit:'deg', last: feat.axisStd!, mean: feat.axisMean, std: feat.axisStd, availableRatio:1 },
          'spin.speed':          { featureId:'spin.speed',          unit:'rpm', last: feat.speedMean!, mean: feat.speedMean, availableRatio:1 },
          'spin.center_drift':   { featureId:'spin.center_drift',   unit:'body-norm', last: feat.driftMax!, mean: feat.driftMean, availableRatio:1 },
        },
        rules: {
          schemaVersion: '2.0.0',
          overallScore,
          overallGrade,
          features: {
            'spin.axis_stability': { grade: axisGrade },
            'spin.speed': { grade: speedGrade },
            'spin.center_drift': { grade: driftGrade },
          },
          weights: {},
        },
        events: feat.axisStd! > 5
          ? [{ t: dur * 0.7, type:'AxisDrift', severity:'warn', msg:'轴稳定性超过5°' }]
          : [],
        traceability: {
          knowledgeRefs: ['knowledge/features/spin/axis_stability.md','knowledge/features/spin/speed.md','knowledge/biomechanics/axis_stability.md'],
          ruleRefs: ['knowledge/rules/spin/axis.md','knowledge/rules/spin/speed.md','knowledge/rules/spin/travel.md'],
          featureIds: ['spin.axis_stability','spin.speed','spin.center_drift','spin.com_offset_proxy','spin.inclination','spin.angular_deceleration'],
        },
      },
      meta: {
        spinId: `spin-${Date.now()}`,
        athlete: 'anonymous',
        skill: 'upright_spin',
        source: 'dashboard-upload',
        videoFileName: fileName,
      },
    }

    try {
      const resp = await postSpinReport(req)
      setReport(resp)
      setStage('done')
      setProgress(100)
    } catch (e) {
      // 后端不可用时，用内置示例报告降级
      setReport({
        reportId: `demo-${Date.now()}`,
        schemaVersion: '2.0.0',
        markdown: ANALYSIS_REPORT.llmSummary,
        model: 'demo (offline)',
        generatedAt: new Date().toISOString(),
        knowledgeRefs: req.report.traceability.knowledgeRefs,
      })
      setStage('done')
      setProgress(100)
      setError('⚠ 后端不可用，使用内置示例报告（演示模式）')
    }
  }

  const downloadReport = () => {
    if (!report) return
    const blob = new Blob([report.markdown], { type:'text/markdown' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `analysis-${report.reportId}.md`
    a.click()
  }

  return (
    <>
      <div className="topbar">
        <div className="topbar-title flex-center gap-sm">
          <Video size={16} /> Pose Visualizer
        </div>
        <div className="topbar-right">
          {report && (
            <button className="btn-ghost btn-sm" onClick={downloadReport}>
              <Download size={12} /> 下载 analysis.md
            </button>
          )}
        </div>
      </div>

      <div className="content">
        <div className="page-title">Pose Visualizer</div>
        <div className="page-sub">上传旋转视频 → Feature 提取 → Rule 评估 → LLM 报告全链路</div>

        {/* 链路说明 */}
        <div style={{ display:'flex', alignItems:'center', gap:'0.4rem', marginBottom:'1.25rem', flexWrap:'wrap' }}>
          {['上传视频','MediaPipe Pose','Feature 计算','Rule 评估','LLM Report'].map((s, i) => (
            <>
              <div key={s} style={{
                padding:'0.25rem 0.65rem',
                background: (stage === 'done' || (stage === 'processing' && i < Math.floor(progress / 20)))
                  ? 'var(--ok-dim)' : 'var(--surface)',
                border: `1px solid ${(stage === 'done' || (stage === 'processing' && i < Math.floor(progress / 20))) ? 'rgba(63,185,80,0.4)' : 'var(--border)'}`,
                borderRadius:5, fontSize:12, fontWeight:500,
                color: (stage === 'done' || (stage === 'processing' && i < Math.floor(progress / 20))) ? 'var(--ok)' : 'var(--muted)',
              }}>{s}</div>
              {i < 4 && <span style={{ color:'var(--muted)' }}>→</span>}
            </>
          ))}
        </div>

        <div className="row">
          <div className="col">
            {/* 上传区 */}
            {stage === 'idle' && (
              <div
                className="card"
                style={{ border:'2px dashed var(--border)', textAlign:'center', padding:'3rem 1rem', cursor:'pointer', background:'transparent' }}
                onDrop={onDrop}
                onDragOver={e => e.preventDefault()}
                onClick={() => fileRef.current?.click()}
              >
                <input ref={fileRef} type="file" accept="video/*" style={{ display:'none' }}
                  onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
                <Upload size={32} style={{ color:'var(--muted)', marginBottom:12 }} />
                <div style={{ fontSize:14, color:'var(--muted)', marginBottom:8 }}>
                  拖拽视频文件到此处，或点击选择
                </div>
                <div style={{ fontSize:12, color:'var(--muted)', opacity:0.7 }}>
                  支持 mp4 / mov / webm · 建议 5–15 秒旋转片段
                </div>
              </div>
            )}

            {/* 已加载视频 */}
            {(stage === 'loaded' || stage === 'processing' || stage === 'done') && (
              <div className="card" style={{ margin:0, marginBottom:'0.75rem' }}>
                <div className="flex-between mb-md">
                  <div className="flex-center gap-sm">
                    <Video size={14} style={{ color:'var(--accent)' }} />
                    <span style={{ fontWeight:600 }}>{fileName}</span>
                    <span className="tag tag-muted">{duration}s</span>
                  </div>
                  <div className="flex-center gap-sm">
                    {stage === 'loaded' && (
                      <button className="btn btn-sm" onClick={runAnalysis}>
                        <Play size={12} /> 开始分析
                      </button>
                    )}
                    {stage === 'done' && (
                      <span className="tag tag-ok"><CheckCircle size={11}/> 分析完成</span>
                    )}
                    <button className="btn-ghost btn-sm" onClick={() => { setStage('idle'); setReport(null); setTimeline([]) }}>
                      重新选择
                    </button>
                  </div>
                </div>
                <video ref={videoRef} controls style={{ width:'100%', borderRadius:6, background:'#000', maxHeight:280 }} />
              </div>
            )}

            {/* 处理进度 */}
            {stage === 'processing' && (
              <div className="card" style={{ margin:0, marginBottom:'0.75rem', borderColor:'rgba(88,166,255,0.3)' }}>
                <div className="flex-between mb-sm">
                  <div className="flex-center gap-sm" style={{ color:'var(--accent)', fontSize:13 }}>
                    <Loader size={13} style={{ animation:'spin 1s linear infinite' }} />
                    分析中…
                  </div>
                  <span style={{ fontSize:12, color:'var(--muted)' }}>{progress}%</span>
                </div>
                <div className="prog-wrap" style={{ height:6 }}>
                  <div className="prog-bar" style={{ width:`${progress}%`, background:'var(--accent)' }} />
                </div>
              </div>
            )}

            {/* Feature Timeline 图 */}
            {timeline.length > 0 && (
              <div className="card" style={{ margin:0, marginBottom:'0.75rem' }}>
                <div className="card-title">Feature Timeline — 实时旋转数据</div>
                <ResponsiveContainer width="100%" height={210}>
                  <LineChart data={timeline} margin={{ top:4, right:10, bottom:4, left:-14 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="t" stroke="var(--muted)" tick={{ fontSize:10 }}
                      label={{ value:'时间 (s)', position:'insideBottomRight', offset:-4, fill:'var(--muted)', fontSize:10 }} />
                    <YAxis yAxisId="a" stroke="var(--muted)" tick={{ fontSize:10 }} />
                    <YAxis yAxisId="s" orientation="right" stroke="var(--muted)" tick={{ fontSize:10 }} />
                    <Tooltip contentStyle={{ background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:6, fontSize:11 }}
                      labelFormatter={v => `t=${v}s`} />
                    <ReferenceLine yAxisId="a" y={2} stroke="rgba(63,185,80,0.35)" strokeDasharray="4,3"/>
                    <ReferenceLine yAxisId="a" y={8} stroke="rgba(248,81,73,0.35)" strokeDasharray="4,3"/>
                    <Line yAxisId="a" type="monotone" dataKey="axis"  name="Axis(°)"  stroke="#bc8cff" strokeWidth={1.5} dot={false} />
                    <Line yAxisId="s" type="monotone" dataKey="speed" name="Speed(rpm)" stroke="#58a6ff" strokeWidth={1.5} dot={false} />
                    <Line yAxisId="a" type="monotone" dataKey="drift" name="Drift"    stroke="#3fb950" strokeWidth={1.2} dot={false} strokeDasharray="5,3" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* LLM 报告 */}
            {report && (
              <div className="card" style={{ margin:0, borderColor:'rgba(188,140,255,0.25)' }}>
                <div className="card-title">
                  <span style={{ color:'var(--purple)' }}>LLM 分析报告</span>
                  <span className="tag tag-muted" style={{ marginLeft:'auto', fontSize:10 }}>{report.model}</span>
                  <span className="tag tag-ok">success</span>
                </div>
                {error && (
                  <div style={{ fontSize:12, color:'var(--warn)', marginBottom:'0.6rem', display:'flex', alignItems:'center', gap:4 }}>
                    <AlertTriangle size={12}/> {error}
                  </div>
                )}
                <div style={{ fontSize:13, lineHeight:1.8, whiteSpace:'pre-wrap', color:'var(--text)', borderLeft:'3px solid var(--purple)', paddingLeft:'0.85rem' }}>
                  {report.markdown}
                </div>
                <div style={{ marginTop:'0.75rem', fontSize:11, color:'var(--muted)' }}>
                  Report ID: <span className="mono">{report.reportId}</span> ·
                  生成于 {new Date(report.generatedAt).toLocaleString()}
                </div>
                {report.knowledgeRefs?.length > 0 && (
                  <div style={{ marginTop:'0.5rem', fontSize:11, color:'var(--muted)' }}>
                    引用知识：{report.knowledgeRefs.join(', ')}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 右侧：Feature 摘要 */}
          <div style={{ width:200, flexShrink:0 }}>
            {Object.keys(features).length > 0 ? (
              <>
                <div className="section-title">Feature 摘要</div>
                <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
                  {[
                    { label:'Axis Stability (std)', val: `${features.axisStd}°`, grade: gradeAxis(features.axisStd!) },
                    { label:'Peak Speed',           val: `${features.speedPeak} rpm`, grade: gradeSpeed(features.speedPeak!) },
                    { label:'Mean Speed',           val: `${features.speedMean} rpm`, grade: gradeSpeed(features.speedMean!) },
                    { label:'Max Center Drift',     val: `${features.driftMax}`, grade: gradeDrift(features.driftMax!) },
                  ].map(f => (
                    <div key={f.label} className="stat-card" style={{ padding:'0.6rem 0.75rem' }}>
                      <div style={{ fontSize:11, color:'var(--muted)', marginBottom:2 }}>{f.label}</div>
                      <div style={{ fontSize:16, fontWeight:700 }}>{f.val}</div>
                      <div style={{ marginTop:3 }}>{gradeTag(f.grade)}</div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="card" style={{ textAlign:'center', padding:'1.5rem 0.5rem', margin:0 }}>
                <div style={{ fontSize:12, color:'var(--muted)' }}>上传视频后<br/>Feature 摘要将显示在这里</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </>
  )
}
