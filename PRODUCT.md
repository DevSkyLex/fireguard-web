# Product

## Register

product

## Users

Field-service and fire-safety operators working inside a single organization
workspace. Two primary contexts:

- **Planners / managers** preparing interventions from a desk: defining scope,
  assigning responsible agents, reviewing and publishing results.
- **Field agents** executing interventions on site, often on a phone, frequently
  offline (IndexedDB persistence + outbox replay). They need fast, thumb-reachable
  actions and a clear "next recommended action".

The job to be done: take a fire-safety intervention from draft → planned →
executed in the field → reviewed → published, without losing data offline and
without ambiguity about what to do next.

## Product Purpose

FireGuard is an organization-scoped platform for planning, executing and
publishing field interventions (facilities, equipment, inspections). Success is
an intervention that moves through its full workflow with zero data loss offline,
clear blocker resolution, and an atomic publication that either fully succeeds or
leaves records untouched.

## Brand Personality

Dependable, operational, calm under pressure. Three words: **trustworthy,
precise, efficient**. The interface should feel like a professional field tool
that disappears into the task — closer to Linear/Stripe dashboards than to a
consumer app. Orange is the single brand accent (safety/fire association),
reserved for primary actions and active state, never decoration.

## Anti-references

- Consumer-app playfulness, mascots, or decorative illustration.
- Dashboard "hero metric" templates: big gradient numbers with tiny labels.
- Card-everything layouts where every section is an identical bordered box.
- Tiny uppercase tracked eyebrows above every section.
- Gratuitous motion or page-load choreography that delays the task.

## Design Principles

1. **The tool disappears into the task.** Earned familiarity over novelty;
   standard affordances done well beat invented ones.
2. **Next action is always obvious.** The field workflow guides the agent to the
   single most important next step at every phase.
3. **Hierarchy through rhythm, not boxes.** Vary surface levels (borderless
   headers, carded work surfaces, tinted secondary asides, divider lists) instead
   of wrapping everything in identical cards.
4. **Offline is a first-class state.** Sync, pending changes, and connectivity
   are surfaced clearly, never hidden.
5. **Respect the field context.** Thumb-reachable actions, scannable density, and
   resilient states (loading, empty, error, disabled) on every interactive surface.

## Accessibility & Inclusion

- Target WCAG 2.1 AA: body text ≥ 4.5:1, large/UI text ≥ 3:1, visible focus.
- Full dark mode (`html[data-theme="dark"]`) parity.
- `prefers-reduced-motion` honored on every animation.
- Keyboard-navigable workflow (phase tablist already implements roving tabindex).
- Status never conveyed by color alone — pair severity color with a label/icon.
