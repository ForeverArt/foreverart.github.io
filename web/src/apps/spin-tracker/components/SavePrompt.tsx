import { useMemo, useEffect } from 'react'
import { Headphones, Loader2, Save, Trash2 } from 'lucide-react'
import { cn } from '@spin/lib/utils'

interface SavePromptProps {
  videoBlob: Blob
  isSaving: boolean
  headsetSupported: boolean
  onSave: () => void
  onDiscard: () => void
}

export function SavePrompt({ videoBlob, isSaving, headsetSupported, onSave, onDiscard }: SavePromptProps) {
  const videoUrl = useMemo(() => URL.createObjectURL(videoBlob), [videoBlob])
  useEffect(() => () => URL.revokeObjectURL(videoUrl), [videoUrl])

  return (
    <div className="absolute inset-0 z-[20] flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm p-6 gap-5">
      <div className="bg-black/80 border border-white/15 rounded-2xl p-5 max-w-sm w-full space-y-4">
        <p className="text-sm font-medium text-white/80 text-center">保存录像</p>

        <video
          src={videoUrl}
          controls
          muted
 playsInline
          className="w-full rounded-lg bg-black max-h-[40vh]"
        />

        {headsetSupported && (
          <div className="flex items-center justify-center gap-1.5">
            <Headphones className="w-3.5 h-3.5 text-white/40" />
            <span className="text-xs text-white/50">单击保存 · 双击放弃</span>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onSave}
            disabled={isSaving}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-medium text-sm transition-all",
              isSaving
                ? "bg-success/50 text-white/60 cursor-not-allowed"
                : "bg-success/90 hover:bg-success text-success-foreground"
            )}
          >
            {isSaving
              ? <><Loader2 className="w-4 h-4 animate-spin" /> 保存中...</>
              : <><Save className="w-4 h-4" /> 保存</>
            }
          </button>
          <button
            onClick={onDiscard}
            disabled={isSaving}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-medium text-sm transition-all border",
              isSaving
                ? "border-destructive/20 text-destructive/40 cursor-not-allowed"
                : "border-destructive/40 text-destructive hover:bg-destructive/10"
            )}
          >
            <Trash2 className="w-4 h-4" /> 放弃
          </button>
        </div>
      </div>
    </div>
  )
}
