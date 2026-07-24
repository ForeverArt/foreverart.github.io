# Prompt: Offline Report

## Status

Template only. Not wired into realtime pipeline.

## Purpose

训练结束后，基于 Feature Timeline / SpinSession 生成结构化报告。

## Knowledge Binding

Inject curated excerpts from `knowledge/features/spin/*`, `knowledge/biomechanics/*`, and `knowledge/isu_rules/*`. Do **not** rely on “你是花滑专家”空提示。

## Inputs

- SpinSession JSON (features, timeline summary, events)
- Athlete id: anonymous by default

## Constraints

- LLM 不重新计算 Feature
- 不得捏造 ISU Level / GOE
- 建议必须能追溯到输入 Feature 数值
