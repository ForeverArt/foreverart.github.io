import { Loader2, Download, Play } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import type { SynthState } from '../types'
import { TimelineTable } from './TimelineTable'

interface SynthesisCardProps {
  synth: SynthState
  onGenerate: () => void
}

const isBusy = (phase: SynthState['phase']) =>
  phase === 'loading-engine' ||
  phase === 'loading-voice' ||
  phase === 'synthesizing' ||
  phase === 'encoding'

export function SynthesisCard({ synth, onGenerate }: SynthesisCardProps) {
  const busy = isBusy(synth.phase)
  const hasLamejs = typeof window !== 'undefined' && !!window.lamejs

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Play size={16} />
            ③ 生成
          </CardTitle>
          <Badge variant="secondary">
            {hasLamejs ? 'MP3' : 'WAV'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Go button */}
        <div className="flex items-center gap-3">
          <Button
            variant="default"
            disabled={busy}
            onClick={onGenerate}
            className="bg-sky-600 hover:bg-sky-500 text-white"
          >
            {busy ? (
              <>
                <Loader2 size={14} className="mr-1.5 animate-spin" />
                合成中…
              </>
            ) : (
              '开始合成'
            )}
          </Button>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <Progress value={synth.progress} colorClass="bg-sky-500" />
          <div className="flex items-center text-xs text-muted-foreground min-h-[1.25rem]">
            {busy && (
              <Loader2 size={12} className="mr-1.5 animate-spin text-sky-400" />
            )}
            <span>{synth.statusMessage}</span>
          </div>
        </div>

        {/* Audio player */}
        {synth.audioUrl && (
          <audio controls src={synth.audioUrl} className="w-full" />
        )}

        {/* Download buttons */}
        {synth.phase === 'done' && synth.audioUrl && (
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={synth.audioUrl}
              download={`output.${synth.audioFormat}`}
              className="inline-flex"
            >
              <Button variant="success" size="sm">
                <Download size={14} className="mr-1.5" />
                下载 output.{synth.audioFormat}
              </Button>
            </a>
            <a
              href={buildTimelineTextUrl(synth, synth.audioFormat!)}
              download="时间对照表.txt"
              className="inline-flex"
            >
              <Button variant="outline" size="sm">
                <Download size={14} className="mr-1.5" />
                下载时间对照表
              </Button>
            </a>
          </div>
        )}

        {/* Error display */}
        {synth.phase === 'error' && synth.error && (
          <p className="text-xs text-destructive">{synth.statusMessage}</p>
        )}

        {/* Timeline table */}
        <TimelineTable timeline={synth.timeline} />
      </CardContent>
    </Card>
  )
}

function buildTimelineTextUrl(
  synth: SynthState,
  format: string,
): string {
  const { timeline } = synth
  const lines: string[] = []
  const repeatCount =
    timeline.filter((e) => e.kind === 'line').length > 0
      ? Math.max(...timeline.filter((e) => e.kind === 'line').map((e) => (e as any).totalReps))
      : 2
  lines.push(`output.${format} 逐句时间对照表`)
  lines.push(`（英文读 ${repeatCount} 遍）`)
  if (synth.statusMessage.includes('总时长')) {
    const m = synth.statusMessage.match(/总时长约 (.+?)（/)
    if (m) lines.push(`总时长约 ${m[1]}`)
  }
  lines.push('')

  for (const entry of timeline) {
    if (entry.kind === 'header') {
      lines.push(`[${entry.label}]`)
    } else {
      const roleMap: Record<string, string> = {
        female: 'W',
        male: 'M',
        chinese: '中文',
        narrator: '短文',
      }
      const role = roleMap[entry.role] || entry.role
      const mark = entry.totalReps > 1 ? ` (第${entry.rep}遍)` : ''
      const time = formatTimeLocal(entry.timestamp)
      lines.push(`${time}\t${role}${mark}\t${entry.text}`)
    }
  }

  return URL.createObjectURL(
    new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' }),
  )
}

function formatTimeLocal(sec: number): string {
  const s = Math.round(sec)
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0')
}
