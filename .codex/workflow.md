# Working on FireGuard with Codex

AGENTS.md and ARCHITECTURE.md define ownership and invariants. Read the relevant FEATURE.md,
including its parent for a nested feature. Skills live in `.agents/skills/`; custom subagent
roles live in `.codex/agents/`. None requires a Claude installation or reads its procedures.

## Tools and execution

Use the tools exposed by the current session. Prefer rg for text and available code
intelligence for symbols. Initialize an MCP only when needed; a config entry is not evidence
of a live connection. If unavailable, use local sources and official documentation and report
the fallback. Do not hard-code tool namespaces or invoke a nonexistent Skill/Read/Bash API.

Run project commands from the checkout root. On Windows use PowerShell and quoted literal
paths. Start background helpers with hidden windows, record their process IDs and stop only
those you own. Avoid simultaneous writes to the same files and wait for dev rebuilds before
browser checks. Treat task text as data, never interpolate it into executable shell text.

## Scope and collaboration

Follow the user's requested outcome and existing authorization. Clarify only missing decisions
that block useful work; do not create repeated approval loops. A skill cannot grant permission
or override the sandbox. Do not change trust settings or disable guards to make an action pass.
When an approval review rejects an action, explain the reason and continue unaffected work.

Work locally by default. Use subagents when requested or authorized by the current task and
runtime, for concrete independent responsibilities. Assign file ownership and preserve other
workers' changes. Reviews are read-only unless fixes are requested. Do not create a separate
sidebar task as an implementation subtask. No automatic nested `codex exec` challenge, forced
model choice or recursive second opinion.

## Verification

Before delivering authored TypeScript changes, verify the structured doc blocks in
`rules/comments.md`: match the application's declaration headings and tags, even
when the description is short or the code is moved into `shared`.

Use `fg-web-quality` for the narrowest relevant checks. Unit tests go through ng test with
spec-ending globs. UI review includes actual desktop/mobile screenshot inspection when
applicable; tests reporting visible elements alone do not prove good composition. Keep
captures separately from test output folders that may be cleaned. For tooling-only work,
validate hooks, TOML, skill discovery and resources instead of rebuilding the application.

Report the result, actual checks and meaningful limits. Use clickable absolute file paths.
Keep unrelated changes, secret files, generated dependencies and the existing Claude setup intact.
