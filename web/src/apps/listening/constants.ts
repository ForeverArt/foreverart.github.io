import type { VoiceAssignment, BlockKind } from './types'

export const OFFLINE_VOICES: Record<string, string> = {
  'en_US-hfc_female-medium': 'en/en_US/hfc_female/medium/en_US-hfc_female-medium.onnx',
  'en_US-hfc_male-medium': 'en/en_US/hfc_male/medium/en_US-hfc_male-medium.onnx',
  'zh_CN-huayan-medium': 'zh/zh_CN/huayan/medium/zh_CN-huayan-medium.onnx',
}

export const VOICE_LABEL: Record<string, string> = {
  'en_US-hfc_female-medium': '英文女声 · hfc_female',
  'en_US-hfc_male-medium': '英文男声 · hfc_male',
  'zh_CN-huayan-medium': '中文 · huayan',
}

export const DEFAULT_VOICES: VoiceAssignment = {
  female: 'en_US-hfc_female-medium',
  male: 'en_US-hfc_male-medium',
  narrator: 'en_US-hfc_female-medium',
  chinese: 'zh_CN-huayan-medium',
}

export const DEFAULT_PAUSES = {
  sentencePause: 3,
  repeatPause: 2,
  passagePause: 30,
  repeatCount: 2,
}

export const KIND_DEFAULTS: Record<
  BlockKind,
  { repeat: number; sentence: number; between: number; after: number }
> = {
  chinese: { repeat: 1, sentence: 0.5, between: 0, after: 1.0 },
  dialogue: { repeat: 2, sentence: 3.0, between: 2.0, after: 3.0 },
  passage: { repeat: 2, sentence: 0, between: 2.0, after: 30.0 },
}

export const SAMPLE_TEXT = `2025-2026学年度第二学期期末练习卷
八年级英语听力材料
（八年级英语听力测试现在开始，请同学们做好准备。）
一、听力（共15小题，每小题1分，满分15分）
A) 听对话，选图片
1. W: Many people around the world need help, Daniel.
  M: Yes, I have helped an elderly man in my community.
2. W: What does your mom do?
  M: She works for WWF. Her job is to protect wild animals.
C) 听短文，回答问题。
There's a big food chain in nature. It plays an important role in balancing the whole natural world. We should protect the animals and plants. Protecting them is protecting ourselves.
（听力部分到此结束，请同学们继续答题。）`
