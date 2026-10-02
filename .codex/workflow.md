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

## Native agent settings

Each role defines `model`, `model_reasoning_effort`, `service_tier` and `features.fast_mode`
in its own native TOML. Select the actual custom agent type exposed by the runtime, not merely
a task name: naming a generic spawn does not load the role. The native file takes precedence
over inherited or explicit spawn model/effort. Luna roles use Fast; Sol roles explicitly
request Standard. Do not alter the main session's model, speed, trust or approval policy.

Before dispatch, check that the exact configured model and effort are available in the current
callable catalog. If using app-server `model/list`, collect every page until `nextCursor` is null;
read `model` and `supportedReasoningEfforts[].reasoningEffort`, not display labels or a cache.
An unavailable model/effort or runtime without native-role selection is an explicit limitation,
not permission to silently inherit, substitute a model or lower effort. Continue independent
work in the parent. User-requested changes to a role require an explicit supported configuration.

The primary project's local configuration registers the peer's agents using relative
`agents.<name>.config_file` paths. Native definitions remain in their owning checkout:
22 API and 25 web roles form one 47-role catalog. Keep the intended `fireguard-api` and
`fireguard-web` checkouts beside each other, including when using a worktree. Read the owning
repository's instructions explicitly for a secondary folder. Missing peers fail explicitly;
an isolated clone can use its local standalone agents without the peer declarations.

The parent assigns workspace, objective, exact files, authoritative contracts, relevant
observations, allowed checks and required result. Writers inherit session permissions and
coordinate overlap. Reviewers/auditors/explorers are read-only, including generated files,
caches and database preparation; ask the parent for evidence when a check would write.
Do not automatically launch additional agents, Serena processes or nested Codex challenges.

See [native agent configuration](https://learn.chatgpt.com/docs/agent-configuration/subagents)
and [role declarations](https://learn.chatgpt.com/docs/config-file/config-reference).

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

## Planning

For preparation or revision of a plan, load [fg-web-plan](../.agents/skills/fg-web-plan/SKILL.md).
It guides the principal agent in read-only source exploration and concrete validation choices.
It does not automatically delegate. Keep AI-facing procedures in `.agents` or tooling
directories, outside `docs/`; human operating and product documentation remains in its owning area.
