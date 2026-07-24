import { useState, useCallback, useRef, useEffect } from 'react'

/**
 * MediaRecorder 管理 Hook
 * 将事件驱动的 onstop 回调桥接为 Promise 接口。
 */

export function getVideoExtension(mimeType: string): string {
  if (mimeType.includes('mp4')) return 'mp4'
  if (mimeType.includes('webm')) return 'webm'
  return 'webm'
}

function pickMimeType(): string {
  const candidates = [
    'video/mp4;codecs=h264,aac',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ]
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported?.(c)) return c
  }
  return ''
}

export function useRecording() {
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const resolveRef = useRef<((blob: Blob | null) => void) | null>(null)
  const [isRecording, setIsRecording] = useState(false)

  const isSupported = typeof window !== 'undefined' && typeof MediaRecorder !== 'undefined'

  const startRecording = useCallback((stream: MediaStream): boolean => {
    if (!isSupported) return false
    // 如有正在进行的录制，先清理
    const old = recorderRef.current
    if (old && old.state !== 'inactive') {
      old.ondataavailable = null
      old.onstop = null
      old.onerror = null
      try { old.stop() } catch { /* noop */ }
      recorderRef.current = null
      resolveRef.current = null
    }

    chunksRef.current = []
    const mimeType = pickMimeType()
    let recorder: MediaRecorder
    try {
      recorder = new MediaRecorder(stream, { ...(mimeType && { mimeType }), videoBitsPerSecond: 5_000_000 })
    } catch {
      try {
        recorder = new MediaRecorder(stream)
      } catch {
        return false
      }
    }

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'video/webm' })
      chunksRef.current = []
      recorderRef.current = null
      setIsRecording(false)
      resolveRef.current?.(blob)
      resolveRef.current = null
    }
    recorder.onerror = () => {
      chunksRef.current = []
      recorderRef.current = null
      setIsRecording(false)
      resolveRef.current?.(null)
      resolveRef.current = null
    }

    recorder.start()
    recorderRef.current = recorder
    setIsRecording(true)
    return true
  }, [isSupported])

  const stopRecording = useCallback((): Promise<Blob | null> => {
    return new Promise(resolve => {
      const r = recorderRef.current
      if (!r || r.state === 'inactive') {
        resolve(null)
        return
      }
      resolveRef.current = resolve
      r.stop()
    })
  }, [])

  useEffect(() => {
    return () => {
      const r = recorderRef.current
      if (r && r.state !== 'inactive') {
        r.ondataavailable = null
        r.onstop = null
        r.onerror = null
        try { r.stop() } catch { /* noop */ }
      }
    }
  }, [])

  return { isSupported, isRecording, startRecording, stopRecording }
}
