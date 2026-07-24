// ── Knowledge 数据 ──────────────────────────────────────────
export interface KnowledgeItem {
  id: string
  title: string
  category: 'biomechanics' | 'physics' | 'isu' | 'features' | 'rules' | 'prompts'
  status: 'active' | 'draft' | 'deprecated'
  version: string
  definition: string
  formula?: string
  importance?: string
  relatedFeatures?: string[]
  relatedRules?: string[]
  references?: string[]
  history: { version: string; note: string }[]
}

export const KNOWLEDGE_DATA: KnowledgeItem[] = [
  {
    id: 'axis_stability',
    title: 'Axis Stability',
    category: 'biomechanics',
    status: 'active',
    version: 'v3',
    definition: '旋转过程中，躯干惯性主轴相对竖直旋转轴的锥半角随时间波动的程度。稳定旋转时锥半角可恒定（允许固有倾斜）；真正的不稳表现为锥半角随时间变化（章动 / 姿态崩坏）。',
    formula: 'tiltWobble = std(clean(θ))\nθ = computeSpineTilt3D(shoulders, hips)',
    importance: '轴稳定是旋转质量的核心生物力学信号，直接关联 wobble 与落地可控性。',
    relatedFeatures: ['spin.axis_stability', 'spin.inclination'],
    relatedRules: ['Axis Stability Rule'],
    references: ['knowledge/biomechanics/axis_stability.md', 'knowledge/biomechanics/wobble.md', 'ISU Communication 2353 §3.2'],
    history: [
      { version: 'v3', note: '加入 MAD 剔除异常帧逻辑，抗遮挡干扰' },
      { version: 'v2', note: '改用 3D 锥半角替代 2D 倾角，提高低速旋转精度' },
      { version: 'v1', note: '初版：基于 shoulders-hips 2D 标准差' },
    ],
  },
  {
    id: 'wobble',
    title: 'Wobble',
    category: 'biomechanics',
    status: 'active',
    version: 'v1',
    definition: '旋转轴在空间中的章动现象：轴心不停地绕某一方向小幅摆动。与"固有倾斜"区分——固有倾斜是恒定角度，wobble 是变化的角度。',
    relatedFeatures: ['spin.axis_stability'],
    relatedRules: ['Axis Stability Rule'],
    references: ['knowledge/biomechanics/axis_stability.md'],
    history: [{ version: 'v1', note: '初版定义' }],
  },
  {
    id: 'center_of_mass',
    title: 'Center of Mass',
    category: 'physics',
    status: 'active',
    version: 'v2',
    definition: '人体质心（COM）是整个身体质量的等效作用点。旋转时质心应尽量靠近旋转轴以减少向心力消耗；质心偏移会引起 travel。',
    formula: 'com_proxy ≈ |hipMid.x - ankleMid.x| / torsoLength',
    relatedFeatures: ['spin.com_offset_proxy', 'spin.center_drift'],
    references: ['knowledge/physics/center_of_mass.md'],
    history: [
      { version: 'v2', note: '增加旋转时 proxy 计算说明' },
      { version: 'v1', note: '基础定义' },
    ],
  },
  {
    id: 'angular_velocity',
    title: 'Angular Velocity',
    category: 'physics',
    status: 'active',
    version: 'v1',
    definition: '单位时间内转过的角度，单位 rad/s，换算为 rpm = ω × 60 / (2π)。旋转中角速度变化反映体能消耗与技术控制水平。',
    formula: 'rpm = zero_crossings_per_sec × 60 / 2',
    relatedFeatures: ['spin.speed', 'spin.angular_deceleration'],
    references: ['knowledge/physics/angular_velocity.md'],
    history: [{ version: 'v1', note: '初版' }],
  },
  {
    id: 'balance',
    title: 'Balance & Support Base',
    category: 'biomechanics',
    status: 'active',
    version: 'v1',
    definition: '平衡是质心投影落在支撑底面内的状态。单腿旋转时支撑底面极小，质心需高度对齐踝部正上方。',
    relatedFeatures: ['spin.center_drift', 'spin.com_offset_proxy'],
    references: ['knowledge/biomechanics/balance.md'],
    history: [{ version: 'v1', note: '初版' }],
  },
  {
    id: 'isu_spin',
    title: 'ISU Spin Boundary',
    category: 'isu',
    status: 'active',
    version: 'v1',
    definition: '本软件不是官方 ISU 自动打分器。MVP 仅 Upright Spin 训练分析，不输出 Level / GOE。阈值（excellent/good/poor）为 heuristic，用于训练反馈与架构验证。',
    references: ['knowledge/isu/spin.md', 'knowledge/isu/goe.md', 'knowledge/isu/level.md'],
    history: [{ version: 'v1', note: '初版边界声明' }],
  },
]

// ── Feature 数据 ──────────────────────────────────────────
export interface FeatureDefinition {
  id: string
  name: string
  unit: string
  status: 'active' | 'draft' | 'deprecated'
  inputs: string[]
  formula: string
  outputRange: string
  rule?: string
  knowledgeRef: string[]
  validation: string
  notes?: string
}

export const FEATURE_DATA: FeatureDefinition[] = [
  {
    id: 'spin.axis_stability',
    name: 'Axis Stability',
    unit: '° (degree)',
    status: 'active',
    inputs: ['shoulders (L/R)', 'hips (L/R)', 'z-depth + visibility'],
    formula: '1. 每帧 computeSpineTilt3D → 锥半角 θ\n2. 窗口(~2s) computeTiltStats → tiltWobble = std(clean(θ))',
    outputRange: '0–15°，越低越稳定',
    rule: 'Axis Stability',
    knowledgeRef: ['axis_stability', 'wobble'],
    validation: '恒定倾斜序列 → wobble ≈ 0；叠加正弦扰动 → wobble ≈ 扰动标准差',
    notes: 'MAD 剔除异常帧，抗遮挡。',
  },
  {
    id: 'spin.speed',
    name: 'Spin Speed',
    unit: 'rpm',
    status: 'active',
    inputs: ['leftShoulder.x', 'rightShoulder.x', 'FPS / timestamps'],
    formula: '1. signal = leftShoulder.x - rightShoulder.x\n2. 下降过零点间距 → half-turn spacing\n3. 换算 RPM；filter 30–800',
    outputRange: '30–800 rpm',
    rule: 'Spin Speed',
    knowledgeRef: ['angular_velocity'],
    validation: '合成正弦肩部信号 → 期望 RPM 范围',
  },
  {
    id: 'spin.center_drift',
    name: 'Center Drift',
    unit: 'body-normalized',
    status: 'active',
    inputs: ['ankleMid.x history', 'torsoLength (shoulder–hip)'],
    formula: 'center_drift = (max(ankleMidX) − min(ankleMidX)) / median(torsoLength)',
    outputRange: '0–1，越低越稳',
    rule: 'Center Drift',
    knowledgeRef: ['balance', 'center_of_mass'],
    validation: '固定踝关节 → 0；已知水平移动 → 正比于体型',
    notes: 'Proxy，非真实厘米，需身高校准。',
  },
  {
    id: 'spin.com_offset_proxy',
    name: 'COM Offset Proxy',
    unit: 'body-normalized',
    status: 'active',
    inputs: ['hipMid.x', 'ankleMid.x', 'torsoLength'],
    formula: 'com_offset_proxy = |hipMid.x − ankleMid.x| / torsoLength',
    outputRange: '0–0.5',
    knowledgeRef: ['center_of_mass', 'balance'],
    validation: '髋踝对齐 → ~0；侧向髋偏移 → 增大',
    notes: '骨盆到支撑基的水平距离 proxy，非真实质心。',
  },
  {
    id: 'spin.inclination',
    name: 'Inclination',
    unit: '° (degree)',
    status: 'active',
    inputs: ['shoulders (L/R)', 'hips (L/R)'],
    formula: 'mean(computeSpineTilt3D) over window — 固有倾斜角（与 wobble 区分）',
    outputRange: '0–20°',
    knowledgeRef: ['axis_stability'],
    validation: '直立静止 → ~0；已知倾斜角 → ±0.5°',
  },
  {
    id: 'spin.angular_deceleration',
    name: 'Angular Deceleration',
    unit: 'rpm/s',
    status: 'active',
    inputs: ['spin.speed 时间序列'],
    formula: 'decel = −dRPM/dt，clipped at 0（只取减速段）',
    outputRange: '0–50 rpm/s',
    knowledgeRef: ['angular_velocity'],
    validation: '恒速序列 → ~0；已知减速曲线 → 吻合',
  },
]

// ── Rule 数据 ──────────────────────────────────────────
export interface RuleGrade {
  grade: string
  condition: string
  value: number
  unit: string
  color: 'ok' | 'warn' | 'danger'
}
export interface RuleDefinition {
  id: string
  name: string
  featureId: string
  status: 'heuristic' | 'isu' | 'draft'
  grades: RuleGrade[]
  warnBand?: string
  note?: string
}

export const RULE_DATA: RuleDefinition[] = [
  {
    id: 'axis',
    name: 'Axis Stability',
    featureId: 'spin.axis_stability',
    status: 'heuristic',
    grades: [
      { grade: 'Excellent', condition: 'std < 2°', value: 2, unit: '°', color: 'ok' },
      { grade: 'Good',      condition: 'std < 5°', value: 5, unit: '°', color: 'warn' },
      { grade: 'Poor',      condition: 'std ≥ 8°', value: 8, unit: '°', color: 'danger' },
    ],
    warnBand: '5–8°（中间警告区间）',
    note: '训练反馈，非 ISU 标准。需 ≥20 样本升级为 ISU。',
  },
  {
    id: 'speed',
    name: 'Spin Speed',
    featureId: 'spin.speed',
    status: 'heuristic',
    grades: [
      { grade: 'Excellent', condition: '≥ 120 rpm', value: 120, unit: 'rpm', color: 'ok' },
      { grade: 'Good',      condition: '≥ 80 rpm',  value: 80,  unit: 'rpm', color: 'warn' },
      { grade: 'Poor',      condition: '< 60 rpm',  value: 60,  unit: 'rpm', color: 'danger' },
    ],
  },
  {
    id: 'travel',
    name: 'Center Drift',
    featureId: 'spin.center_drift',
    status: 'heuristic',
    grades: [
      { grade: 'Excellent', condition: '< 0.08', value: 0.08, unit: '', color: 'ok' },
      { grade: 'Good',      condition: '< 0.20', value: 0.20, unit: '', color: 'warn' },
      { grade: 'Poor',      condition: '≥ 0.35', value: 0.35, unit: '', color: 'danger' },
    ],
    note: 'body-normalized 单位，非真实 cm。',
  },
  {
    id: 'inclination',
    name: 'Inclination',
    featureId: 'spin.inclination',
    status: 'heuristic',
    grades: [
      { grade: 'Upright',  condition: '< 3°',  value: 3,  unit: '°', color: 'ok' },
      { grade: 'Tilted',   condition: '< 8°',  value: 8,  unit: '°', color: 'warn' },
      { grade: 'Over-lean',condition: '≥ 12°', value: 12, unit: '°', color: 'danger' },
    ],
  },
  {
    id: 'deceleration',
    name: 'Angular Deceleration',
    featureId: 'spin.angular_deceleration',
    status: 'heuristic',
    grades: [
      { grade: 'Controlled', condition: '< 10 rpm/s',  value: 10, unit: 'rpm/s', color: 'ok' },
      { grade: 'Moderate',   condition: '< 25 rpm/s',  value: 25, unit: 'rpm/s', color: 'warn' },
      { grade: 'Rapid',      condition: '≥ 40 rpm/s',  value: 40, unit: 'rpm/s', color: 'danger' },
    ],
  },
]

// ── Dataset / Session 数据 ──────────────────────────────────────────
export interface SpinSession {
  id: string
  date: string
  skater: string
  spinType: string
  duration: number
  features: {
    axis_stability: number
    speed: number
    center_drift: number
    com_offset: number
    inclination: number
    deceleration: number
  }
  grade: 'excellent' | 'good' | 'poor'
  hasReport: boolean
}

export const SESSION_DATA: SpinSession[] = [
  { id: 'S001', date: '2026-07-20 14:32', skater: 'A', spinType: 'Upright Spin', duration: 8.2, features: { axis_stability: 1.8, speed: 134, center_drift: 0.06, com_offset: 0.04, inclination: 2.1, deceleration: 8.5 }, grade: 'excellent', hasReport: true },
  { id: 'S002', date: '2026-07-20 14:40', skater: 'A', spinType: 'Upright Spin', duration: 7.1, features: { axis_stability: 3.2, speed: 98,  center_drift: 0.12, com_offset: 0.08, inclination: 3.8, deceleration: 14.2 }, grade: 'good', hasReport: true },
  { id: 'S003', date: '2026-07-21 09:15', skater: 'B', spinType: 'Upright Spin', duration: 6.5, features: { axis_stability: 6.7, speed: 72,  center_drift: 0.28, com_offset: 0.15, inclination: 7.2, deceleration: 22.1 }, grade: 'poor', hasReport: false },
  { id: 'S004', date: '2026-07-21 10:02', skater: 'B', spinType: 'Upright Spin', duration: 7.8, features: { axis_stability: 4.1, speed: 110, center_drift: 0.18, com_offset: 0.11, inclination: 5.5, deceleration: 18.3 }, grade: 'good', hasReport: true },
  { id: 'S005', date: '2026-07-22 11:30', skater: 'A', spinType: 'Upright Spin', duration: 9.1, features: { axis_stability: 1.5, speed: 142, center_drift: 0.05, com_offset: 0.03, inclination: 1.8, deceleration: 7.2 }, grade: 'excellent', hasReport: true },
  { id: 'S006', date: '2026-07-22 15:45', skater: 'C', spinType: 'Upright Spin', duration: 5.8, features: { axis_stability: 9.2, speed: 58,  center_drift: 0.41, com_offset: 0.22, inclination: 11.4, deceleration: 31.6 }, grade: 'poor', hasReport: false },
]

// ── Analysis 数据 ──────────────────────────────────────────
export interface AnalysisReport {
  sessionId: string
  reportId: string
  createdAt: string
  model: string
  latencyMs: number
  status: 'success' | 'error'
  featureTimeline: { t: number; axis: number; speed: number; drift: number }[]
  events: { t: number; type: string; severity: 'info' | 'warn' | 'danger'; msg: string }[]
  llmSummary: string
  grades: Record<string, string>
}

export const ANALYSIS_REPORT: AnalysisReport = {
  sessionId: 'S001',
  reportId: 'RPT-2026072001',
  createdAt: '2026-07-20T14:33:21Z',
  model: 'gpt-4o',
  latencyMs: 2340,
  status: 'success',
  featureTimeline: [
    { t: 0,   axis: 5.2, speed: 80,  drift: 0.05 },
    { t: 0.5, axis: 3.1, speed: 110, drift: 0.04 },
    { t: 1.0, axis: 2.4, speed: 128, drift: 0.05 },
    { t: 1.5, axis: 1.9, speed: 134, drift: 0.06 },
    { t: 2.0, axis: 1.7, speed: 136, drift: 0.06 },
    { t: 2.5, axis: 1.8, speed: 134, drift: 0.05 },
    { t: 3.0, axis: 2.0, speed: 132, drift: 0.07 },
    { t: 3.5, axis: 2.1, speed: 128, drift: 0.06 },
    { t: 4.0, axis: 1.9, speed: 125, drift: 0.05 },
    { t: 4.5, axis: 2.2, speed: 120, drift: 0.07 },
    { t: 5.0, axis: 2.5, speed: 115, drift: 0.08 },
    { t: 5.5, axis: 3.1, speed: 108, drift: 0.09 },
    { t: 6.0, axis: 4.2, speed: 96,  drift: 0.12 },
    { t: 6.5, axis: 5.8, speed: 82,  drift: 0.15 },
    { t: 7.0, axis: 7.1, speed: 68,  drift: 0.19 },
    { t: 7.5, axis: 8.5, speed: 55,  drift: 0.22 },
    { t: 8.0, axis: 10.2, speed: 44, drift: 0.28 },
  ],
  events: [
    { t: 0.3,  type: 'SpinStart',    severity: 'info',   msg: '检测到旋转开始，进入加速阶段' },
    { t: 1.8,  type: 'PeakSpeed',    severity: 'info',   msg: '达到峰值转速 136 rpm（Excellent）' },
    { t: 5.8,  type: 'Deceleration', severity: 'warn',   msg: '转速下降超过 20 rpm/s，开始减速' },
    { t: 7.2,  type: 'AxisDrift',    severity: 'warn',   msg: 'Axis Stability 超过 5°，进入 warn 区间' },
    { t: 7.8,  type: 'AxisPoor',     severity: 'danger', msg: 'Axis Stability 8.5° > 8°，进入 poor 区间' },
    { t: 8.2,  type: 'SpinEnd',      severity: 'info',   msg: '旋转结束' },
  ],
  llmSummary: `本次旋转整体质量良好。

加速阶段（0–1.8s）：轴稳定性从 5.2° 快速收敛至 1.7°，峰值转速达到 136 rpm，属于 Excellent 级别。重心漂移全程 < 0.08，控制优秀。

峰值维持阶段（1.8–5.5s）：轴稳定性稳定在 1.8–2.5° 范围，Excellent 水平持续约 3.7 秒。

减速阶段（5.5–8.2s）：转速从 108 rpm 快速下降，轴稳定性随之恶化至 10.2°，重心漂移增至 0.28。这是旋转尾段常见的姿态崩溃模式，提示核心力量维持不足。

建议：重点训练旋转最后 2 秒的躯干控制，避免提前松懈轴心。`,
  grades: {
    axis_stability: 'excellent',
    speed: 'excellent',
    center_drift: 'excellent',
    inclination: 'excellent',
  },
}
