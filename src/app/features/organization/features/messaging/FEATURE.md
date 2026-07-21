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
- `isChannel` discriminates a channel from a direct conversation; a channel has
  a `name`, a DM carries `visibility: 'direct'`.

## State and data access

- `MessagingService` — conversations, messages, send, mark-read.

Live updates go through `resilientMercureStream` (`@core/mercure`), never
`MercureService.subscribe` directly: the raw service errors its subscriber on
the transport `error` event, which kills EventSource's own reconnect and leaves
the channel silently dead. The subscription is re-requested per attempt because
its token is short-lived.

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

## Not built yet

Participants, and record-bound conversations (`subjectType` is already
`facility | equipment | intervention | non_conformity` in the API, and no view
surfaces it).
