---
description: Scaffold or extend a feature — route tree, data-access, state slice, type-only models, ui/ surfaces, and the required FEATURE.md — per ARCHITECTURE.md §8.3/§8.4.
argument-hint: '<name> [--nested-in <parent>] — e.g. "reporting" or "audit --nested-in organization"'
---

Delegate to the **fg-web-feature-builder** subagent: $ARGUMENTS

The agent carries the scaffolding rules (mirror the closest sibling, emit only needed concerns, nest only when URL and ownership both nest); do not restate them.

It emits **skeletons**. Complex state → **fg-web-signal-store**, the real transport service → **fg-web-service-builder**, populated UI → **fg-web-spartan-ui** / **fg-web-component-builder**, specs → **fg-web-web-test-writer**.

Require its report to list the concerns emitted **and the ones deliberately skipped**, the routing wiring, the `FEATURE.md` it wrote or updated, each named handoff, and the format/lint/build results.
