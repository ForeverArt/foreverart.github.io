import type { TextBlock } from '../types'

const DIALOGUE_START = /^(\d+)\s*[.、)]\s*([WMwm])\s*[:：]\s*(.*)$/
const SPEAKER_LINE = /^([WMwm])\s*[:：]\s*(.*)$/
const HAS_CJK = /[\u4e00-\u9fff]/

export function parseBlocks(text: string): TextBlock[] {
  const blocks: TextBlock[] = []
  let dia: { label: string; lines: TextBlock['lines'] } | null = null
  let pas: string[] = []

  const flushDia = () => {
    if (dia && dia.lines.length) {
      blocks.push({ kind: 'dialogue', label: dia!.label, lines: dia!.lines })
    }
    dia = null
  }

  const flushPas = () => {
    if (pas.length) {
      const joined = pas.join(' ')
      blocks.push({
        kind: 'passage',
        label: '短文  ' + joined.slice(0, 24) + '\u2026',
        lines: [{ role: 'narrator', text: joined }],
      })
    }
    pas = []
  }

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue

    let m = DIALOGUE_START.exec(line)
    if (m) {
      flushPas()
      flushDia()
      const [, num, sp, content] = m
      dia = { label: `第${num}题  ${content.slice(0, 24)}`, lines: [] }
      if (content.trim()) {
        dia.lines.push({
          role: sp.toUpperCase() === 'W' ? 'female' : 'male',
          text: content.trim(),
        })
      }
      continue
    }

    m = SPEAKER_LINE.exec(line)
    if (m && dia) {
      const sp = m[1].toUpperCase()
      const content = m[2].trim()
      if (content) {
        dia.lines.push({
          role: sp === 'W' ? 'female' : 'male',
          text: content,
        })
      }
      continue
    }

    if (HAS_CJK.test(line)) {
      flushPas()
      flushDia()
      blocks.push({
        kind: 'chinese',
        label: line,
        lines: [{ role: 'chinese', text: line }],
      })
      continue
    }

    flushDia()
    pas.push(line)
  }

  flushPas()
  flushDia()
  return blocks
}
