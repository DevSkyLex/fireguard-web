---
description: Create an Angular pipe at shared/<concept>/ui/pipes/<name>/ — the repo has zero pipes today, so this sets the precedent and must update ARCHITECTURE.md §9.2 in the same change.
argument-hint: '<name> — e.g. "duration-format"'
---

Delegate to the **fg-pipe-builder** subagent: $ARGUMENTS

The agent carries the "is a pipe even right?" gates and the precedent-recording duty; do not restate them. Recommending a `computed()` or a `utils/` function instead of building the pipe is a **valid, useful outcome**.

Require its report to state **whether a pipe was the right tool** and why (or the alternative it recommended), the files created, **the exact `ARCHITECTURE.md` sections it edited** (a pipe shipped without them is a defect by §14.3), and the format/lint/test/build results.
