# Pipelines

## Pipeline A — Realtime Coach (implemented)

```
Camera
  → MediaPipe Pose Adapter
  → PoseFrame
  → Feature Extraction
  → Rule Engine
  → UI HUD + TTS
```

Goals:

- Low latency coaching cues
- No LLM on the hot path
- Latency treated as a measurable KPI; no hard 100ms guarantee without benchmarks

## Pipeline B — Offline Analyzer (defined, not implemented)

```
Video / Pose Source
  → Feature Extraction
  → FeatureTimeline + SpinSession
  → Session Store (future: Go backend or IndexedDB)
  → Curated Knowledge + LLM
  → Report
```

Goals:

- Deep attribution and coaching narrative
- Privacy-friendly: prefer Feature Timeline over video retention
- Reproducible analysis

## Shared Contract

Both pipelines should speak the same `PoseFrame` → Feature → Event language defined in `data-contracts.md`.
