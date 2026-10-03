---
name: fg-web-plan
description: 'Prepare or revise an implementation-ready FireGuard web plan when the user asks to plan a change, clarify implementation decisions, or review an existing plan. Read-only; guides the principal agent without automatic delegation.'
---

# fg-web-plan

Resolve the checkout from this skill (three directories above this folder). Read AGENTS.md,
.codex/workflow.md and the matching .codex/rules.md entries. This workflow is read-only:
inspect sources and existing evidence; do not edit files, generate contracts, install packages,
prepare databases, run checks that write caches, or implement the proposal. Describe the
checks that implementation will need. Do not create a dedicated planning agent or launch
sub-agents automatically. Explicit user authorization governs any separate delegation.

## Ground the decisions

Start from the requested result and prior decisions. Inspect enough of the current implementation
to identify the owner, closest supported pattern and affected contracts. Distinguish verified
behavior, proposed changes, assumptions and unavailable evidence. Cite concrete repository
sources; do not invent existing behavior from a diagram or a previous plan.

Clarify decisions that materially change scope, privacy, security or public behavior and cannot
be inferred from the request. Continue independent read-only exploration while waiting.
Resolve routine implementation choices using repository patterns and the user's constraints.
Make important alternatives and tradeoffs concrete, then name the selected option. An unanswered
required choice remains open; elapsed time is not approval.

## Respect the owning contracts

Read ARCHITECTURE.md, DESIGN.md, PRODUCT.md and the owning FEATURE.md including its parent.
Trace the actual route/page, public feature contract, presentational inputs/outputs, state,
services and backend transport. Use package.json for versions and commands. Respect feature
ownership and public entry points; do not introduce sibling internals or a second source of
truth. Compare API assumptions with verified backend evidence when the feature crosses repos.

Account for permissions, CallState and typed events, lifecycle scope, error and empty states,
Signal Forms when forms change, and routing/SSR/hydration boundaries. Keep presentational
components free of stores and transport. Preserve native Spartan composition and interactions;
plan responsive layout, accessibility, localization and screenshots when visual behavior changes.
Do not add browser-only dependencies to server execution or create homegrown UI primitives.
Plan FEATURE.md updates for changes to public ownership, contracts and flows.

Load fg-web-feature, fg-web-service, fg-web-security-review or other first-party skills only
when their boundary applies. For UI composition load spartan with fg-web-spartan; use
fg-web-quality to select scoped lint, meaningful Angular tests and strict builds. Distinguish
unit tests, transport contract checks, synthetic browser harness, localized and real SSR
verification. State whether backend and browser evidence were actually available.

## Make the plan ready to implement

Explain the intended result, chosen approach, affected boundaries, implementation order and
validation that demonstrates success. Include relevant failure, concurrency, privacy,
retention, operational and rollout considerations. Name concrete files or owning areas when
known, without turning the plan into an exhaustive file catalog. Separate optional bonuses
from necessary behavior, and record any activation prerequisite that depends on an operator.

Review an existing plan against current sources and retain accepted decisions unless new
evidence warrants a change. Revise the prose and diagrams together. State unresolved choices
and material validation limits rather than claiming readiness or observed runtime discovery.
AI-facing procedures belong in .agents or the appropriate tooling directory, outside docs;
human product, architecture and operating documentation retains its own legitimate location.

## Start with the reader's question

Choose the presentation that makes the subject easier to understand, with detail proportional
to the task. A reader should understand the intended result, the decisions and their reasons,
the changes needed, and how success will be checked. These are useful information, not
mandatory headings or a fixed outline.

Use the user's language. Explicit requests about format, length or detail take priority.
Keep a small correction compact; give a complex flow enough explanation to make its
dependencies and important failure cases understandable. Distinguish verified current
behavior from proposed behavior and assumptions. Resolve decisions that block the plan
before presenting it as ready for implementation.

## Select a format for a purpose

| Reader's need                                               | Useful presentation                              |
| ----------------------------------------------------------- | ------------------------------------------------ |
| Understand components, dependencies or data movement        | Mermaid flowchart                                |
| Follow exchanges between actors over time                   | Mermaid sequence diagram                         |
| Understand transitions and a lifecycle                      | Mermaid state diagram                            |
| Compare options, contracts or current and proposed behavior | Markdown table                                   |
| Follow steps whose order matters                            | Numbered list                                    |
| Understand an interface or a concrete behavior              | Short code, input/output or scenario example     |
| Find supporting evidence or navigate an explanation         | Links, descriptive headings and focused emphasis |

These are examples, not an exhaustive menu or mandatory mapping. Plain prose is a complete
option. There is no diagram or table quota, fixed section count, or requirement to explain
why a visual was omitted. A table helps when rows share comparison dimensions; a list or
paragraph can be clearer when each item needs a different explanation.

Use checkboxes for an actual execution checklist when useful, rather than implying that a
proposed action has been completed. Use fenced code blocks with a language label for concrete
interfaces or examples. Keep headings and emphasis focused on the decisions that matter.
Prefer portable Markdown; the explanation should still be understandable if a diagram
does not render in the reader's client.

## Keep the explanation and visuals aligned

Place each illustration beside the explanation it supports. Introduce its purpose, clarify
the meaning and direction of arrows, and provide a short prose equivalent. Label whether
it shows current behavior, a proposed target, or an illustrative example.

Use readable labels and show only the relationships relevant to the decision. When a diagram
becomes difficult to follow, simplify it or split it by concern. Do not add components,
dependencies or decisions merely to complete a diagram. Include a failure path or boundary
when it matters to the proposed change.

Update the prose, tables and diagrams together when revising a plan. Link to precise
repository evidence for claims about current behavior; identify assumptions rather than
drawing them as established facts. A parser or renderer check establishes syntax, while
visual inspection establishes whether the diagram communicates the intended relationship.

## Review proportionally

Check that decisions are concrete, boundaries are respected, and proposed checks cover the
risks. Remove repetition and decorative structure. Optional examples live in
[presentation examples](references/presentation-examples.md); read them only when helpful.
A parser check establishes syntax, not clarity or discovery in a new Codex/Claude session.
