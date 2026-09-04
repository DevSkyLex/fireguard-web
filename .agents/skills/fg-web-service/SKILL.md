---
name: fg-web-service
description: 'Build or change FireGuard transport services, behavioral services, access helpers or pure data adapters under the owning feature.'
---

# fg-web-service

Locate the repository from this skill: its root is three directories above this folder.
Read `AGENTS.md`, the applicable entries in `.codex/rules.md`, and the owning `FEATURE.md`
(including its parent for nested features). `ARCHITECTURE.md` remains normative.
Run commands from the repository root. Use the tools actually exposed by the Codex session;
see `.codex/workflow.md` for shell, MCP, delegation and validation conventions.

Choose the kind first: transport → `data-access/services/<concern>/`; behavior →
`services/<concern>/`; access decision → `access/services/<concern>/`; normalization →
pure functions in `data-access/adapters/`. Read `.codex/references/naming.md`.

For transport work read [the Hydra contract](references/hydra.md) and inspect a current
service plus its test. Extend `HydraApiService`, use the project's `@Service` registration,
and return transport types. Preserve error propagation to the store and do not create
manual HttpParams/HttpHeaders outside the infrastructure helpers.

Use adapters for repeated normalization of loose wire data; keep presentation derivation
with the store/UI that owns it. Publish only stable service contracts through the approved
barrel. Cover request verb, URL, payload, mapping and error propagation at the correct boundary.
Use `fg-web-test` for HttpTestingController; record public API changes in FEATURE.md.
