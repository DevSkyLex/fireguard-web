# Feature: Messaging

## Purpose and ownership

Channels, direct conversations and their messages — the collaboration core of
the workspace.

Nested under `organization`: conversations belong to one organization, and the
backend scopes every endpoint by the session's active organization.

## Status

Conversation list, thread, composer and emoji reactions are live at
`…/messages`, with the thread updating in real time. Messages can be pinned
(conversation-wide) and saved (personal), and online authors carry a presence
dot. Replies open in a side panel. Attachments are not built.

## Route entry points

| URL          | Component       | Guard                                           |
| ------------ | --------------- | ----------------------------------------------- |
| `…/messages` | `MessagingPage` | `organizationPermissionGuard([MESSAGING_READ])` |

The open conversation is mirrored to `?conversation=`, so a thread can be
linked and survives a reload. The page reads the param from the route snapshot
on construction; opening a conversation selects it directly and mirrors it to
the URL rather than waiting for the param to round-trip.

## Known limitation

The workspace does not stretch to the viewport height: the dashboard content
wrapper is `min-h-full`, not `h-full`, so `flex-1` inside it resolves against
content rather than the shell. Fixing it is a **shell** change affecting every
routed page, so it belongs in a lot that can re-verify the whole e2e suite —
not here.

## Invariants

- **The endpoints are not organization-scoped in their path.** They are
  `/api/conversations…`, not `/api/organizations/{id}/conversations…` — the
  backend derives the organization from the session. Prefixing them hits a route
  that does not exist.
- **`MessageOutput.authorMember` is a bare member id.** Authors are resolved
  through `OrganizationMemberDirectoryStore`. Do **not** swap that for
  `OrganizationMembersStore`: the latter is the admin table's state (one page of
  20, filtered by its search box), so author names would vanish the moment an
  administrator typed in the members search — a bug that would read as a
  rendering glitch, far from its cause.
- **Reactions need to know who "I" am.** The API reports `memberIds` per emoji,
  so without `currentMemberId` (from `OrganizationMemberAccessStore`) the UI
  cannot tell "3 people reacted" from "3 people including me", and the toggle
  cannot choose between POST and DELETE.
- **The replies panel sits beside the thread, never over it.** A reply almost
  always needs the surrounding conversation for context, so the panel is the
  workspace's third pane (330px, per the kit) rather than a takeover.
- **The root message is rendered at the top of the panel**, reusing the same
  thread component — a reply list without its subject reads as orphaned.
- **Presence has no "list all online" mode.** The API requires the member ids to
  check (max 100), so the page derives them from the authors currently on
  screen. An id absent from the response means offline **or** unknown — presence
  expires server-side — so only the online case is ever asserted in the UI.
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

## Not built yet

Reactions, pinned messages, saved messages, threads/replies, attachments,
participants, presence, and record-bound conversations (`subjectType` is already
`facility | equipment | intervention | non_conformity` in the API, and no view
surfaces it). All have backend endpoints already.
