# Data Contracts

Canonical TypeScript definitions:

`web/src/platforms/figure-skating/core/`

Schema version: **2.0.0**

## Core Types

| Type | Role |
|------|------|
| `PoseFrame` / `PoseTimeline` | Timestamped landmarks |
| `FeatureSample` / `FeatureTimeline` | Six MVP features over time |
| `RuleResult` | Deterministic grades/scores |
| `AnalysisEvent` | wobble / travel / speed_drop / … |
| `DeterministicReport` | Report Engine JSON (no LLM) |
| `SpinAnalysis` | Full local aggregate |
| `SpinReportRequest` | Go API payload (report only) |

## MVP Feature IDs

- `spin.speed`
- `spin.axis_stability`
- `spin.center_drift` (body-normalized proxy)
- `spin.com_offset_proxy` (body-normalized proxy)
- `spin.inclination`
- `spin.angular_deceleration`

## Backend Payload

Go `/api/v1/spin-reports` accepts `SpinReportRequest` only — no video, no pose frames by default.
