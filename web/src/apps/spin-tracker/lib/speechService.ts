/**
 * 语音播报服务
 * 基于 Web Speech API (SpeechSynthesis)
 * 支持中文播报，带防抖/冷却，避免重复播报
 */

export type SpeechEvent =
  | 'tracking_acquired'   // 追踪到目标
  | 'tracking_lost'       // 丢失目标
  | 'axis_stable'         // 轴心稳定
  | 'tilt_left'           // 轴心偏左
  | 'tilt_right'          // 轴心偏右
  | 'tilt_forward'        // 轴心偏前（俯仰）
  | 'tilt_backward'       // 轴心偏后（俯仰）
  | 'drift_detected'      // 漂移过大

const SPEECH_TEXTS: Record<SpeechEvent, string> = {
  tracking_acquired: '已追踪到目标',
  tracking_lost:     '目标丢失',
  axis_stable:       '轴心稳定',
  tilt_left:         '轴心偏左',
  tilt_right:        '轴心偏右',
  tilt_forward:      '轴心偏前',
  tilt_backward:     '轴心偏后',
  drift_detected:    '旋转中心漂移',
}

// 每个事件的最短播报间隔（毫秒），防止连续重复播报
const COOLDOWNS: Record<SpeechEvent, number> = {
  tracking_acquired: 3000,
  tracking_lost:     3000,
  axis_stable:       5000,
  tilt_left:         2500,
  tilt_right:        2500,
  tilt_forward:      2500,
  tilt_backward:     2500,
  drift_detected:    3000,
}

class SpeechService {
  private enabled = false
  private lastSpokenAt: Partial<Record<SpeechEvent, number>> = {}
  private voice: SpeechSynthesisVoice | null = null

  constructor() {
    // 等待语音列表加载完成后选择中文声音
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.pickVoice()
      window.speechSynthesis.onvoiceschanged = () => this.pickVoice()
    }
  }

  private pickVoice() {
    const voices = window.speechSynthesis.getVoices()
    // 优先选择中文普通话声音
    this.voice = (
      voices.find(v => v.lang === 'zh-CN' && v.localService) ??
      voices.find(v => v.lang === 'zh-CN') ??
      voices.find(v => v.lang.startsWith('zh')) ??
      null
    )
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled
    if (!enabled) {
      window.speechSynthesis?.cancel()
    }
  }

  isEnabled() {
    return this.enabled
  }

  isSupported() {
    return typeof window !== 'undefined' && 'speechSynthesis' in window
  }

  speak(event: SpeechEvent) {
    if (!this.enabled || !this.isSupported()) return

    const now = Date.now()
    const last = this.lastSpokenAt[event] ?? 0
    const cooldown = COOLDOWNS[event]

    if (now - last < cooldown) return  // 冷却中，跳过

    this.lastSpokenAt[event] = now

    const text = SPEECH_TEXTS[event]
    window.speechSynthesis.cancel()  // 打断上一条

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'zh-CN'
    utterance.rate = 1.1
    utterance.pitch = 1.0
    utterance.volume = 1.0
    if (this.voice) {
      utterance.voice = this.voice
    }

    window.speechSynthesis.speak(utterance)
  }

  // 强制重置所有冷却（用于停止检测时清空状态）
  resetCooldowns() {
    this.lastSpokenAt = {}
    window.speechSynthesis?.cancel()
  }
}

// 单例
export const speechService = new SpeechService()
