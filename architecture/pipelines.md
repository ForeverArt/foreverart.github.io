# Pipelines

## Pipeline A — Realtime Coach

```
Camera → MediaPipe → PoseFrame → Feature → Rule → Event → HUD / TTS
```

Realtime TTS consumes Axis / Speed / Travel events only.

## Pipeline B — Offline Upright Spin Analyzer (MVP)

```
Local mp4
  → MediaPipePoseProvider
  → PoseTimeline
  → Six Feature Engine
  → Rule Engine
  → Event Engine
  → Deterministic Report JSON
  → Go /api/v1/spin-reports
  → Curated Knowledge + LLM
  → analysis.md
```

Video never leaves the browser on the default path.
