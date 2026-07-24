/**
 * 耳机按键控制（Media Session API）
 *
 * 蓝牙/线控耳机的按键会被系统映射为媒体事件：
 * - detect 模式: 单击(play/pause) → 开始/结束检测
 * - save 模式:   单击(play/pause) → 保存, 双击(nexttrack/previoustrack) → 放弃
 *
 * 前提条件：页面必须有正在播放的媒体，系统才会把耳机按键路由给页面。
 * 实现方式：循环播放一段程序生成的静音 WAV，保持 media session 活跃。
 */

export type HeadsetMode = 'detect' | 'save' | 'idle'

export interface HeadsetControlOptions {
  /** 请求开始检测 */
  onStart: () => void
  /** 请求结束检测 */
  onStop: () => void
  /** 请求保存录像 */
  onSave: () => void
  /** 请求放弃录像 */
  onDiscard: () => void
  /** 查询当前是否在检测中 */
  isRunning: () => boolean
  /** 查询当前耳机模式 */
  getMode: () => HeadsetMode
}

/** 程序生成 0.25s 静音 WAV（8-bit PCM mono 8kHz），返回 blob URL */
function createSilentWavUrl(): string {
  const sampleRate = 8000
  const numSamples = sampleRate / 4
  const buffer = new ArrayBuffer(44 + numSamples)
  const v = new DataView(buffer)

  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(offset + i, s.charCodeAt(i))
  }

  writeStr(0, 'RIFF')
  v.setUint32(4, 36 + numSamples, true)
  writeStr(8, 'WAVE')
  writeStr(12, 'fmt ')
  v.setUint32(16, 16, true)          // fmt chunk 大小
  v.setUint16(20, 1, true)           // PCM
  v.setUint16(22, 1, true)           // mono
  v.setUint32(24, sampleRate, true)
  v.setUint32(28, sampleRate, true)  // byte rate（8-bit mono = 采样率）
  v.setUint16(32, 1, true)           // block align
  v.setUint16(34, 8, true)           // bits per sample
  writeStr(36, 'data')
  v.setUint32(40, numSamples, true)
  // 8-bit PCM 的静音值为 128
  for (let i = 0; i < numSamples; i++) v.setUint8(44 + i, 128)

  return URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }))
}

/**
 * 注册耳机按键控制，返回清理函数。
 * 不支持的浏览器（无 mediaSession）静默降级为 no-op。
 */
export function setupHeadsetControl(options: HeadsetControlOptions): () => void {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) {
    return () => {}
  }

  const ms = navigator.mediaSession

  try {
    ms.metadata = new MediaMetadata({
      title: 'Spin Tracker 旋转检测',
      artist: '耳机单击：开始/结束检测',
      album: 'ForeverArt',
    })
  } catch {
    // MediaMetadata 不可用时忽略，不影响按键捕获
  }

  // 静音循环音频：维持 media session 活跃，确保耳机按键被路由到页面
  let keepAliveAudio: HTMLAudioElement | null = null
  const ensureKeepAlive = () => {
    if (!keepAliveAudio) {
      keepAliveAudio = new Audio(createSilentWavUrl())
      keepAliveAudio.loop = true
      keepAliveAudio.volume = 0.01
    }
    if (keepAliveAudio.paused) {
      keepAliveAudio.play().then(() => {
        ms.playbackState = 'playing'
      }).catch(() => {
        // 手势策略未满足时本次按键仍会处理，下次按键再试
      })
    } else {
      ms.playbackState = 'playing'
    }
  }

  // play: save 模式 → 保存；detect 模式且未运行 → 开始检测
  ms.setActionHandler('play', () => {
    ensureKeepAlive()
    const mode = options.getMode()
    if (mode === 'save') {
      options.onSave()
    } else if (mode === 'detect' && !options.isRunning()) {
      options.onStart()
    }
  })

  // pause: save 模式 → 保存；detect 模式且运行中 → 结束检测
  ms.setActionHandler('pause', () => {
    const mode = options.getMode()
    if (mode === 'save') {
      options.onSave()
    } else if (mode === 'detect' && options.isRunning()) {
      options.onStop()
    } else {
      ensureKeepAlive()
    }
  })

  // 双击（nexttrack/previoustrack）: save 模式 → 放弃
  ms.setActionHandler('nexttrack', () => {
    if (options.getMode() === 'save') options.onDiscard()
  })

  ms.setActionHandler('previoustrack', () => {
    if (options.getMode() === 'save') options.onDiscard()
  })

  // 页面内的首次手势（如点击"开始检测"）也启动静音音频
  const unlock = () => ensureKeepAlive()
  window.addEventListener('click', unlock, { once: true })
  window.addEventListener('touchstart', unlock, { once: true })

  return () => {
    ms.setActionHandler('play', null)
    ms.setActionHandler('pause', null)
    ms.setActionHandler('nexttrack', null)
    ms.setActionHandler('previoustrack', null)
    ms.playbackState = 'none'
    window.removeEventListener('click', unlock)
    window.removeEventListener('touchstart', unlock)
    if (keepAliveAudio) {
      keepAliveAudio.pause()
      if (keepAliveAudio.src.startsWith('blob:')) {
        URL.revokeObjectURL(keepAliveAudio.src)
      }
      keepAliveAudio = null
    }
  }
}
