# Feature: Organization Calendar

## Purpose and ownership

One page: the organization's **unified calendar** —
`/organizations/:organizationId/calendar` — reading the backend's merged,
date-ranged feed (`GET /organizations/{organizationId}/calendar/feed`). The
feed is the single source and merges exactly four contributors: standalone
calendar events, inspections (`performedAt`), interventions
(`plannedStartAt`/`dueAt`) and preventive maintenance (`nextDueAt`). Of the
four, only the `calendar_event` source is **writable** from this page: full
CRUD against `POST/PATCH/DELETE /organizations/{organizationId}/calendar/events`,
gated on `organization.events.write`. This feature owns the feed transport,
the standalone-event write transport, its models and the page; the month
grid itself is the **shared generic `Calendar`** (`@shared/calendar`) —
structure in Tailwind, every interactive or tonal element a spartan
primitive. The page maps the organization's regional preference
(`settings.regional.firstDayOfWeek`, read through `ORGANIZATION_CONTEXT_PORT`)
onto the grid's generic `firstDayOfWeek` input, Monday when unset.

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
  `organization.events.read` the feed endpoint enforces. The write surface
  (create/edit/delete) adds no route: it is dialogs on the same page, gated
  in-page on `organization.events.write`.

## Stores and data access

- `CalendarService` (`data-access/services/calendar/`) — `getFeed(orgId,
from, to)` plus `createEvent`, `updateEvent` (merge-patch: the caller sends
  only the dirty fields — see the Writable events invariant below) and
  `deleteEvent`.
- `CalendarFeedStore` (`state/calendar-feed/`) — component-scoped on the
  page. The feed read stays `withQueryState`, its one query concern; the
  three standalone-event writes are named `CallState` fields
  (`createEventCallState`/`updateEventCallState`/`deleteEventCallState`)
  since each reports independently. `load` uses `switchMap`: paging to
  another month supersedes the in-flight window.

## Invariants

- **Refresh-after-write, not client-side patching.** A successful
  create/update/delete re-runs the feed's last loaded window
  (`CalendarFeedStore` remembers it as `lastLoadCommand`) rather than
  splicing the write's response into `queryData().items` in place. The feed
  merges and sorts four sources server-side (`startsAt` ascending, tied by
  `sourceKey`, tied by `id`); reconstructing that ordering client-side from
  one write's response would drift from the server's own merge the moment a
  second source's entry sits nearby. The store owns the refetch; the page
  only closes the dialog once the write's own `CallState` reaches `success`.
- **Only a `calendar_event`-source entry is ever editable.** `CalendarEntryList`
  — not the page — enforces the gate: its `isEditableOf()` shows the
  Edit/Delete icon buttons only when `item.sourceKey === 'calendar_event'`
  **and** the caller-supplied `canWrite` input holds. Inspection,
  intervention and maintenance entries are projections of records this
  feature does not own; they never render a write affordance regardless of
  permission.
- **Merge-patch honors the backend's omitted-vs-`null` semantics.** An
  omitted `UpdateCalendarEventInput` field leaves that property unchanged
  server-side; only an explicit `null` clears `description`, `endsAt` or
  `facilityId` (`Calendar\MODULE.md`). `CalendarPage.buildUpdatePatch()`
  diffs the edit dialog's submitted values against the record being edited
  and includes only the fields that actually changed — instant comparison
  uses `Date#getTime()`, never string equality, since the same instant can
  round-trip through a different UTC offset.
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
- `FacilityService` (`@features/organization/features/facilities/data-access`)
  — read-only, to populate the event dialog's optional facility select.
  Mirrors the same cross-feature read `equipments`' detail page already
  makes into `facilities`; approved precedent, not a new exception.
- None on sibling subfeatures: intervention entries link by URL, not by
  importing the interventions feature.

## Follow-ups

- Detail links for inspection and maintenance entries once their pages have
  stable per-record routes.
