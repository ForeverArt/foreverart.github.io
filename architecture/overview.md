# Architecture Overview

## Positioning

```
ForeverArt
├── Life Tools Platform
│   └── Listening
└── Figure Skating Analysis Platform
    ├── Spin Tracker (realtime coach)
    ├── Upright Spin Offline Analysis (MVP)
    ├── Jump Analysis (planned)
    └── Skating Analysis (planned)
```

MediaPipe 与 LLM 均为可替换适配层。详见 [principles.md](principles.md)。

## Layers

```
knowledge/ → registry + contracts → features/ rules/ events/ report/ → UI / TTS / Go LLM
```

## Pipelines

- **A Realtime Coach**: Camera → Pose → Feature → Rule → Event → TTS（无 LLM）
- **B Offline Analyzer**: Local Video → Pose → Feature → Rule → Event → Report JSON → Go LLM → analysis.md

## Backend

Go service in `backend/` consumes deterministic Report JSON only（默认不接收视频/姿态帧）。

## Proxy Metrics

`spin.center_drift` 与 `spin.com_offset_proxy` 为身体尺度归一 proxy，见 [data-contracts.md](data-contracts.md)。
