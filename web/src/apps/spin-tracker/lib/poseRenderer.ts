import { LANDMARKS, type PoseLandmark } from '@/platforms/figure-skating/core'
import { computeSpineTilt } from '@spin/features'

type Landmark = PoseLandmark

// MediaPipe Pose 骨骼连线定义
const POSE_CONNECTIONS: [number, number][] = [
  // 躯干
  [LANDMARKS.LEFT_SHOULDER, LANDMARKS.RIGHT_SHOULDER],
  [LANDMARKS.LEFT_SHOULDER, LANDMARKS.LEFT_HIP],
  [LANDMARKS.RIGHT_SHOULDER, LANDMARKS.RIGHT_HIP],
  [LANDMARKS.LEFT_HIP, LANDMARKS.RIGHT_HIP],
  // 左臂
  [LANDMARKS.LEFT_SHOULDER, LANDMARKS.LEFT_ELBOW],
  [LANDMARKS.LEFT_ELBOW, LANDMARKS.LEFT_WRIST],
  // 右臂
  [LANDMARKS.RIGHT_SHOULDER, LANDMARKS.RIGHT_ELBOW],
  [LANDMARKS.RIGHT_ELBOW, LANDMARKS.RIGHT_WRIST],
  // 左腿
  [LANDMARKS.LEFT_HIP, LANDMARKS.LEFT_KNEE],
  [LANDMARKS.LEFT_KNEE, LANDMARKS.LEFT_ANKLE],
  // 右腿
  [LANDMARKS.RIGHT_HIP, LANDMARKS.RIGHT_KNEE],
  [LANDMARKS.RIGHT_KNEE, LANDMARKS.RIGHT_ANKLE],
]

// 核心关键点（绘制关节圆圈）
const KEY_JOINTS = [
  LANDMARKS.LEFT_SHOULDER, LANDMARKS.RIGHT_SHOULDER,
  LANDMARKS.LEFT_ELBOW, LANDMARKS.RIGHT_ELBOW,
  LANDMARKS.LEFT_WRIST, LANDMARKS.RIGHT_WRIST,
  LANDMARKS.LEFT_HIP, LANDMARKS.RIGHT_HIP,
  LANDMARKS.LEFT_KNEE, LANDMARKS.RIGHT_KNEE,
  LANDMARKS.LEFT_ANKLE, LANDMARKS.RIGHT_ANKLE,
]

function toCanvas(landmark: Landmark, w: number, h: number): [number, number] {
  return [landmark.x * w, landmark.y * h]
}

/**
 * 渲染骨骼连线
 */
export function renderSkeleton(
  ctx: CanvasRenderingContext2D,
  landmarks: Landmark[],
  w: number,
  h: number,
  isGood: boolean
): void {
  const lineColor = isGood
    ? 'rgba(74, 222, 128, 0.8)'
    : 'rgba(251, 146, 60, 0.8)'

  ctx.lineWidth = 2.5
  ctx.lineCap = 'round'

  for (const [a, b] of POSE_CONNECTIONS) {
    const la = landmarks[a]
    const lb = landmarks[b]
    if (!la || !lb) continue
    if ((la.visibility ?? 1) < 0.3 || (lb.visibility ?? 1) < 0.3) continue

    const [ax, ay] = toCanvas(la, w, h)
    const [bx, by] = toCanvas(lb, w, h)

    ctx.beginPath()
    ctx.strokeStyle = lineColor
    ctx.moveTo(ax, ay)
    ctx.lineTo(bx, by)
    ctx.stroke()
  }

  // 绘制关节圆圈
  for (const idx of KEY_JOINTS) {
    const lm = landmarks[idx]
    if (!lm || (lm.visibility ?? 1) < 0.3) continue
    const [x, y] = toCanvas(lm, w, h)

    ctx.beginPath()
    ctx.arc(x, y, 5, 0, Math.PI * 2)
    ctx.fillStyle = isGood ? 'rgba(74, 222, 128, 1)' : 'rgba(251, 146, 60, 1)'
    ctx.fill()
  }
}

/**
 * 渲染旋转轴线（脊柱中心线延伸）
 * wobbleGood: 轴心晃动是否在允许范围内（基于锥半角波动，而非瞬时投影角）
 */
export function renderSpineAxis(
  ctx: CanvasRenderingContext2D,
  landmarks: Landmark[],
  w: number,
  h: number,
  wobbleGood: boolean
): void {
  const lsh = landmarks[LANDMARKS.LEFT_SHOULDER]
  const rsh = landmarks[LANDMARKS.RIGHT_SHOULDER]
  const lhip = landmarks[LANDMARKS.LEFT_HIP]
  const rhip = landmarks[LANDMARKS.RIGHT_HIP]

  if (!lsh || !rsh || !lhip || !rhip) return

  const shoulderMid = {
    x: (lsh.x + rsh.x) / 2 * w,
    y: (lsh.y + rsh.y) / 2 * h,
  }
  const hipMid = {
    x: (lhip.x + rhip.x) / 2 * w,
    y: (lhip.y + rhip.y) / 2 * h,
  }

  // 方向向量
  const dx = shoulderMid.x - hipMid.x
  const dy = shoulderMid.y - hipMid.y
  const len = Math.sqrt(dx * dx + dy * dy)
  if (len < 1) return

  const nx = dx / len
  const ny = dy / len

  // 延伸脊柱线（上下各延伸1.5倍身体长度）
  const extend = len * 1.5
  const topX = shoulderMid.x + nx * extend
  const topY = shoulderMid.y + ny * extend
  const botX = hipMid.x - nx * extend
  const botY = hipMid.y - ny * extend

  const axisColor = wobbleGood ? 'rgba(74, 222, 128, 0.6)' : 'rgba(251, 146, 60, 0.8)'

  // 理想垂直轴（虚线）
  const centerX = (shoulderMid.x + hipMid.x) / 2
  ctx.beginPath()
  ctx.setLineDash([8, 6])
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'
  ctx.lineWidth = 1.5
  ctx.moveTo(centerX, 0)
  ctx.lineTo(centerX, h)
  ctx.stroke()
  ctx.setLineDash([])

  // 实际脊柱轴线
  ctx.beginPath()
  ctx.strokeStyle = axisColor
  ctx.lineWidth = 2.5
  ctx.moveTo(topX, topY)
  ctx.lineTo(botX, botY)
  ctx.stroke()

  // 轴线端点箭头
  ctx.beginPath()
  ctx.arc(topX, topY, 5, 0, Math.PI * 2)
  ctx.fillStyle = axisColor
  ctx.fill()
}

/**
 * 渲染质心轨迹（最近N帧）
 */
export function renderDriftTrail(
  ctx: CanvasRenderingContext2D,
  frameHistory: Landmark[][],
  w: number,
  h: number
): void {
  if (frameHistory.length < 2) return

  const points = frameHistory.slice(-40).map(frame => {
    const la = frame[LANDMARKS.LEFT_ANKLE]
    const ra = frame[LANDMARKS.RIGHT_ANKLE]
    if (!la || !ra) return null
    return { x: (la.x + ra.x) / 2 * w, y: (la.y + ra.y) / 2 * h }
  }).filter((p): p is { x: number; y: number } => p !== null)

  if (points.length < 2) return

  for (let i = 1; i < points.length; i++) {
    const alpha = i / points.length
    ctx.beginPath()
    ctx.strokeStyle = `rgba(99, 179, 237, ${alpha * 0.7})`
    ctx.lineWidth = 2
    ctx.moveTo(points[i - 1].x, points[i - 1].y)
    ctx.lineTo(points[i].x, points[i].y)
    ctx.stroke()
  }

  // 当前质心点
  const last = points[points.length - 1]
  ctx.beginPath()
  ctx.arc(last.x, last.y, 5, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(99, 179, 237, 0.9)'
  ctx.fill()
}

/**
 * 渲染倾斜角度标注（角度弧线）
 * 显示瞬时2D投影角供参考，颜色由晃动度决定
 */
export function renderTiltIndicator(
  ctx: CanvasRenderingContext2D,
  landmarks: Landmark[],
  w: number,
  h: number,
  tiltAngle: number,
  wobbleGood: boolean
): void {
  const lhip = landmarks[LANDMARKS.LEFT_HIP]
  const rhip = landmarks[LANDMARKS.RIGHT_HIP]
  if (!lhip || !rhip) return

  const hipMidX = (lhip.x + rhip.x) / 2 * w
  const hipMidY = (lhip.y + rhip.y) / 2 * h

  if (Math.abs(tiltAngle) < 1) return

  // 绘制角度文字
  ctx.font = 'bold 14px JetBrains Mono, monospace'
  ctx.fillStyle = wobbleGood ? 'rgba(74, 222, 128, 0.9)' : 'rgba(251, 146, 60, 0.9)'
  ctx.textAlign = tiltAngle > 0 ? 'left' : 'right'
  const textX = hipMidX + (tiltAngle > 0 ? 12 : -12)
  ctx.fillText(`${tiltAngle > 0 ? '+' : ''}${tiltAngle.toFixed(1)}°`, textX, hipMidY)
}

/**
 * 完整渲染入口。骨骼 / 轴线 / 倾角指示统一使用 status 派生的 isGood。
 */
export function renderAll(
  ctx: CanvasRenderingContext2D,
  landmarks: Landmark[],
  frameHistory: Landmark[][],
  w: number,
  h: number,
  isGood: boolean,
): void {
  ctx.clearRect(0, 0, w, h)

  const tiltAngle = computeSpineTilt(landmarks)

  renderDriftTrail(ctx, frameHistory, w, h)
  renderSpineAxis(ctx, landmarks, w, h, isGood)
  renderSkeleton(ctx, landmarks, w, h, isGood)
  renderTiltIndicator(ctx, landmarks, w, h, tiltAngle, isGood)
}
