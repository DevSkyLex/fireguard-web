---
description: Create a pure helper as utils/<name>/<name>.utils.ts plus its testing/ spec — arbitrating first between utils/, constants/ and options/, then placing it at the lowest scope covering all consumers.
argument-hint: '<name> [scope] — e.g. "format-duration" or "map-facility for the organization feature"'
---

Delegate to the **fg-utils-builder** subagent: $ARGUMENTS

The agent carries the folder arbitration (§10.13), the scope rule (§2.8), and the rule of three (§2.9); do not restate them. Recommending **inlining instead of extracting** is a valid, useful outcome.

Require its report to state the **folder and scope decision with the rule that drove it**, the rule-of-three verdict (the three real call sites, or the recommendation to inline), the files created, and the format/lint/test/build results.
