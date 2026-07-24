export interface TextLine {
  role: 'female' | 'male' | 'narrator' | 'chinese'
  text: string
}

export type BlockKind = 'dialogue' | 'passage' | 'chinese'

export interface TextBlock {
  kind: BlockKind
  label: string
  lines: TextLine[]
}

export type TimelineHeader = { kind: 'header'; label: string }
export type TimelineLine = {
  kind: 'line'
  timestamp: number
  role: string
  text: string
  rep: number
  totalReps: number
}
export type TimelineEntry = TimelineHeader | TimelineLine

export interface VoiceAssignment {
  female: string
  male: string
  narrator: string
  chinese: string
}

export interface PauseConfig {
  sentencePause: number
  repeatPause: number
  passagePause: number
  repeatCount: number
}

export type SynthPhase =
  | 'idle'
  | 'loading-engine'
  | 'loading-voice'
  | 'synthesizing'
  | 'encoding'
  | 'done'
  | 'error'

export interface SynthState {
  phase: SynthPhase
  progress: number
  statusMessage: string
  audioUrl: string | null
  audioFormat: 'mp3' | 'wav' | null
  timeline: TimelineEntry[]
  error: string | null
}
