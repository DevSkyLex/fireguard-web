# Feature: Messaging

## Purpose and ownership

Channels, direct conversations and their messages — the collaboration core of
the workspace.

Nested under `organization`: conversations belong to one organization. The
collection endpoints scope by an **explicit organization filter** (see
Invariants) — never by an implicit "active organization" of the session.

## Status

Conversation list, thread, composer and emoji reactions are live at
`…/messages`, with the thread updating in real time. Messages can be pinned
(conversation-wide) and saved (personal), and online authors carry a presence
dot. Replies open in a side panel, and messages can carry file
attachments.

`MessageComposer` (`ui/components`) owns the two-row composer of the design kit
— textarea over a toolbar, with Discard and Send — and serves both the thread
and the reply panel through its `compact` input. It is presentational: the page
keeps authority over draft persistence through the two-way `draft` model, and
feeds the member directory in through `members`.

Typing `@` at a word boundary opens the mention popover; picking a member
inserts the backend's `@{memberUuid}` token, the exact form `MentionExtractor`
parses, so mention notifications actually fire. The caret drives the detection,
so `alice@acme` is left alone. Known rough edge: the raw token is what shows in
the textarea — rendering a chip there would need a rich-text field.

`shortcutsRequested` is published but not yet answered; the shortcut palette is
still to build.

**Presence is published, not only read.** `pingPresence` existed and was called
from nowhere, so the app checked everyone else's presence while never
announcing its own — the online dot could appear only for members using some
other client. The workspace now beats every 45s while it is open, inside the
server's 90s hold so a dropped request does not read as "left".

**A thread does not stop at its first page.** The API pages messages at 50,
newest-first; the store tracks `loadedMessagesPage` / `messagesTotal` and
`loadOlderMessages` prepends the page before, merging by id because a message
can straddle two requests. Scrollback deliberately skips the `THREAD_WINDOW`
trim: that cap bounds the live tail's growth, and applying it here would drop
the very history just asked for.

**Editing is the author's alone; deleting also reaches a moderator.** The
backend refuses `PATCH /api/messages/{id}` to anyone but the author whatever
their permissions, so the thread's overflow menu offers Edit only to them.
Delete additionally opens to `messaging.manage`. A delete is soft: the row stays
with `isDeleted`, so replies and reactions keep their anchor — the store marks
it rather than dropping it, which is what a reload would show anyway.

**The thread follows its own arrivals, but only from the bottom.**
`MessageThread` scrolls to the newest message when the reader is within one
viewport of the end, and leaves them alone otherwise — yanking someone back down
mid-history is worse than not scrolling. The scroll is deferred a turn because
the new message has not been laid out when the effect runs.

**Creating conversations.** The sidebar's Channels header carries the kit's `+`,
which opens `NewChannelDialog` (`ui/dialogs`). Its header sits outside the list's
`@if` on purpose: a workspace with no channel yet still needs the button, or the
first channel could never be created. `ConversationInventoryStore.createChannel`
and `.openDirectConversation` both write their result id into
`openedConversationCallState`; the sidebar watches `openedConversationId()`,
deep links into the thread, then calls `clearOpenedConversation()`.

> `POST /api/channels` answers a **`ChannelOutput`**, not a `ConversationOutput`
> — it carries `participantCount` / `createdByMember` / `parent` and has none of
> `subjectType` / `visibility` / `isChannel` / `parentConversationId`. The store
> therefore refetches the list instead of folding the answer into it. Do not
> "simplify" that into a local push.

`openDirectConversation` is get-or-create, so it doubles as "open" —
`NewDirectConversationDialog` lists the workspace's members (minus the acting
one) behind the Direct messages `+`. The directory loads when the picker opens
rather than on mount: most members never start a new thread.

## Route entry points

| URL          | Component       | Guard                                           |
| ------------ | --------------- | ----------------------------------------------- |
| `…/messages` | `MessagingPage` | `organizationPermissionGuard([MESSAGING_READ])` |

The open conversation is mirrored to `?conversation=`, so a thread can be
linked and survives a reload. The page watches that param through its bound
input, so an in-page navigation (a channel row in the shell sidebar) opens the
thread just like a deep link does — reading it once from the route snapshot
used to ignore every subsequent navigation.

**The workspace has no conversation column of its own.** The shell sidebar is
the single list — Favorites, Channels and Direct messages — exactly as the
prototype has one list, not two. Direct messages are a section here although
the prototype files them behind a nav destination: without it a non-favourited
DM would be unreachable.

## Invariants

- **The endpoints are not organization-scoped in their path, but the
  collection lists REQUIRE the organization as a query filter.** They are
  `/api/conversations…`, not `/api/organizations/{id}/conversations…`
  (prefixing them hits a route that does not exist) — and `GET
/api/conversations`, `/api/saved-messages` and `/api/presence` all answer
  **400 without `?organization=<IRI>`**. A member can belong to several
  workspaces; there is no implicit "session organization" to fall back on,
  and the hermetic e2e mocks cannot catch a missing filter — the service
  spec pins it instead.
- **`authorMember`, `pinnedBy` and every `mentions` entry are member IRIs**
  (`/api/organizations/{id}/members/{memberId}`), _not_ bare ids — this file
  asserted the opposite for a long time and the code believed it, so author
  names and presence never resolved against the real backend. Convert with
  `toMemberId` (`data-access/adapters/`) at every lookup; the member directory
  and the presence endpoint are both keyed by the bare id.
- Authors are resolved through `OrganizationMemberDirectoryStore`. Do **not**
  swap that for `OrganizationMembersStore`: the latter is the admin table's
  state (one page of 20, filtered by its search box), so author names would
  vanish the moment an administrator typed in the members search — a bug that
  would read as a rendering glitch, far from its cause.
- **A reaction carries `reactedByMe`, never the reactor ids.** The API
  aggregates server-side. The UI needs that flag to tell "3 people reacted"
  from "3 people including me", and the toggle needs it to choose between POST
  and DELETE — nothing client-side has to know who "I" am.
- **The replies panel sits beside the thread, never over it.** A reply almost
  always needs the surrounding conversation for context, so the panel is the
  workspace's third pane (330px, per the kit) rather than a takeover.
- **The root message is rendered at the top of the panel**, reusing the same
  thread component — a reply list without its subject reads as orphaned.
- **Presence has no "list all online" mode.** The API requires the member ids to
  check (max 100), so each surface derives them from what it shows: the page
  from the authors on screen, the details panel from the channel's participants.
  The panel reads presence itself rather than reusing the page's — the page
  store is route-provided and the panel is built in the layout injector. An id
  absent from the response means offline **or** unknown — presence expires
  server-side — so only the online case is ever asserted in the UI, and the
  details panel groups members under named **Online** / **Offline** headings so
  the dot never carries the state alone.
- **The details panel degrades per-section, not as a whole.** Main info and the
  linked threads are read from the conversation inventory the panel already
  holds; only the members list belongs to the fetch that can fail. A failed
  fetch therefore reports itself where the members would be instead of blanking
  the tab — hiding facts we have because facts we do not have went missing.
- **Pinning is shared, saving is personal.** A pin is visible to the whole
  conversation; a save is only in the member's own list. They must never share a
  control or an icon.
- **Row actions hide on `opacity`, not `hidden`.** The thread reads as prose
  until you hover, but the buttons stay in the tab order — `display: none` would
  make them unreachable by keyboard.
- **Removing a reaction returns no body.** The updated message is derived
  locally, so the chip disappears when its last reactor leaves rather than
  lingering at zero.
- **An unknown author still renders.** Members get removed; their messages stay.
  The thread falls back to "Former member" rather than blanking the row.
- **A deleted message keeps its row** (`isDeleted`, `body: null`) so replies and
  reactions do not dangle. Renderers must handle a null body rather than
  filtering the message out.
- **`subjectType` discriminates**, not `visibility`. The API's values are
  `channel | direct | facility | equipment | intervention | non_conformity`, and
  `visibility` is only ever `subject | participants`. A direct conversation is
  `subjectType === 'direct'` with a null `name`; "not a channel" also matches
  record-bound threads and must not be used.

## Listing conversations — two endpoints, not one

`GET /api/conversations` **never returns a channel or a direct conversation**:
the backend repository excludes both as a privacy invariant. So the inventory
is built from TWO calls, forkJoined in `ConversationInventoryStore.load`:

- `MessagingService.listChannels()` → `GET /api/channels` — the only endpoint
  that lists a member's channels. Its `ChannelOutput` rows are normalized into
  `ConversationOutput` by the pure `toConversation` adapter
  (`data-access/adapters/channel-conversation.adapter.ts`), which sets
  `subjectType: 'channel'` / `visibility: 'participants'` / `isChannel: true`
  and reduces the `parent` IRI to a bare `parentConversationId`.
- `MessagingService.listConversations()` → `GET /api/conversations` — the
  record-bound subject threads only.

> **Direct conversations cannot be listed at all.** The API has no
> `GET /api/direct-conversations`; a DM is only ever returned by the
> get-or-create POST. The store therefore keeps the DMs opened during the
> session in `sessionDirectConversations` and merges them into the list, so a
> DM at least stays in the sidebar until the tab is reloaded. Delete that state
> the day the backend ships a DM collection — do not paper over it further.

## State and data access

- `MessagingService` — channels, conversations, messages, send, mark-read, plus
  the panel's `listConversationLinks` (paged 30) and `getConversationActivity`
  (unpaginated, zero-filled, `buckets` capped at 366 server-side).
  `markRead` is a **PATCH** (the backend declares a `Patch` operation; a POST
  answers 405), and `pingPresence` requires the organization IRI in its body.

Live updates go through `resilientMercureStream` (`@core/mercure`), never
`MercureService.subscribe` directly: the raw service errors its subscriber on
the transport `error` event, which kills EventSource's own reconnect and leaves
the channel silently dead. The subscription is re-requested per attempt because
its token is short-lived.

**A dead stream is announced, not swallowed.** `resilientMercureStream` gives
up after its retry budget; the workspace store then sets `isRealtimeDown` and
the page shows a "live updates unavailable" notice. Silence used to be the only
symptom of an unreachable hub (in dev, Mercure's `cors_origins` must include the
web origin).

**A hub message the thread already holds is replaced, not appended.** The
sender's own message arrives twice — once from the POST response, once echoed
by the hub — and appending both would show it duplicated to its author and to
nobody else, which is the worst kind of bug to reproduce.

## Attachments

A message can carry files: the composer stages a file, the message is created
first, then the file is uploaded to its id (POST multipart). Uploading goes
through `http` directly with the JSON content-type dropped so the browser sets
the multipart boundary — `HydraApiService.post` would force `application/ld+json`
and break it.

**Attachments download through a plain link**, not an HttpClient call:
`GET /api/messaging-attachments/{id}/content` (API `5f5128a7`) streams the
bytes with `Content-Disposition: attachment` and rides the session cookie,
gated by the same access rule as reading the owning conversation. The
transport model still carries no URL — the thread builds it from
`ENV_CONFIG.apiUrl`.

A file with no text is a valid message — "here is the report" is often just the
report — so the composer sends when either a body or a file is present.

## Message references

A message can carry up to five `{type, id, label?, code?}` record cards
(`MessageOutput.references`), rendered under the body in the same slot as the
attachments by `MessageReferenceCard` (`ui/components/message-thread/components/`).
Display only — attaching one from the composer is not built.

- **`references` is optional on the model, not nullable.** API Platform omits
  the field on a message that has none, so it arrives as `undefined`; the thread
  reads it as `?? []`. Same for `label` / `code`, which are read through
  `typeof` checks — a `=== null` guard would print `undefined` on screen.
- **A tombstoned message shows none.** The backend redacts `references` to `[]`
  with the body; the thread additionally drops them for a message marked
  `isDeleted` locally, so an optimistic delete reads like the reload would.
- **A non-conformity has no page**, and the reference does not carry the
  inspection that could stand in for one, so its card renders as plain content
  instead of a dead link. Facility, equipment and intervention cards link to
  `/organizations/{organizationId}/{facilities|equipments|interventions}/{id}`;
  the card reads the organization from `ORGANIZATION_CONTEXT_PORT` and degrades
  to plain content when none is selected.
- The non-conformity variant is the **danger** one (warning tile, red border and
  tint), but never by colour alone: every card spells its kind out under the
  title.

## Conversation details panel

A shell **panel-slot** contribution (ARCHITECTURE.md §9.4.3), keyed off
`?conversation=` because the layout injector cannot see the page's store. Four
tabs: Info, Pinned, Files, Links. The Creator row is rendered only for rows
sourced from `GET /api/channels` (`ConversationOutput.createdByMember` is absent
otherwise).

- **Links come from `GET /api/conversations/{id}/links`**, paged 30 at a time,
  newest first, with an explicit "Load more". They used to be scraped
  client-side from the loaded page of messages, which only ever showed recent
  history; the backend now extracts them across the whole thread. The rows carry
  `label`, but it is **never populated today** — the tab shows the URL and a
  relative timestamp. The links are their own call state, not part of the
  panel's forkJoin: they page, and their failure degrades that tab alone.
- **The Info tab carries an activity heatmap** built from
  `GET /api/conversations/{id}/activity?buckets=26` (`ConversationActivityHeatmap`,
  in the panel's `components/`): 13x2 cells, four fixed intensity steps, each
  cell labelled with its count and day so the tint never carries the meaning
  alone. Fetched inside the panel's forkJoin but with its own `catchError`: a
  missing heatmap must not blank the members list.
- **Linked threads are a computed, never a fetch.** There is no "related
  conversations" endpoint; the panel derives parent, sub-channels, siblings
  (same parent) and same-record threads from the `ConversationInventoryStore`
  rows it already holds, with the sidebar's own label resolution (a DM has no
  name — the counterpart is resolved through the member directory) and the
  row's unread count. `subject` is matched with a `typeof` check: it is omitted
  when null, and a bare null test would link every subject-less thread to every
  other one.

## Not built yet

Participants, and record-bound conversations (`subjectType` is already
`facility | equipment | intervention | non_conformity` in the API, and no view
surfaces it).
