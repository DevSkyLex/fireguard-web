# Feature: Messaging

## Purpose and ownership

Channels, direct conversations and their messages — the collaboration core of
the workspace.

Nested under `organization`: conversations belong to one organization, and the
backend scopes every endpoint by the session's active organization.

## Status

**Transport layer only.** Models and `MessagingService` are in place and
covered; there is no UI, store, or route yet. The next lot owns the conversation
view.

## Route entry points

None yet. Planned: `…/channels/:channelId`, `…/dm/:conversationId`, `…/saved`,
`…/drafts`, under a pathless parent providing the workspace store.

## Invariants

- **The endpoints are not organization-scoped in their path.** They are
  `/api/conversations…`, not `/api/organizations/{id}/conversations…` — the
  backend derives the organization from the session. Prefixing them hits a route
  that does not exist.
- **`MessageOutput.authorMember` is a bare member id.** No name, no avatar.
  Resolving an author needs the organization member directory, and the join
  belongs in the store — never in a template. Do **not** read
  `OrganizationMembersStore` for it: that is the admin table's state (one page
  of 20, filtered by its search box), so avatars would vanish the moment an
  admin types in the members search.
- **A deleted message keeps its row** (`isDeleted`, `body: null`) so replies and
  reactions do not dangle. Renderers must handle a null body rather than
  filtering the message out.
- `isChannel` discriminates a channel from a direct conversation; a channel has
  a `name`, a DM carries `visibility: 'direct'`.

## State and data access

- `MessagingService` — conversations, messages, send, mark-read.

Live updates must go through `resilientMercureStream` (`@core/mercure`), not
`MercureService.subscribe` directly: the raw service errors its subscriber on
the transport `error` event, which kills EventSource's own reconnect and leaves
the channel silently dead.

## Not built yet

Reactions, pinned messages, saved messages, threads/replies, attachments,
participants, presence, and record-bound conversations (`subjectType` is already
`facility | equipment | intervention | non_conformity` in the API, and no view
surfaces it). All have backend endpoints already.
