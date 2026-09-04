---
name: fg-web-feature
description: 'Scaffold or extend FireGuard feature ownership, routing, public APIs, guards, providers and normative FEATURE.md documentation.'
---

# fg-web-feature

Locate the repository from this skill: its root is three directories above this folder.
Read `AGENTS.md`, the applicable entries in `.codex/rules.md`, and the owning `FEATURE.md`
(including its parent for nested features). `ARCHITECTURE.md` remains normative.
Run commands from the repository root. Use the tools actually exposed by the Codex session;
see `.codex/workflow.md` for shell, MCP, delegation and validation conventions.

Read architecture §8.3/§8.4 and [feature documentation](references/feature-docs.md).
Choose the strongest business owner before introducing folders. Create only concerns the
slice needs: UI, state, transport, models, services, access, setup, navigation, http or ports.
App routing selects layouts; the feature owns its route subtree. Layouts compose feature
widgets through public APIs and never take over business workflows.

Use current public barrels and documented cross-feature dependencies. A port belongs to its
owner and is justified by a real boundary; bind with `useExisting` when appropriate.
Route-critical resolvers must seed their owning store or own a small explicit TransferState
handoff. Load hidden tabs, pickers and secondary data on browser demand.

Update parent/nested FEATURE.md in the same change when routes, public APIs, dependencies or
invariants change. Use `fg-web-service`, `fg-web-store` and `fg-web-component` for their technical
details as needed. These are available local procedures, not compulsory subagent handoffs.
Validate the changed routing/data boundaries and report the resulting user behavior.
