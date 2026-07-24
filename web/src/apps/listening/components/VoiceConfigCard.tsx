import { SlidersHorizontal } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import type { VoiceAssignment, PauseConfig } from '../types'
import { OFFLINE_VOICES, VOICE_LABEL } from '../constants'

interface VoiceConfigCardProps {
  voices: VoiceAssignment
  onVoiceChange: (role: keyof VoiceAssignment, voiceId: string) => void
  pauses: PauseConfig
  onPauseChange: (key: keyof PauseConfig, value: number) => void
}

const selectClass =
  'w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring'

const inputClass =
  'w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring'

function VoiceOptions({ prefix }: { prefix: string }) {
  return Object.keys(OFFLINE_VOICES)
    .filter((id) => id.startsWith(prefix))
    .map((id) => (
      <option key={id} value={id}>
        {VOICE_LABEL[id] || id}
      </option>
    ))
}

export function VoiceConfigCard({
  voices,
  onVoiceChange,
  pauses,
  onPauseChange,
}: VoiceConfigCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SlidersHorizontal size={16} />
          ② 音色与节奏
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Voice selects */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">W（英文女声）</label>
            <select
              className={selectClass}
              value={voices.female}
              onChange={(e) => onVoiceChange('female', e.target.value)}
            >
              <VoiceOptions prefix="en" />
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">M（英文男声）</label>
            <select
              className={selectClass}
              value={voices.male}
              onChange={(e) => onVoiceChange('male', e.target.value)}
            >
              <VoiceOptions prefix="en" />
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">中文提示</label>
            <select
              className={selectClass}
              value={voices.chinese}
              onChange={(e) => onVoiceChange('chinese', e.target.value)}
            >
              <VoiceOptions prefix="zh" />
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">短文旁白</label>
            <select
              className={selectClass}
              value={voices.narrator}
              onChange={(e) => onVoiceChange('narrator', e.target.value)}
            >
              <VoiceOptions prefix="en" />
            </select>
          </div>
        </div>

        {/* Pause inputs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">句间停顿（秒）</label>
            <input
              type="number"
              className={inputClass}
              value={pauses.sentencePause}
              min={0}
              step={0.5}
              onChange={(e) =>
                onPauseChange('sentencePause', parseFloat(e.target.value) || 0)
              }
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">两遍之间（秒）</label>
            <input
              type="number"
              className={inputClass}
              value={pauses.repeatPause}
              min={0}
              step={0.5}
              onChange={(e) =>
                onPauseChange('repeatPause', parseFloat(e.target.value) || 0)
              }
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">短文后停顿（秒）</label>
            <input
              type="number"
              className={inputClass}
              value={pauses.passagePause}
              min={0}
              step={1}
              onChange={(e) =>
                onPauseChange('passagePause', parseFloat(e.target.value) || 0)
              }
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">英文朗读遍数</label>
            <input
              type="number"
              className={inputClass}
              value={pauses.repeatCount}
              min={1}
              max={3}
              step={1}
              onChange={(e) =>
                onPauseChange('repeatCount', parseInt(e.target.value) || 2)
              }
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
