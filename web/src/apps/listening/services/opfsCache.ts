import { OFFLINE_VOICES } from '../constants'

const VENDOR_BASE = '/vendors/'

export async function seedVoiceModel(voiceId: string): Promise<void> {
  const rel = OFFLINE_VOICES[voiceId]
  if (!rel) throw new Error(`未离线打包的音色：${voiceId}`)

  const leaf = rel.split('/').pop()!

  if (!navigator.storage?.getDirectory) {
    // OPFS not available — fall back to direct fetch (models will be fetched each time)
    return
  }

  const root = await navigator.storage.getDirectory()
  const dir = await root.getDirectoryHandle('piper', { create: true })

  for (const name of [leaf, leaf + '.json']) {
    const localUrl = VENDOR_BASE + 'piper/' + name

    let wantSize = 0
    try {
      const head = await fetch(localUrl, { method: 'HEAD' })
      wantSize = +(head.headers.get('Content-Length') || 0)
    } catch {
      // ignore
    }

    try {
      const fh = await dir.getFileHandle(name)
      const file = await fh.getFile()
      if (file.size > 0 && (wantSize === 0 || file.size === wantSize)) {
        continue // already cached correctly
      }
    } catch {
      // not cached yet
    }

    const resp = await fetch(localUrl)
    if (!resp.ok) {
      throw new Error(`缺少本地模型 vendors/piper/${name}（请重新下载）`)
    }
    const blob = await resp.blob()
    const fh = await dir.getFileHandle(name, { create: true })
    const writable = await fh.createWritable()
    await writable.write(blob)
    await writable.close()
  }
}
