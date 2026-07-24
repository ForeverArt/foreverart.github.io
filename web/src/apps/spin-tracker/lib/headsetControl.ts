/**
 * 耳机按键控制（Media Session API）
 *
 * 蓝牙/线控耳机的单击按键会被系统映射为媒体播放/暂停事件，
 * 通过 navigator.mediaSession.setActionHandler 捕获：
 * - play  → 开始检测
 * - pause → 结束检测
 *
 * 前提条件：页面必须有正在播放的媒体，系统才会把耳机按键路由给页面。
 * 实现方式：循环播放一段程序生成的静音 WAV，保持 media session 活跃。
 *
 * 浏览器自动播放策略要求首次播放发生在用户手势内；
 * 耳机按键事件本身即用户手势，故在 handler 中兜底启动静音音频。
 */

export interface HeadsetControlOptions {
  /** 请求开始检测 */
  onStart: () => void
  /** 请求结束检测 */
  onStop: () => void
  /** 查询当前是否在检测中（决定 play/pause 哪个生效） */
  isRunning: () => boolean
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

  ms.setActionHandler('play', () => {
    ensureKeepAlive()
    if (!options.isRunning()) options.onStart()
  })

  ms.setActionHandler('pause', () => {
    if (options.isRunning()) {
      options.onStop()
    } else {
      // 未在检测时收到 pause：保持静音播放以维持按键通道
      ensureKeepAlive()
    }
  })

  // 页面内的首次手势（如点击"开始检测"）也启动静音音频
  const unlock = () => ensureKeepAlive()
  window.addEventListener('click', unlock, { once: true })
  window.addEventListener('touchstart', unlock, { once: true })

  return () => {
    ms.setActionHandler('play', null)
    ms.setActionHandler('pause', null)
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
