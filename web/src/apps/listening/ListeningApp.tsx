import { Badge } from '@/components/ui/badge'
import { useTtsEngine } from './hooks/useTtsEngine'
import { TextInputCard } from './components/TextInputCard'
import { VoiceConfigCard } from './components/VoiceConfigCard'
import { SynthesisCard } from './components/SynthesisCard'

export default function ListeningApp() {
  const {
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
  } = useTtsEngine()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            听力材料朗读器
          </h1>
          <Badge variant="secondary">纯浏览器 · 零后端 · 零配额</Badge>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          在本地用 WebAssembly 神经语音（Piper）合成。引擎与全部音色模型已打包在本地，100% 离线、零外网、零后端。
        </p>
      </div>

      {/* Cards */}
      <TextInputCard
        text={text}
        onTextChange={setText}
        onLoadSample={loadSampleText}
        onUploadFile={uploadFile}
      />

      <VoiceConfigCard
        voices={voices}
        onVoiceChange={setVoice}
        pauses={pauses}
        onPauseChange={setPause}
      />

      <SynthesisCard synth={synth} onGenerate={generate} />
    </div>
  )
}
