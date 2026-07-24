# Feature Lifecycle

```
Knowledge
  → Feature Definition (knowledge/features/**)
  → Feature Registry (TypeScript IDs + units)
  → Feature Extraction (pure modules)
  → Validation (Vitest / fixtures)
  → Rule mapping (scores / events)
  → Report templates (offline)
  → Realtime feedback (TTS / HUD)
```

## Rules for New Features

1. Add or update `knowledge/features/...md` first
2. Register Feature ID in `web/src/platforms/figure-skating/core/registry.ts`
3. Implement pure extraction with tests
4. Wire rules only after validation exists
5. Keep UI free of ad-hoc thresholds

## Status Values

- `active` — used in production scoring / feedback
- `experimental` — computed or documented but not scoring-critical
- `deprecated` — kept for compatibility
