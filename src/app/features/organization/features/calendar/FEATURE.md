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

The page is a **full-height console**, not a scrolling document: a
page-level toolbar band (Today, prev/next month, the current period label)
owns period navigation, driving the page's own `month`/`selectedDay` state.
`app-calendar` renders with its built-in toolbar hidden
(`[showToolbar]="false"`) so the grid and the page never show two sets of
Today/prev/next controls — the grid's own month title stays in the DOM,
`sr-only`, because `brnCalendarGrid`'s accessible name is `aria-labelledby`
that title regardless of whether it is visible. There is no week mode or any
other period granularity: the feed and the grid are month-only, so the
toolbar carries no mode switcher. Below `md`, the shrunken grid does not
render at all — an agenda (`#calendar-agenda`) shows the same loaded window's
entries grouped by day instead. Both the grid's day panel and the agenda's
day groups render through `CalendarEntryList`
(`ui/components/calendar-entry-list/`), the single row renderer for a feed
entry, so a row is never hand-rolled twice.

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
- **The feed is a date-window fetch, not a paginated collection** — a
  sanctioned bounded drain under DESIGN.md § Collections' Server Rule. The
  server bounds the payload by `from`/`to`; the client's only in-memory
  slice is the selected-day panel over the already-loaded window.
- **Loading is browser-only** (ARCHITECTURE.md §12.5-3): a dated,
  authenticated read that would immediately refetch after hydration.
- **Only an intervention entry links anywhere** (its workspace). The other
  sources render as plain rows until their detail routes are wired — adding
  a link is a per-source decision, not a generic `targetType` router.
- Source→tone mapping lives in one constant (`constants/calendar-source-tone.constants.ts`
  → `SOURCE_TONE`) shared by the grid chips (`CalendarPage.events`) and the
  day/agenda row badges (`CalendarEntryList`).

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
