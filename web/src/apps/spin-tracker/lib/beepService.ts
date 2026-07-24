/**
 * 提示音服务（Web Audio API 合成，无外部音频文件依赖）
 *
 * 用两个不同音高的短促正弦音表示开始/结束：
 * - 开始：上行双音（高音在前），音调明亮上扬
 * - 结束：下行双音（低音收尾），音调低沉回落
 *
 * AudioContext 需要用户手势后才能启动，首次调用若在手势前会被静默忽略；
 * 耳机按键/按钮点击都属于用户手势，此时调用必定可发声。
 */

let ctx: AudioContext | null = null

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  // 浏览器自动播放策略：suspend 状态下尝试恢复
  if (ctx.state === 'suspended') {
    void ctx.resume()
  }
  return ctx
}

/** 播放单个音符 */
function playTone(
  audioCtx: AudioContext,
  freq: number,
  startAt: number,
  duration: number,
  volume: number
): void {
  const osc = audioCtx.createOscillator()
  const gain = audioCtx.createGain()

  osc.type = 'sine'
  osc.frequency.value = freq

  // 快速起音 + 平滑释音，避免爆音
  gain.gain.setValueAtTime(0, startAt)
  gain.gain.linearRampToValueAtTime(volume, startAt + 0.015)
  gain.gain.setValueAtTime(volume, startAt + duration - 0.05)
  gain.gain.exponentialRampToValueAtTime(0.001, startAt + duration)

  osc.connect(gain).connect(audioCtx.destination)
  osc.start(startAt)
  osc.stop(startAt + duration + 0.02)
}

/** 开始检测提示音：E6 → A6 上行双音 */
export function playStartBeep(): void {
  const audioCtx = getContext()
  if (!audioCtx) return
  const t = audioCtx.currentTime
  playTone(audioCtx, 1318.5, t, 0.12, 0.25)       // E6
  playTone(audioCtx, 1760.0, t + 0.13, 0.18, 0.25) // A6
}

/** 结束检测提示音：A6 → E6 下行双音 */
export function playStopBeep(): void {
  const audioCtx = getContext()
  if (!audioCtx) return
  const t = audioCtx.currentTime
  playTone(audioCtx, 1760.0, t, 0.12, 0.25)        // A6
  playTone(audioCtx, 1318.5, t + 0.13, 0.18, 0.25) // E6
}
