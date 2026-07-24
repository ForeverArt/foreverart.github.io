/// <reference types="vite/client" />

declare const __BUILD_TIME__: string

interface ImportMetaEnv {
  readonly VITE_BACKEND_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Vendor globals injected via <script> tags in index.html
interface Window {
  lamejs?: {
    Mp3Encoder: new (
      channels: number,
      sampleRate: number,
      bitRate: number,
    ) => {
      encodeBuffer(pcm: Int16Array): Uint8Array
      flush(): Uint8Array
    }
  }
  mammoth?: {
    extractRawText(input: {
      arrayBuffer: ArrayBuffer
    }): Promise<{ value: string }>
  }
}
