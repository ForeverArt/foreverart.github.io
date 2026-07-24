# Data Contracts

Canonical TypeScript definitions live in:

`web/src/platforms/figure-skating/core/`

## Core Types

| Type | Role |
|------|------|
| `PoseLandmark` | Normalized landmark (x, y, optional z, visibility) |
| `PoseFrame` | Timestamped landmark set + source adapter metadata |
| `FeatureSample` | One feature value at a time |
| `AnalysisEvent` | Discrete coaching / quality event |
| `FeatureTimeline` | Ordered samples (+ optional events) |
| `SpinSession` | Session envelope: id, schemaVersion, features summary, timeline, events |

## Schema Version

Sessions carry `schemaVersion` so future Go APIs and offline tools can evolve without silent breakage.

## Adapter Boundary

MediaPipe (or future OpenPose / other models) must map into `PoseFrame`. Downstream features/rules never import MediaPipe types.

## Backend Payload (future)

Go services accept JSON-serialized `FeatureTimeline` / `SpinSession`. Video upload is optional and out of scope for the default path.
