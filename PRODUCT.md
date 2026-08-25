# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Field-service and fire-safety operators working inside a single organization
workspace. Two primary contexts:

- **Planners / managers** preparing interventions from a desk: defining scope,
  assigning responsible agents, reviewing and publishing results.
- **Field agents** executing interventions on site, often on a phone, frequently
  offline (IndexedDB persistence + outbox replay). They need fast,
  thumb-reachable actions and a clear "next recommended action".

The job to be done: take a fire-safety intervention from draft → planned →
executed in the field → reviewed → published, without losing data offline and
without ambiguity about what to do next.

## Product Purpose

FireGuard is an organization-scoped platform for planning, executing and
publishing field interventions (facilities, equipment, inspections). Success is
an intervention that moves through its full workflow with zero data loss
offline, clear blocker resolution, and an atomic publication that either fully
succeeds or leaves records untouched.

## Positioning

**The headline claim is atomic offline publication.** The agent works fully
offline; publication then applies every inspection, equipment change and record
as one transaction that either fully succeeds or leaves records untouched.
There is no half-published intervention. This leads because it is the hardest
mechanism for a neighboring product to copy truthfully.

Two further mechanisms are equally true and support it, but do not lead:

1. **The next action is named, not inferred.** The workflow surfaces the single
   next step at every phase — guided planning steps, a living recommended
   action during execution, and phase gates that state their `disabledReason`
   rather than dead-ending silently.
2. **One business chain, one workspace.** Facilities, equipment, inspections,
   checklists and interventions are a single organization-scoped chain rather
   than juxtaposed tools, so an intervention carries the full context of the
   asset it concerns.

## Operating Context

- **The intervention lifecycle** is the spine of the product:
  `draft → planned → in_progress → submitted (review) → published`, plus
  `changes_requested` (reviewer sends work back with a required note) and
  `abandoned` (terminal, read-only). Transitions are gated by a workflow policy
  and by RBAC capability.
- **Two scenes, one dataset.** The desk scene browses interventions as List /
  Board / Calendar over one shared dataset; the field scene is a phone, often
  offline, working a single intervention workspace.
- **A separate organization-wide calendar** merges four contributors from one
  backend feed: standalone calendar events, inspections (`performedAt`),
  interventions (`plannedStartAt` / `dueAt`) and preventive maintenance
  (`nextDueAt`). It is distinct from the interventions-only calendar view.
- **Field artifacts** produced on site: work items (checklist), discovered
  issues, proposed changes (applied atomically at publication), evidence photos
  attached to equipment, QR-scanned equipment identification, and an activity
  timeline with comments.
- **Organization administration** surrounds the workflow: members and their
  profiles, invitations, roles and effective permissions, general & branding
  settings, regional and notification preferences, subscription plan, quota
  usage meters, and Stripe-hosted billing.
- **Collaboration** runs alongside: organization channels, direct
  conversations, presence, and an AI assistant panel.
- **First run** is a mandatory guided organization activation wizard; an
  invitation landing page is reachable logged-out so an invitee can preview and
  then sign in or sign up.

## Capabilities and Constraints

**Confirmed capabilities**

- Angular 22 PWA with SSR/hydration, service worker, and an installable
  standalone manifest (`Fireguard Field Operations`).
- Interface built on spartan/ui (`@spartan-ng/brain` plus helm components
  vendored into `src/app/shared/ui/`) with Tailwind v4 utilities and semantic
  theme tokens — the sole component library in the app.
- Offline-first field execution: IndexedDB workspace persistence, an outbox
  queue with replay on regained connectivity or visibility, prefetch of the
  member's workspaces, and deferred service-worker updates while the outbox is
  dirty.
- Intervention comments are **queued** when posted offline, and also when an
  online post fails on a network error.
- Server-side pagination, filtering and sorting on the intervention list, with
  a debounced search synced to the URL. Sort and fold state persist in a
  cookie; filters deliberately do not, being questions asked now rather than
  stored preferences.
- In-place editing of intervention properties on the detail page, including
  replanning, rather than a separate edit route.
- Realtime via Mercure; Hydra/JSON-LD transport against `fireguard-sso-api`
  (Symfony / API Platform, OAuth2/OIDC).
- Authentication with MFA, trusted devices, session management, and
  organization-scoped RBAC.
- Localization: **en-US is the source locale**, with French and Spanish
  catalogs shipped (`src/locale`).

**Constraints future work must preserve**

- **Market frame: EU multi-market.** No single national fire-safety regime may
  be presumed in the domain model, and no copy may claim conformity with a
  specific standard (ERP registre de sécurité, APSAD, NF, or any other).
  Organizations define their own facility types, checklists, and intervention
  types.
- **Quota enforcement is backend-owned and strict**: create flows return HTTP
  409 at the cap; there is no frontend route gating. Plan quota wording arrives
  ready-made from the API (`PlanOutput.quotas[].summary`) and is never
  re-derived or invented in the frontend.
- Plans cap _quantities_ of countable resources (members, facilities,
  equipment, inspections). They never disable features.
- Some persisted preferences are **not yet enforced**: notification preferences
  and regional/format preferences are saved by the settings `PATCH` but are not
  consumed yet. Do not present them as active behavior.

## Brand Commitments

- **Name:** FireGuard (`Fireguard Field Operations` as the installed PWA name).
- **Mark:** three stable blocks plus a 45°-pivoted "guard" square in indigo, on
  a near-black rounded tile. It survives as `public/favicon.svg`,
  `favicon.ico` and the PWA icons (192/512, maskable). It is the identity; it
  is not open for redecoration. There is no in-app logo component today.
- **Accent: the interface is achromatic by decision.** The theme is spartan's
  neutral scale (`--primary: oklch(0.205 0 0)` light, `oklch(0.922 0 0)` dark —
  zero chroma). Indigo `#4f46e5` is **retired** to the mark and to browser
  chrome only (`manifest.webmanifest` `theme_color`, the `index.html`
  `theme-color` meta). Future work must **not** reintroduce a chromatic brand
  accent; hierarchy and emphasis come from the neutral scale, weight and
  spacing. Semantic status color (destructive, warning, success) is unaffected
  and stays a functional signal.
- **Type:** Geist Variable for UI, Geist Mono for code and identifiers
  (revision hashes, `FG-{number}` codes). Both are self-hosted via
  `@fontsource-variable` so they are offline-safe and cached by the service
  worker — a product constraint, not only a style choice.
- **Personality:** dependable, operational, calm under pressure. Three words —
  **trustworthy, precise, efficient**. It should feel like a professional field
  tool that disappears into the task; closer to Linear/Stripe than to a
  consumer app.
- **Binding visual rule:** hierarchy comes from rhythm, not boxes — and the
  card is the section's shell, not its hierarchy. Sections are built on
  `hlmCard`; what must vary is what happens _inside_ and _between_ them:
  borderless headers, tinted secondary asides, divider lists, density, spacing.
  A page whose sections differ only by their contents, with no internal
  hierarchy and no rhythm between them, fails this rule whether or not it is
  carded.

## Anti-references

- Consumer-app playfulness, mascots, or decorative illustration.
- Dashboard "hero metric" templates: big gradient numbers with tiny labels.
- Sections that are identical bordered boxes and nothing more — no internal
  hierarchy, no rhythm between them. The objection is to the flatness, not to
  the card: `hlmCard` is the section shell application-wide (see
  `src/app/features/organization/FEATURE.md`), and `shared/page-section` was
  deleted rather than kept as a second way to draw one.
- Tiny uppercase tracked eyebrows above every section.
- Gratuitous motion or page-load choreography that delays the task.
- A reintroduced chromatic brand accent (see Brand Commitments).

## Evidence on Hand

**Real, usable**

- The working application itself: the full intervention lifecycle, offline
  execution, organization administration, the unified calendar, and
  collaboration are implemented and demonstrable.
- Brand assets: `favicon.svg` / `favicon.ico`, PWA icons (192/512, maskable),
  and eight country flag SVGs in `public/flags`.
- Shipped translation catalogs: `messages.fr.xlf`, `messages.es.xlf`.
- Per-feature normative documentation: a `FEATURE.md` for each top-level and
  nested business feature.
- Deployment is real: VPS via GitHub Actions → Docker → GHCR → Traefik
  (`DEPLOYMENT.md`).

**Absent — must never be fabricated**

FireGuard is a **certification / portfolio build** (RNCP material sits beside
this repository). There are **no real customers, no pilot organizations, and no
usage data**. Future work must not invent or imply client logos, testimonials,
case studies, adoption or performance metrics, press mentions, ratings, or
customer counts. Plan pricing and quota copy come from the backend; nothing
about commercial traction may be asserted.

## Product Principles

1. **Integrity over convenience.** An intervention publishes completely or not
   at all. Never a partial record, never a silently dropped field edit.
2. **The next action is always named.** At every phase the interface states the
   single most important next step — and when a gate is closed, why.
3. **Offline is a first-class state, not a failure.** Connectivity, pending
   changes, and sync progress are surfaced plainly, never hidden.
4. **One chain, one context.** Asset → inspection → intervention stay linked;
   the workspace carries the context instead of sending the user to fetch it.
5. **The tool disappears into the task.** Earned familiarity over novelty;
   thumb-reachable actions, scannable density, and resilient states (loading,
   empty, error, disabled) on every interactive surface.

## Accessibility & Inclusion

- Target WCAG 2.1 AA: body text ≥ 4.5:1, large/UI text ≥ 3:1, visible focus.
- Full dark mode (`html[data-theme="dark"]`) parity.
- `prefers-reduced-motion` honored on every animation.
- Keyboard-navigable workflow (real buttons everywhere; the phase stepper is a
  non-interactive presentational list).
- Status never conveyed by color alone — pair severity color with a
  label/icon. This is load-bearing now that the interface is achromatic.
- The field scene is one-handed on a phone: primary actions stay in the thumb
  zone, and a reviewer without publish rights must still reach their action
  there.
