// MediaPipe Pose 关键点索引
export const LANDMARKS = {
  NOSE: 0,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
} as const

export interface Landmark {
  x: number  // 归一化 0-1
  y: number  // 归一化 0-1
  z?: number
  visibility?: number
}

export interface SpinMetrics {
  tiltAngle: number      // 脊柱倾斜角（度），0=竖直
  driftRange: number     // 质心漂移范围（归一化，0-1）
  rpm: number            // 转速（圈/分钟）
  armSymmetry: number    // 手臂对称性（0-1，1=完美）
  isSpinning: boolean    // 是否在旋转
}

export interface SpinScores {
  stability: number   // 稳定性 0-100
  symmetry: number    // 对称性 0-100
  drift: number       // 漂移控制 0-100
  tilt: number        // 倾斜控制 0-100
  overall: number     // 综合评分 0-100
}

export interface SpinThresholds {
  maxTiltDeg: number   // 最大允许倾斜角度（默认5°）
  maxDrift: number     // 最大允许漂移（归一化，默认0.05）
  minRPM: number       // 最小旋转速度（默认60）
}

export const DEFAULT_THRESHOLDS: SpinThresholds = {
  maxTiltDeg: 5,
  maxDrift: 0.05,
  minRPM: 60,
}

// 两点中点
function midpoint(a: Landmark, b: Landmark): Landmark {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

// 限制在范围内
function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

/**
 * 计算脊柱倾斜角
 * 向量：髋中点 → 肩中点 与竖直轴（0,-1）的夹角
 * 正值 = 右倾，负值 = 左倾
 */
export function computeSpineTilt(landmarks: Landmark[]): number {
  const lsh = landmarks[LANDMARKS.LEFT_SHOULDER]
  const rsh = landmarks[LANDMARKS.RIGHT_SHOULDER]
  const lhip = landmarks[LANDMARKS.LEFT_HIP]
  const rhip = landmarks[LANDMARKS.RIGHT_HIP]

  if (!lsh || !rsh || !lhip || !rhip) return 0

  const shoulder = midpoint(lsh, rsh)
  const hip = midpoint(lhip, rhip)

  const dx = shoulder.x - hip.x
  const dy = shoulder.y - hip.y  // 屏幕坐标 y 向下为正

  // 与竖直向上 (0, -1) 的夹角
  const angle = Math.atan2(dx, -dy) * (180 / Math.PI)
  return angle
}

/**
 * 计算质心水平漂移范围
 * 基于最近N帧的踝关节水平位移 max-min
 * 返回归一化值（0-1）
 */
export function computeDriftRange(frameHistory: Landmark[][]): number {
  if (frameHistory.length < 2) return 0

  const xs = frameHistory.map(frame => {
    const la = frame[LANDMARKS.LEFT_ANKLE]
    const ra = frame[LANDMARKS.RIGHT_ANKLE]
    if (!la || !ra) return null
    return (la.x + ra.x) / 2
  }).filter((x): x is number => x !== null)

  if (xs.length < 2) return 0
  return Math.max(...xs) - Math.min(...xs)
}

/**
 * 检测旋转 RPM（每分钟圈数）
 * 使用肩部宽度信号过零点法：
 *   肩部X差值 (leftShoulder.x - rightShoulder.x) 在旋转中会周期变化
 *   过零点（正→负）代表旋转半圈
 */
export function computeRPM(frameHistory: Landmark[][], fps: number): number {
  if (frameHistory.length < fps) return 0  // 至少1秒数据

  // 提取肩部差值信号
  const signal = frameHistory.map(frame => {
    const ls = frame[LANDMARKS.LEFT_SHOULDER]
    const rs = frame[LANDMARKS.RIGHT_SHOULDER]
    if (!ls || !rs) return null
    return ls.x - rs.x
  }).filter((v): v is number => v !== null)

  if (signal.length < 10) return 0

  // 去均值
  const mean = signal.reduce((a, b) => a + b, 0) / signal.length
  const centered = signal.map(v => v - mean)

  // 检测下降过零点（正→负）
  const zeroCrossings: number[] = []
  for (let i = 1; i < centered.length; i++) {
    if (centered[i - 1] > 0 && centered[i] <= 0) {
      zeroCrossings.push(i)
    }
  }

  if (zeroCrossings.length < 2) return 0

  // 计算相邻过零点间距（每个间距 = 半圈）
  const halfPeriods: number[] = []
  for (let i = 1; i < zeroCrossings.length; i++) {
    halfPeriods.push(zeroCrossings[i] - zeroCrossings[i - 1])
  }

  const avgHalfPeriodFrames = halfPeriods.reduce((a, b) => a + b, 0) / halfPeriods.length
  const avgPeriodFrames = avgHalfPeriodFrames * 2
  const rpm = (fps / avgPeriodFrames) * 60

  // 合理性过滤：花样滑冰通常 60-600 RPM
  if (rpm < 30 || rpm > 800) return 0
  return Math.round(rpm)
}

/**
 * 计算手臂对称性
 * 以髋中点为原点，双腕相对位置镜像比较
 * 返回 0-1（1=完美对称）
 */
export function computeArmSymmetry(landmarks: Landmark[]): number {
  const lw = landmarks[LANDMARKS.LEFT_WRIST]
  const rw = landmarks[LANDMARKS.RIGHT_WRIST]
  const lhip = landmarks[LANDMARKS.LEFT_HIP]
  const rhip = landmarks[LANDMARKS.RIGHT_HIP]
  const lsh = landmarks[LANDMARKS.LEFT_SHOULDER]
  const rsh = landmarks[LANDMARKS.RIGHT_SHOULDER]

  if (!lw || !rw || !lhip || !rhip || !lsh || !rsh) return 1

  const hip = midpoint(lhip, rhip)
  const shoulderWidth = Math.abs(lsh.x - rsh.x)
  if (shoulderWidth < 0.01) return 1

  // 双腕相对髋中点的位置（左腕x镜像）
  const leftRelX = hip.x - lw.x  // 左腕：镜像
  const leftRelY = lw.y - hip.y

  const rightRelX = rw.x - hip.x
  const rightRelY = rw.y - hip.y

  const diffX = leftRelX - rightRelX
  const diffY = leftRelY - rightRelY
  const diff = Math.sqrt(diffX * diffX + diffY * diffY)

  const symmetry = 1 - clamp(diff / shoulderWidth, 0, 1)
  return symmetry
}

/**
 * 判断是否在旋转（基于肩部信号周期性）
 */
export function detectIsSpinning(frameHistory: Landmark[][], fps: number): boolean {
  if (frameHistory.length < fps * 0.5) return false

  const signal = frameHistory.slice(-Math.floor(fps)).map(frame => {
    const ls = frame[LANDMARKS.LEFT_SHOULDER]
    const rs = frame[LANDMARKS.RIGHT_SHOULDER]
    if (!ls || !rs) return null
    return ls.x - rs.x
  }).filter((v): v is number => v !== null)

  if (signal.length < 8) return false

  // 信号方差 > 阈值表示有周期性变化
  const mean = signal.reduce((a, b) => a + b, 0) / signal.length
  const variance = signal.reduce((sum, v) => sum + (v - mean) ** 2, 0) / signal.length
  return variance > 0.002
}

/**
 * 综合计算所有指标
 */
export function computeMetrics(
  currentLandmarks: Landmark[],
  frameHistory: Landmark[][],
  fps: number
): SpinMetrics {
  return {
    tiltAngle: computeSpineTilt(currentLandmarks),
    driftRange: computeDriftRange(frameHistory),
    rpm: computeRPM(frameHistory, fps),
    armSymmetry: computeArmSymmetry(currentLandmarks),
    isSpinning: detectIsSpinning(frameHistory, fps),
  }
}

/**
 * 根据指标生成评分（0-100）
 */
export function computeScores(
  metrics: SpinMetrics,
  thresholds: SpinThresholds = DEFAULT_THRESHOLDS
): SpinScores {
  const tiltScore = clamp(
    100 - (Math.abs(metrics.tiltAngle) / thresholds.maxTiltDeg) * 100,
    0, 100
  )

  const driftScore = clamp(
    100 - (metrics.driftRange / thresholds.maxDrift) * 100,
    0, 100
  )

  const symmetryScore = metrics.armSymmetry * 100

  // 稳定性：综合漂移和倾斜
  const stabilityScore = (tiltScore * 0.4 + driftScore * 0.6)

  const overall = (stabilityScore * 0.35 + symmetryScore * 0.25 + driftScore * 0.25 + tiltScore * 0.15)

  return {
    stability: Math.round(stabilityScore),
    symmetry: Math.round(symmetryScore),
    drift: Math.round(driftScore),
    tilt: Math.round(tiltScore),
    overall: Math.round(overall),
  }
}

/**
 * 根据评分获取状态标签
 */
export function getStatusLabel(metrics: SpinMetrics, scores: SpinScores): {
  text: string
  level: 'good' | 'warn' | 'bad' | 'idle'
} {
  if (!metrics.isSpinning) return { text: '等待旋转', level: 'idle' }
  if (scores.overall >= 80) return { text: '轴心稳定', level: 'good' }
  if (scores.overall >= 50) return { text: '轻微偏移', level: 'warn' }
  return { text: '轴心偏移', level: 'bad' }
}

/**
 * 生成指导建议
 */
export function generateFeedback(metrics: SpinMetrics): string[] {
  const tips: string[] = []

  if (Math.abs(metrics.tiltAngle) > 5) {
    const dir = metrics.tiltAngle > 0 ? '右' : '左'
    tips.push(`身体向${dir}侧倾斜 ${Math.abs(metrics.tiltAngle).toFixed(1)}°，保持脊柱垂直`)
  }

  if (metrics.driftRange > 0.05) {
    tips.push(`旋转中心漂移过大，专注于支撑脚的固定点`)
  }

  if (metrics.armSymmetry < 0.7) {
    tips.push(`手臂不对称，收紧双臂使其贴近身体两侧均匀`)
  }

  if (metrics.isSpinning && metrics.rpm < 60) {
    tips.push(`转速偏低，尝试收紧手臂提升旋转速度`)
  }

  if (tips.length === 0 && metrics.isSpinning) {
    tips.push(`旋转状态良好，保持当前姿态`)
  }

  return tips
}
