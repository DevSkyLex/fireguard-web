# Working on FireGuard with Codex

Resolve the checkout from the assigned workspace or the loaded skill, not the shell's initial
directory. Read AGENTS.md, the matching rules in [rules.md](rules.md), and the owning FEATURE.md
including its parent for a nested feature. ARCHITECTURE.md owns architecture; DESIGN.md and
PRODUCT.md own product presentation. Operational summaries do not override these contracts.
Skills and agents need no procedures from another client.

## Tools and execution

Use tools actually exposed by the session. Prefer rg for text and available code intelligence
for symbols. Initialize an MCP only when useful; configuration is not connection evidence.
When unavailable, use local sources and official documentation and report the limitation.

Run commands from the checkout root. On Windows use PowerShell with literal quoted paths.
Start background helpers hidden, record their process IDs and stop only processes owned by
the task. Wait for dev rebuilds before browser checks. Keep task text out of executable shell
interpolation. Do not read secrets or protected environment files.

## Scope and collaboration

Follow the user's outcome and existing authorization. Clarify only missing decisions that
block useful work. A skill cannot grant permissions or override the sandbox. Explain an
approval rejection and continue unaffected work; never disable protections to get past it.

Use a specialist for a concrete independent responsibility when the task and runtime permit
delegation. [The agent catalogue](references/agents.md) states selection boundaries.
Assign files, expected behavior, allowed checks and a result format; tell the worker it shares
the checkout and must preserve other edits. Coordinate overlap before editing.
Specialists are capabilities, not a mandatory sequence or a reason to leave useful work undone.
Reviews remain read-only unless fixes are explicitly requested through an implementation role.
Do not create a sidebar task for an implementation subtask or launch nested `codex exec`.

## Agent profiles

The user-approved balanced profiles live in [agent-profiles.toml](agent-profiles.toml).
Each role selects a category and effort; native agent TOML deliberately contains no `model`
or `model_reasoning_effort`. A direct invocation inherits the current session settings.

For delegation, obtain the actual session catalogue or a real `model/list` response, normalize
it to the resolver's input shape, and pass it on stdin. Drain all `model/list` pages until
`nextCursor` is null before resolving. Use the launchable `model` field, never `id` or
`displayName`. Map `supportedReasoningEfforts[].reasoningEffort` to the string array
`supported_reasoning_efforts`; preserve each entry's actual `hidden` value. Do not infer
missing fields. Catalogue completeness is the parent's responsibility: the resolver can
validate supplied entries but cannot detect an omitted page.

```text
python -B .codex/scripts/resolve_agent.py --agent <agent-name>
stdin:  {"models":[{"model":"gpt-6-astra","hidden":false,"supported_reasoning_efforts":["high","xhigh"]}]}
stdout: {"model":"<resolved-id>","reasoning_effort":"<supported-effort>"}
```

The sample is a wire-shape example, not an available-model inventory. Never manufacture the
catalogue, probe guessed names, or reuse an old list as proof of current availability.
Resolve immediately before dispatch; the resolver itself performs no network request.

It selects the newest visible canonical numeric version in the configured category supporting
the exact effort. Numeric versions are ordered numerically; snapshots/prereleases are excluded.
An unavailable category/effort, conflicting catalogue entries or unsupported naming fails
explicitly (stderr, exit 2, no stdout). Do not silently change family or effort.

Pass the resolved ID and effort using the delegation tool's actual parameter names
(`model` and `reasoning_effort` for `spawn_agent`). Explicit overrides require
`fork_turns="none"` or a bounded history string such as `"3"`; full-history forks inherit the parent settings.
Supply the bounded task and repository constraints when history is omitted.
An explicit user override takes precedence if supported by the current catalogue.
If discovery, resolution or explicit override is unavailable, report the limit and do not
launch that role by inherited settings as a fallback. Continue independent work locally.
A user-requested direct invocation remains a separate inherited-mode choice.

## Verification and delivery

[Validation selection](references/validation.md) distinguishes application checks, browser
modes and tooling-only checks. Use `fg-web-quality` for the narrowest useful gates; specs run
through `ng test` with spec-ending globs. Verify declaration docblocks against
[rules/comments.md](rules/comments.md) for authored TypeScript.

Presentation work loads official `spartan` with `fg-web-spartan`; inspect real screenshots
when visual evidence is required. Visibility assertions alone do not establish composition.
Keep durable captures outside disposable test output. Design critique, accessibility audit and
browser execution are separate responsibilities with explicit limits.

Report behavior, changed files, actual commands/results and meaningful limits with absolute
clickable paths. Preserve unrelated changes, generated/dependency trees, third-party payloads
and the existing configuration of other clients.
