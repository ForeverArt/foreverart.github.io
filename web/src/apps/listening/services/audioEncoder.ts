export const SAMPLE_RATE = 22050

let audioCtx: AudioContext | undefined

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: SAMPLE_RATE,
    })
  }
  return audioCtx
}

export function silence(seconds: number): Float32Array {
  return new Float32Array(Math.max(0, Math.round(seconds * SAMPLE_RATE)))
}

export function concatFloat32Arrays(parts: Float32Array[]): Float32Array {
  const totalLen = parts.reduce((sum, p) => sum + p.length, 0)
  const out = new Float32Array(totalLen)
  let offset = 0
  for (const p of parts) {
    out.set(p, offset)
    offset += p.length
  }
  return out
}

export async function wavBlobToFloat32(wavBlob: Blob): Promise<Float32Array> {
  const buf = await wavBlob.arrayBuffer()
  const decoded = await getAudioContext().decodeAudioData(buf)
  return decoded.getChannelData(0)
}

export function float32ToWav(samples: Float32Array, sampleRate: number): Blob {
  const buf = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buf)
  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
  }
  writeStr(0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  writeStr(8, 'WAVE')
  writeStr(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeStr(36, 'data')
  view.setUint32(40, samples.length * 2, true)
  let offset = 44
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
    offset += 2
  }
  return new Blob([buf], { type: 'audio/wav' })
}

export function float32ToMp3(
  samples: Float32Array,
  sampleRate: number,
): Blob | null {
  if (!window.lamejs) return null
  const encoder = new window.lamejs.Mp3Encoder(1, sampleRate, 128)
  const pcm = new Int16Array(samples.length)
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }
  const chunks: Uint8Array[] = []
  const blockSize = 1152
  for (let i = 0; i < pcm.length; i += blockSize) {
    const chunk = encoder.encodeBuffer(pcm.subarray(i, i + blockSize))
    if (chunk.length) chunks.push(chunk)
  }
  const end = encoder.flush()
  if (end.length) chunks.push(end)
  return new Blob(chunks, { type: 'audio/mpeg' })
}

export function encodeAudio(
  samples: Float32Array,
  sampleRate: number,
): { blob: Blob; format: 'mp3' | 'wav' } {
  const mp3 = float32ToMp3(samples, sampleRate)
  if (mp3) return { blob: mp3, format: 'mp3' }
  return { blob: float32ToWav(samples, sampleRate), format: 'wav' }
}

export function formatTime(seconds: number): string {
  const s = Math.round(seconds)
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0')
}
