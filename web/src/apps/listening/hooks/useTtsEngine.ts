import { useState, useCallback } from 'react'
import type {
  VoiceAssignment,
  PauseConfig,
  SynthState,
  TimelineEntry,
} from '../types'
import { DEFAULT_VOICES, DEFAULT_PAUSES, SAMPLE_TEXT, KIND_DEFAULTS } from '../constants'
import { parseBlocks } from '../services/textParser'
import {
  SAMPLE_RATE,
  silence,
  concatFloat32Arrays,
  encodeAudio,
  formatTime,
} from '../services/audioEncoder'
import { getSession, synthesize } from '../services/piperBridge'

const INITIAL_SYNTH: SynthState = {
  phase: 'idle',
  progress: 0,
  statusMessage: '就绪。',
  audioUrl: null,
  audioFormat: null,
  timeline: [],
  error: null,
}

export function useTtsEngine() {
  const [text, setText] = useState('')
  const [voices, setVoices] = useState<VoiceAssignment>(DEFAULT_VOICES)
  const [pauses, setPauses] = useState<PauseConfig>({
    sentencePause: DEFAULT_PAUSES.sentencePause,
    repeatPause: DEFAULT_PAUSES.repeatPause,
    passagePause: DEFAULT_PAUSES.passagePause,
    repeatCount: DEFAULT_PAUSES.repeatCount,
  })
  const [synth, setSynth] = useState<SynthState>(INITIAL_SYNTH)

  const setVoice = useCallback(
    (role: keyof VoiceAssignment, voiceId: string) => {
      setVoices((prev) => ({ ...prev, [role]: voiceId }))
    },
    [],
  )

  const setPause = useCallback(
    (key: keyof PauseConfig, value: number) => {
      setPauses((prev) => ({ ...prev, [key]: value }))
    },
    [],
  )

  const loadSampleText = useCallback(() => {
    setText(SAMPLE_TEXT)
  }, [])

  const uploadFile = useCallback(async (file: File) => {
    if (file.name.toLowerCase().endsWith('.docx')) {
      if (!window.mammoth) {
        setSynth((s) => ({
          ...s,
          phase: 'error',
          statusMessage: 'mammoth 未加载，无法解析 .docx，请直接粘贴。',
          error: 'mammoth 未加载',
        }))
        return
      }
      const { value } = await window.mammoth.extractRawText({
        arrayBuffer: await file.arrayBuffer(),
      })
      setText(value)
    } else {
      setText(await file.text())
    }
    setSynth((s) => ({ ...s, statusMessage: `已载入 ${file.name}` }))
  }, [])

  const generate = useCallback(async () => {
    const blocks = parseBlocks(text)
    if (!blocks.length) {
      setSynth({
        phase: 'error',
        progress: 0,
        statusMessage: '没有解析到可朗读内容。',
        audioUrl: null,
        audioFormat: null,
        timeline: [],
        error: 'empty',
      })
      return
    }

    setSynth({
      phase: 'loading-engine',
      progress: 0,
      statusMessage: '准备中…',
      audioUrl: null,
      audioFormat: null,
      timeline: [],
      error: null,
    })

    const voiceIds = [
      ...new Set(blocks.flatMap((b) => b.lines.map((l) => voices[l.role]))),
    ]

    // Load all voice models
    for (let k = 0; k < voiceIds.length; k++) {
      const id = voiceIds[k]
      setSynth((s) => ({
        ...s,
        phase: 'loading-voice',
        statusMessage: `准备中 ${k + 1}/${voiceIds.length} · 正在加载音色「${id}」…`,
      }))
      await getSession(id, (p) => {
        if (p && p.total) {
          setSynth((s) => ({
            ...s,
            progress: (p.loaded / p.total) * 100,
            statusMessage: `加载音色 ${k + 1}/${voiceIds.length}：${id}（${Math.round((p.loaded * 100) / p.total)}%）`,
          }))
        }
      })
    }

    // Synthesize
    const repeatCount = Math.max(1, pauses.repeatCount)
    const total = blocks.reduce(
      (sum, b) => sum + b.lines.length * (b.kind === 'chinese' ? 1 : repeatCount),
      0,
    )
    let done = 0
    const parts: Float32Array[] = []
    const timeline: TimelineEntry[] = []
    let cursor = 0

    setSynth((s) => ({
      ...s,
      phase: 'synthesizing',
      statusMessage: '引擎就绪，开始合成…',
    }))

    for (const block of blocks) {
      const reps = block.kind === 'chinese' ? 1 : repeatCount
      const kindDefaults = KIND_DEFAULTS[block.kind]
      const sentPause = block.kind === 'dialogue' ? pauses.sentencePause : kindDefaults.sentence
      const betweenPause = block.kind === 'chinese' ? 0 : pauses.repeatPause
      const afterPause =
        block.kind === 'passage'
          ? pauses.passagePause
          : block.kind === 'dialogue'
            ? pauses.sentencePause
            : kindDefaults.after

      timeline.push({ kind: 'header', label: block.label })

      for (let r = 0; r < reps; r++) {
        for (let i = 0; i < block.lines.length; i++) {
          const line = block.lines[i]
          timeline.push({
            kind: 'line',
            timestamp: cursor / SAMPLE_RATE,
            role: line.role,
            text: line.text,
            rep: r + 1,
            totalReps: reps,
          })

          setSynth((s) => ({
            ...s,
            statusMessage: `合成中 ${done + 1}/${total}：${block.label.slice(0, 28)}`,
          }))

          const samples = await synthesize(line.text, voices[line.role])
          parts.push(samples)
          cursor += samples.length
          done++
          setSynth((s) => ({ ...s, progress: (done / total) * 100 }))

          if (sentPause > 0 && i < block.lines.length - 1) {
            const s = silence(sentPause)
            parts.push(s)
            cursor += s.length
          }
        }
        if (r < reps - 1 && betweenPause > 0) {
          const s = silence(betweenPause)
          parts.push(s)
          cursor += s.length
        }
      }

      if (afterPause > 0) {
        const s = silence(afterPause)
        parts.push(s)
        cursor += s.length
      }
    }

    // Encode
    setSynth((s) => ({
      ...s,
      phase: 'encoding',
      statusMessage: `合成完成，正在打包…`,
    }))

    const all = concatFloat32Arrays(parts)
    const { blob, format } = encodeAudio(all, SAMPLE_RATE)
    const audioUrl = URL.createObjectURL(blob)
    const durationStr = formatTime(all.length / SAMPLE_RATE)

    setSynth({
      phase: 'done',
      progress: 100,
      statusMessage: `完成 ✓ 总时长约 ${durationStr}（${blocks.length} 段，${format.toUpperCase()}）`,
      audioUrl,
      audioFormat: format,
      timeline,
      error: null,
    })
  }, [text, voices, pauses])

  return {
    text,
    setText,
    voices,
    setVoice,
    pauses,
    setPause,
    synth,
    loadSampleText,
    uploadFile,
    generate,
  }
}
