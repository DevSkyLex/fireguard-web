# Feature: Organization Calendar

## Purpose and ownership

One page: the organization's **unified calendar** —
`/organizations/:organizationId/calendar` — reading the backend's merged,
date-ranged feed (`GET /organizations/{organizationId}/calendar/feed`). The
feed is the single source and merges exactly four contributors: standalone
calendar events, inspections (`performedAt`), interventions
(`plannedStartAt`/`dueAt`) and preventive maintenance (`nextDueAt`). This
feature owns the feed transport, its models and the page; the month grid
itself is the **shared generic `Calendar`** (`@shared/calendar`) — structure
in Tailwind, every interactive or tonal element a spartan primitive.

## Route entry points

- `calendar.routes.ts` → `CALENDAR_ROUTES`, mounted by
  `organization.routes.ts` under `calendar`, gated by
  `organizationPermissionGuard({ permissions: [EVENTS_READ] })` — the same
  `organization.events.read` the feed endpoint enforces.

## Stores and data access

- `CalendarService` (`data-access/services/calendar/`) — `getFeed(orgId,
from, to)`, the only call. Read-only in this pass.
- `CalendarFeedStore` (`state/calendar-feed/`) — component-scoped on the
  page; exactly one query concern, so `withQueryState` carries the lifecycle.
  `load` uses `switchMap`: paging to another month supersedes the in-flight
  window.

## Invariants

- **The feed window is one week wider than the visible month on each side**:
  the shared grid shows leading/trailing filler days, and their chips must
  not silently vanish.
- **Loading is browser-only** (ARCHITECTURE.md §12.5-3): a dated,
  authenticated read that would immediately refetch after hydration.
- **Only an intervention entry links anywhere** (its workspace). The other
  sources render as plain rows until their detail routes are wired — adding
  a link is a per-source decision, not a generic `targetType` router.
- Source→tone mapping lives in one constant (`SOURCE_TONE`) shared by the
  grid chips and the day panel badges.

## Cross-feature dependencies

- `@shared/calendar` (generic widget, no domain knowledge).
- None on sibling subfeatures: intervention entries link by URL, not by
  importing the interventions feature.

## Follow-ups

- Standalone-event CRUD ("New event", edit, delete) against
  `POST/PATCH/DELETE /organizations/{organizationId}/calendar/events` —
  the backend is ready; the UI surface is deliberately out of this pass.
- Detail links for inspection and maintenance entries once their pages have
  stable per-record routes.
