# Architecture Overview

## Positioning

ForeverArt hosts multiple **platforms**. The Figure Skating Analysis Platform is one of them; MediaPipe is only a vision adapter inside Spin Tracker.

```
ForeverArt
├── Life Tools Platform
│   └── Listening
└── Figure Skating Analysis Platform
    ├── Spin Tracker (active)
    ├── Jump Analysis (planned)
    └── Skating Analysis (planned)
```

## Knowledge-First Layers

```
knowledge/  →  Feature registry + contracts  →  features/ rules/ pipeline/  →  UI / TTS
```

Dependency direction:

1. Knowledge documents define meaning
2. TypeScript contracts / registry define executable schema
3. Feature modules compute values (pure)
4. Rule engine maps features → scores / events
5. UI and speech consume analysis frames
6. Vision adapters only produce `PoseFrame`

## Backend

- Default path: browser-only realtime analysis
- When server capabilities are required: implement in `backend/` with **Go**
- Server consumes `FeatureTimeline` / `SpinSession`, not raw video by default

See [backend/README.md](../backend/README.md).

## Extension Points

| Capability | Status | Entry |
|------------|--------|-------|
| Spin realtime | Active | `web/src/apps/spin-tracker` |
| Jump | Planned | new analyzer + `knowledge/features/jump/` |
| Skating | Planned | new analyzer + `knowledge/features/skating/` |
| Offline report | Planned | Go backend + `knowledge/prompts/` |
