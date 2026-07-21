# Feature: Calendar

## Purpose and ownership

One grid showing everything scheduled in an organization: interventions,
inspections, maintenance and standalone events, merged by the backend.

## Route entry points

| URL          | Component      | Guard                                        |
| ------------ | -------------- | -------------------------------------------- |
| `…/calendar` | `CalendarPage` | `organizationPermissionGuard([EVENTS_READ])` |

## Invariants

- **The mockup's "Audit" category does not exist.** `Calendar/MODULE.md` states
  it has no business existence in the backend, so it is left out rather than
  stubbed with an empty filter that would imply data is missing.
- **Tone is per source, not per status.** The calendar answers "what kind of
  work is this day made of"; colouring by status would turn a month view into
  noise. `status` stays on the entry for detail surfaces.
- **The window follows the focused month**, widened one month either side so a
  grid showing trailing days of the neighbouring months has no holes. Moving
  months refetches rather than loading a year nobody asked for.
- **An entry with no end stays open**, rendered as a point in time — inventing a
  duration would misreport the data.
- Maintenance and standalone events have no detail page, so clicking them is
  inert rather than a dead link.

## State and data access

- `CalendarFeedStore` — component-scoped, one query (`withQueryState`); reads
  the merged, read-only feed.
- `CalendarService.getFeed` — `GET /organizations/{orgId}/calendar/feed`.
- `adaptCalendarFeed` maps the feed onto the shared `Calendar` component's
  event shape; the grid itself is `@shared/components`, not feature-owned.
- `CalendarEventsStore` — component-scoped, named `CallState` (`createCallState`);
  drives the "New event" drawer only. Dispatches `calendarEventsStoreEvents`
  (`createSucceeded` / `createFailed`, both `FeedbackEventPayload`) picked up
  by the app-wide feedback listener as toasts.
- `CalendarEventService.create` — `POST /organizations/{orgId}/calendar/events`,
  gated server-side by `organization.events.write`; the page also hides the
  "New event" button when the active member lacks that permission.
- `CalendarPage` orchestrates: opens `CalendarEventDrawer` (hosting
  `CalendarEventForm`, both under `ui/`), calls `CalendarEventsStore.create`
  on submit, and — on success — closes the drawer and re-triggers
  `CalendarFeedStore.load` with the current window so the new entry appears
  without a page reload.

## Not built yet

- Editing and deleting events (`PATCH`/`DELETE /calendar/events/{id}`) — the
  backend resource supports both, but no UI calls them yet.
- A facility picker for the create form's optional `facilityId` — the feature
  has no facility list data source of its own yet; the field is omitted from
  `CalendarEventForm` rather than stubbed.
