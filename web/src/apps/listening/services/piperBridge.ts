import { seedVoiceModel } from './opfsCache'
import { wavBlobToFloat32 } from './audioEncoder'

const VENDOR_BASE = '/vendors/'
const LOCAL_WASM_PATHS = {
  onnxWasm: VENDOR_BASE,
  piperWasm: VENDOR_BASE + 'piper_phonemize.wasm',
  piperData: VENDOR_BASE + 'piper_phonemize.data',
}

interface PiperModule {
  TtsSession: {
    _instance: unknown
    create(opts: {
      voiceId: string
      wasmPaths: Record<string, string>
      progress?: (p: { loaded: number; total: number }) => void
    }): Promise<PiperSession>
  }
}

interface PiperSession {
  predict(text: string): Promise<Blob>
}

let piperModule: PiperModule | null = null
const sessions = new Map<string, PiperSession>()
let hwOverrideApplied = false

async function loadPiperModule(): Promise<PiperModule> {
  if (piperModule) return piperModule

  // Force single-threaded ONNX to avoid SharedArrayBuffer issues on static hosts
  if (!hwOverrideApplied) {
    try {
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        value: 1,
        configurable: true,
      })
    } catch {
      // not configurable — proceed with default
    }
    hwOverrideApplied = true
  }

  // @ts-expect-error — dynamic import of static vendor JS; TypeScript cannot resolve URL-path modules
  const mod = await import(/* @vite-ignore */ '/vendors/piper-tts-web/piper-tts-web.js') as any
  piperModule = mod as PiperModule
  return piperModule
}

export async function getSession(
  voiceId: string,
  onProgress?: (p: { loaded: number; total: number }) => void,
): Promise<PiperSession> {
  const cached = sessions.get(voiceId)
  if (cached) return cached

  await seedVoiceModel(voiceId)

  const piper = await loadPiperModule()
  // Reset singleton — piper-tts-web uses a singleton pattern;
  // must clear before loading a different voice
  piper.TtsSession._instance = null

  const session = await piper.TtsSession.create({
    voiceId,
    wasmPaths: LOCAL_WASM_PATHS,
    progress: onProgress,
  })
  sessions.set(voiceId, session)
  return session
}

export async function synthesize(
  text: string,
  voiceId: string,
): Promise<Float32Array> {
  const session = await getSession(voiceId)
  const wavBlob = await session.predict(text)
  return wavBlobToFloat32(wavBlob)
}
