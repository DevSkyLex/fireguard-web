---
name: fg-web-sonarqube
description: Triage and resolve FireGuard web SonarQube issues with evidence for fixes, false positives, and accepted findings.
---

# FireGuard web SonarQube triage

Use this skill when auditing or resolving SonarQube issues in the web repository. Read
`AGENTS.md`, `.codex/workflow.md`, the matching rules, and the owning `FEATURE.md`
before changing application code. For presentation or browser work, also load the official
`spartan` skill and the applicable FireGuard UI or accessibility skill.

## Establish the current inventory

- Identify the requested branch and Sonar project (for example,
  `fireguard-web-develop`). Record the exact analyzed Git SHA. Refresh the inventory
  after a merge; an older scan cannot validate a newer commit.
- Use the connected SonarQube MCP when available. Otherwise use the SonarQube UI or
  API available to the session. Inspect each candidate's key, rule, status, location,
  message, code context, and impact before deciding.
- Group related findings for efficient code changes, but decide **False Positive** and
  **Accepted** per issue key. Never resolve a whole rule by assumption.

## Choose a disposition

- **Fix:** the rule identifies a real defect and the change preserves the component
  contract, SSR/hydration behavior, keyboard flow, and accessible name. Add focused
  tests for behavior at risk.
- **False Positive:** demonstrate why the rule's diagnosis does not apply to the
  rendered element or guarded code path. For ARIA and native-element advice, inspect
  the actual accessibility tree and keyboard behavior in Chromium. A Spartan primitive,
  SVG child constraint, or an existing native control can explain an exception, but
  its name alone is not proof. Record the observation in the Sonar issue comment.
- **Accepted:** the finding is accurate, but a specific correction would damage a
  verified contract or invariant. Describe that tradeoff and its existing tests in the
  issue comment. A good rating, issue volume, or effort alone is insufficient.

For `Web:S6819`, check the element's content and behavior individually: a computed
result may belong in `<output>`, while a loading message, contextual advice, or a
status containing controls can have different semantics. For SVG roles, verify valid
SVG structure and the browser's accessible role and name. For TypeScript findings,
trace the reachable types and guards rather than relying only on the reported line.

Do not change rule severity, quality profiles, exclusions, or add suppressions to clear
the count. Keep the issue-key evidence in Sonar comments and the PR description rather
than a static issue ledger in the repository.

## Verify and finish

Run focused tests first. Use `fg-web-quality` for checks justified by the code change
and `fg-web-e2e` for keyboard or accessibility behavior; follow
[validation selection](../../../.codex/references/validation.md). If coverage is part
of the requested gate, measure it from the complete test run without adding exclusions.
After the exact branch commit is analyzed, recheck active issues, ratings, coverage,
and Quality Gate against the user's target. Report any finding without evidence or
scan that has not completed as unresolved.
