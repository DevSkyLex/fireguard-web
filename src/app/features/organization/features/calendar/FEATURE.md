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
page-level toolbar band (Today, prev/next period, the current period label,
and a Month/Week/Day granularity selector) owns period navigation, driving
the page's own `month`/`granularity`/`selectedDay` state. The selector is
`hlm-tabs` (`@shared/ui/tabs`) — the whole toolbar-plus-content section sits
inside one `[tab]="granularity()"`-bound `hlm-tabs`, `class="contents"` so it
stays invisible to the page's own flex layout, with each of the three panels
wired through `hlmTabsContent` — not a hand-rolled `role="tablist"`.
`app-calendar` renders with its built-in toolbar hidden
(`[showToolbar]="false"`) so the grid and the page never show two sets of
Today/prev/next controls — the grid's own month title stays in the DOM,
`sr-only`, because `brnCalendarGrid`'s accessible name is `aria-labelledby`
that title regardless of whether it is visible.

The granularity selector has an independent toolbar column on desktop and a
dedicated row on mobile; period-label length must not change its position.
The header groups New event and the Subscribe menu in a native Spartan split
button. Read-only viewers retain a direct Subscribe action.

**Three granularities**, all reading the same date-windowed feed: **month**
is the shared grid plus the selected-day panel; **week** is deliberately a
seven-day agenda list — every day of the week rendered as a heading plus its
entries through `CalendarEntryList`, empty days included — rather than an
hour-by-column grid, because the feed carries day-anchored entries (many
all-day) for which an hours grid would be mostly whitespace, and the agenda
form reuses the exact row renderer the rest of the page already trusts;
**day** is the anchored day's list full-page with prev/next stepping one
day. Week honours the same `firstDayOfWeek` preference as the grid. The
feed window follows the granularity: month ± one week (the grid's filler
days must keep their chips), the exact week, the exact day. Below `md`, the
month view's shrunken grid does not render at all — an agenda
(`#calendar-agenda`) shows the same loaded window's entries grouped by day
instead. The grid's day panel, the agenda's day groups, and the week/day
views all render through `CalendarEntryList`
(`ui/components/calendar-entry-list/`), the single row renderer for a feed
entry, so a row is never hand-rolled twice.

**Quick create from a day** (gated on `organization.events.write`, like
every write): each month-grid cell offers the shared calendar's "+" button
— revealed on cell hover and on its own keyboard focus, dated `aria-label` —
and each week/day section offers its own; both open the existing
`calendar-event-dialog` with `startsAt` pre-filled on that day at 09:00
local (`initialStartsAt`).

**Drag reschedule** (same gate): only a `calendar_event`-source chip is
flagged `draggable` on the month grid — inspection, intervention and
maintenance entries are projections this page does not own (an intervention
reschedules on its own page) and never drag. A drop on another day keeps the
event's local wall-clock time, shifts a set end by the same delta, and runs
`CalendarFeedStore.moveEvent`: optimistic reposition, PATCH, rollback plus
error toast on failure, window re-read on success. **Drag is never the only
path**: the row's Edit dialog changes the same dates by keyboard/AT, per the
shared calendar's documented a11y contract, and an `aria-live` region on the
page announces each move's outcome.

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
  `deleteEvent`. Also the member's iCal feed-token lifecycle against
  `/organizations/{id}/calendar/feed-token`: `createFeedToken` (POST, no
  body — the 201 is the only response ever carrying the raw secret and full
  feed URL, and creating rotates any prior token), `getFeedTokenMetadata`
  (GET — secret-less `createdAt`/`lastUsedAt`, 404 while none exists) and
  `revokeFeedToken` (DELETE, 204).
- `CalendarFeedStore` (`state/calendar-feed/`) — component-scoped on the
  page. The feed read stays `withQueryState`, its one query concern; the
  four standalone-event writes are named `CallState` fields
  (`createEventCallState`/`updateEventCallState`/`deleteEventCallState`/
  `moveEventCallState`) since each reports independently. `load` uses
  `switchMap`: paging to another period supersedes the in-flight window.
  `moveEvent` is the drag-reschedule write (optimistic, see Invariants);
  its failure dispatches `calendarFeedStoreEvents.moveEventFailed` for the
  app-wide feedback toast.

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
  **One sanctioned exception**: `moveEvent`, the drag-reschedule, repositions
  the matching entry optimistically before its PATCH — a dropped chip
  snapping back to its old day for a round-trip would read as a failed drop —
  then still reconciles through the window re-read on success, and rolls back
  to the pre-drop snapshot (plus an error toast) on failure.
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
- **Only a `calendar_event`-source chip ever drags, and drag is never the
  only path.** The page flags `draggable` only on writable standalone
  events; the other three sources stay inert on the grid. The keyboard/AT
  path to the same reschedule is the row's Edit dialog (its `startsAt`/
  `endsAt` fields), and the page's `aria-live` region announces each move.
- **The month feed window is one week wider than the visible month on each
  side**: the shared grid shows leading/trailing filler days, and their
  chips must not silently vanish. Week and day windows cover exactly their
  period.
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
- **`CalendarFeedSubscribeDialog` injects `CalendarService` directly — a
  sanctioned, documented deviation from §10.3.** The toolbar's "Subscribe
  (iCal)" dialog (`ui/dialogs/calendar-feed-subscribe-dialog/`) owns the
  member's feed-token lifecycle end to end: metadata read on open (404 =
  no token), generate, regenerate and revoke each behind an in-dialog
  confirmation. It mirrors the §11.6 one-shot exception (the CSV-export
  precedent): every call is a fire-and-forget drain of dialog-local
  ephemeral state, and the raw secret — shown exactly once — must not
  outlive the dialog, so routing it through `CalendarFeedStore` would both
  create `CallState` fields no other view reads and park a secret in
  page-lifetime state. The page only holds the dialog's visibility and
  forwards `organizationId` plus the `REGIONAL_FORMATTING_PORT` settings
  for the `createdAt`/`lastUsedAt` rendering. No new route and no new
  permission: the page's own `organization.events.read` gate covers the
  token endpoints.
- **The dialog gates dismissal while the form is dirty, in both create and edit mode.** `CalendarEventForm` reports its own dirtiness through `dirtyChanged`; `calendar-event-dialog` holds it in a local `dirty` signal and routes Escape, the backdrop and the form's own Cancel through `requestClose()`, which raises `@shared/unsaved-changes` instead of closing.

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
- Standalone events are created and edited in the centered `calendar-event-dialog`; the delete confirmation stays an alert-dialog.
