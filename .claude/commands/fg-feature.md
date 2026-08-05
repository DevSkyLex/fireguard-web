---
description: Scaffold or extend a feature — route tree, data-access, state slice, type-only models, ui/ surfaces, and the required FEATURE.md — per ARCHITECTURE.md §8.3/§8.4.
argument-hint: '<name> [--nested-in <parent>] — e.g. "reporting" or "audit --nested-in organization"'
---

Delegate to the **fg-feature-builder** subagent: $ARGUMENTS

Require it to:

1. Read §8.3 / §8.4 and the touched `FEATURE.md` — **parent and nested** — then mirror the closest sibling (`features/organization/` for a complete one, `features/organization/features/facilities/` for a minimal nested one).
2. Nest **only when both** the URL hierarchy and the ownership hierarchy nest. A nested feature used as a grouping device is an explicit bad case in §8.4.
3. Emit **only the concerns the slice needs.** Everything is optional except `FEATURE.md` and the route file — §8.3: _"Empty architectural buckets are noise."_ Report which concerns it deliberately skipped.
4. Wire the route tree into the correct parent, **inside the parent's existing guard and resolver chain** — grep the parent routes and match it rather than inventing a guard stack.
5. Create a feature root barrel **only if something outside actually imports it**, and export only that (§13.3). Four sibling features correctly have none.
6. Write a short `FEATURE.md` with the canonical headings, including an explicit "Public API: none" with the reason when that is the case.
7. Run `npm run format && npm run lint && npm run build`.

It emits **skeletons**. Complex state → **fg-signal-store**, the real transport service → **fg-service-builder**, populated UI → **fg-spartan-ui** / **fg-component-builder**, specs → **fg-web-test-writer**. Require it to name each handoff.
