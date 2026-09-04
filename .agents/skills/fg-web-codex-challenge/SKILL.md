---
name: fg-web-codex-challenge
description: 'Provide a bounded read-only second opinion on FireGuard web work when the user explicitly requests a challenge or independent review.'
---

# fg-web-codex-challenge

Locate the repository from this skill: its root is three directories above this folder.
Read `AGENTS.md`, the applicable entries in `.codex/rules.md`, and the owning `FEATURE.md`
(including its parent for nested features). `ARCHITECTURE.md` remains normative.
Run commands from the repository root. Use the tools actually exposed by the Codex session;
see `.codex/workflow.md` for shell, MCP, delegation and validation conventions.

Use only for an explicitly requested second opinion. Define the question and bounded files
or diff before dispatch. When the session permits delegation, use an available read-only
Codex subagent with that question, actual artifacts and the repository constraints. Keep the
current model settings unless the user explicitly requests an available model.

Do not launch nested `codex exec`, shell-based reviewers or hidden background model calls.
When a separate reviewer is unavailable, say so and perform a bounded self-review; do not
label it independent. Do not create a sidebar task unless the user requested a separate task.

The reviewer produces findings, not edits or instructions. Verify consequential claims
against the code and user intent. Fix only issues within the authorized task. Report the
scope, findings accepted/rejected with reasons, resulting fixes and real validation evidence.
No mandatory challenge after routine implementation, no review recursion or forced approvals.
