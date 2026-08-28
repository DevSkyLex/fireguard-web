# Collaboration

Nested subfeature of `features/organization`, alongside `facilities`, `equipments`,
`inspections` and `interventions` — the same shape those four have: a top-level backend module
whose resources are owned by an organization, so the frontend keeps it under the organization it
belongs to.

## Purpose

Owns the organization's conversational surface: direct conversations, channels, subject threads,
messages and their reactions and attachments, plus presence and the AI assistant.

**Direct conversations, channels, the assistant, and the per-message surfaces all have a UI
today.** The pin/save/edit/tombstone-delete, threaded-replies, saved-messages and
channel-info-panel slices were pruned once (2026-08-20) for having no UI, then **rebuilt from the
API contract (2026-08-28)** — from `MessageResource`'s routes and DTOs, not from the dormant
stores — and now have consuming surfaces: a per-message menu on the conversation pages, a reply
sheet, a saved-messages page, and a channel info sheet. Rich-card `references` remain the one
message facet with no UI.

Backed end-to-end by the API's `Messaging` and `Assistant` modules — nothing here is mocked. Those
modules reach `Organization` exactly like `Intervention` and `Facility` do: through its inbound
ports (`OrganizationAuthorizationPort`, `OrganizationNotificationPolicyPort`, `TeamDirectoryPort`)
and its published domain types.

## Entry Points

- Routes: `collaboration.routes.ts`, mounted at `/organizations/:organizationId/messages`, and
  `channels.routes.ts`, mounted at `/organizations/:organizationId/channels`
- Public API: `index.ts`
- Bootstrap: `collaboration.feature.ts` (`provideCollaborationFeature()`), wired from `app.config.ts`

`organization.routes.ts` loads the route file **directly**, not through `index.ts`: the barrel also
exports `MessagingSyncCoordinatorService`, which would then travel in this feature's lazy chunk.

The feature owns its pages, and it contributes one shell widget: `DirectMessagesNav`, the
conversation list, goes through `providers/direct-messages-nav` (`withDirectMessagesNav()`) into the
dashboard layout's `sidebarNav` slot, below `withOrganizationNav()`. `organization/providers/index.ts`
re-exports it from this feature's `providers/` folder directly — **not** through this feature's root
`index.ts`, for the same reason `organization.routes.ts` loads `collaboration.routes.ts` directly:
the root barrel also exports `MessagingSyncCoordinatorService`, and `app.routes.ts` wires
`withDirectMessagesNav()` into the eagerly-loaded shell providers, where that service must not travel.
A channel nav, a conversation-header strip and a contextual panel were designed for
`layouts/workspace-layout` once; neither that layout nor those slots exist, and a future contribution
for those still goes through `@shared/layout-slot` and the dashboard layout's own slot tokens.

## Routes

Gated by `organization.messaging.read`, on the parent only — the guard re-runs on an organization
switch, and guarding just the child would leave the list open to a member without messaging access.

| Path                       | Surface                                                              |
| -------------------------- | -------------------------------------------------------------------- |
| `messages`                 | an empty-state placeholder, list in the sidebar                      |
| `messages/saved`           | the reader's saved messages, one list, each item linking to its home |
| `messages/:conversationId` | that direct conversation, list in the sidebar                        |
| `channels`                 | the channel workspace: favorites, then a one-level tree              |
| `channels/:channelId`      | that channel — same thread/composer machinery as a DM page           |

`messages/saved` is declared **before** `messages/:conversationId` — order is what keeps the
literal segment from being swallowed as a conversation id. Its entry point is a fixed row at the
top of `DirectMessagesNav`, where the rest of the messaging surface already lives.

`channels.routes.ts` mirrors `collaboration.routes.ts`: master-detail under one
`organization.messaging.read` guard, the child titled by `channelTitleResolver`. The channels row
in the organization sidebar comes from `organization/navigation` — channels are organization
workspaces, unlike direct messages, which follow the reader and stay in the shell's bottom block.
`ChannelsPage` is the store host; the routed child reaches the same component-scoped
`ChannelsStore` through the outlet's injector, the way `DirectConversationPage` reaches its stores.

**The conversation list lives in the dashboard sidebar (`DirectMessagesNav`), not in these routes.**
It is contributed to the shell's `sidebarNav` slot and stands on every signed-in page, the way a
mail client keeps its mailboxes: conversations follow the reader, not the page. It is gated on an
open organization and on `organization.messaging.read` — **honouring a namespace wildcard**, since
an owner holds `organization.*` and not the leaf grant — and it is the one owner of priming the
conversation list and the member directory, being the only thing on screen for the whole surface.

The cost is deliberate: the list is fetched on the first signed-in page rather than on arrival at
`/messages`. That is what buys an unread count visible from anywhere, and it is one paged request
per organization, deduplicated by `ensureLoaded`.

On a phone the conversation header's back control **opens the sidebar sheet** rather than
navigating up. Going up leads to `messages`, which now holds only a placeholder — the
conversations are in the sheet, so that is where "back to conversations" has to go.

The child suppresses its breadcrumb (`data: { breadcrumb: false }`) because parent route data is
inherited and it would otherwise render "Messages / Messages". The counterpart's name cannot go
there either — resolving it needs the whole conversation list _plus_ the member directory, more than
a title resolver can ask for — so it lives in the conversation's own header.

Saved messages and the channel info panel were rebuilt (2026-08-28) as `state/saved-messages/`
(component-scoped by `SavedMessagesPage` — fresh on every visit, since no event can invalidate a
bookmark added elsewhere) and `state/pinned-messages/` (component-scoped by
`ChannelConversationPage`, loaded when the info sheet opens). The conversation
`activity`/`attachments`/`links` reads remain unconsumed.

`SavedMessagesStore` also resolves each distinct conversation its bookmarks point into
(`GET /conversations/{id}`), because a `MessageOutput` names its conversation only as an IRI and
`isChannel` decides whether an item links to the channel route or the messages route. A
conversation the member can no longer read is skipped; its items still render and fall back to
the direct route — which still opens the thread, since `channelId === conversationId`.

The channel header's actions menu also opens `ChannelInfoSheet` — name, read-only member roster,
and the pinned list with inline unpin. There is no description line because `ChannelOutput`
carries no description field; do not invent one. Unpin controls appear only where the server
would allow them (the pinning member, or `messaging.manage`), and an unpin performed there
reaches the open thread through `pinnedMessagesStoreEvents.unpinned` →
`MessageThreadStore.noteUnpinned`. Roster management stays in the participants sheet.

Channel participant add/remove lives in its own `state/channel-participants/` slice.
Favoriting a channel calls `ConversationService` from the page and
then re-reads through `ChannelsStore.loadOne`, never trusting the write response's fabricated
`isFavorite`/`unreadCount` (see Invariants).

## Offline

`data-access/services/messaging-offline/` owns a **separate** IndexedDB database
(`fireguard-messaging`) built on `core/indexed-db`. It is not the interventions database on
purpose: that one purges every store when the authenticated user changes, and sharing it would let
an intervention-side purge take the member's queued messages with it.

`MessagingOutboxRepository` is policy-free — it stores, orders and counts. `MessagingSyncService`
decides what a failure _means_; `MessagingSyncCoordinatorService` decides _when_ to try. The
coordinator is started from an app initializer, not from the shell route: a message queued
yesterday must not wait for someone to navigate back to its channel.

Replay classification, in one place so it is not re-derived:

| Outcome                 | Meaning                                               | Action                                                    |
| ----------------------- | ----------------------------------------------------- | --------------------------------------------------------- |
| `2xx`                   | sent                                                  | dequeue                                                   |
| `409`                   | the client id was already used — it is already stored | dequeue, **not** an error                                 |
| network / `5xx` / `429` | temporary                                             | leave queued, stop that conversation's chain, retry later |
| other `4xx`             | the server will repeat this rejection                 | mark failed, wait for the member                          |

Operations replay **sequentially per conversation**, and the first temporary failure stops that
conversation only — other conversations keep draining. There is no attempt limit: a queued message
that stops being retried is a message silently lost.

**There is no queue-wide offline indicator.** The chip that used to carry it was a shell
contribution, and its slot went with the layout. What survives is per-message and is the part that
matters: a failed send does not vanish, it becomes a durable outbox row rendered in the thread as
"Not sent" with a retry beside it.

`MessageComposer` clears itself on send for the same reason — the text is preserved as a message,
which is more useful than a restored draft.

**Only replay-safe work may be queued.** Sending qualifies because the client mints the message id;
reactions qualify because the server swallows duplicates. Marking a conversation
read does **not**: the server's upsert has no monotonic guard, so a stale marker replayed later
moves the read pointer backwards.

## Composer and message bodies

`MessageComposer` is a **plain textarea** built with Signal Forms. The rich-text editor it replaces
was 904 lines of Quill integration, and Quill left with the legacy UI strip. Enter sends,
Shift+Enter starts a line, and a composition in progress is left alone — an IME uses Enter to accept
a candidate, and intercepting it would send half a word.

Two consequences of plain text that are easy to undo by accident:

- **The 4000-character ceiling is the domain's, not the DTO's.** `PostMessageInput` advertises
  40 000 and `MessageBody` rejects anything over 4 000, so a longer body passes validation and is
  refused by the handler with a `422`. `MESSAGE_BODY_MAX_LENGTH` is the number that matters.
- **Rendered bodies still need `whitespace-pre-wrap`.** A body is bound as HTML — the API stores it
  that way and sanitized it server-side — so real newlines would otherwise collapse.

**Mentions are text, not a field.** The author writes `@{memberUuid}` inline, the server parses it
into `mentions[]` and leaves the marker in the body — **escaped**: Symfony's sanitizer rewrites every
`@` in a text node to `&#64;`, so a body read back always reads `&#64;{memberUuid}`.
`renderMessageBodyHtml` matches both spellings.

The composer therefore shows names and keeps the pairing: `findMentionQuery` reports the `@…` the
caret sits in, the picked label goes into the draft as `@Name`, and `applyMentionMarkers` rewrites
labels back into markers **on send**. The draft has to stay something a human can read and edit,
which is why the id never appears in front of the author. Two consequences a reviewer must keep:

- **The list takes Enter before the composer does.** With a suggestion highlighted, Enter means
  "that one"; sending instead posts a half-typed name.
- **The map records what was picked, not what the draft still says.** A mention the author has
  since deleted or retyped finds no match on send and is simply dropped.

**Only the conversation's two participants can be mentioned.** The directory holds the whole
organization, but a mention creates an inbox item — offering a third party would notify someone
about a conversation they cannot open. A counterpart the directory has not resolved is not offered
either: a mention must carry a real member id, and the neutral label the header falls back to is not
one.

**`renderMessageBodyHtml` runs on the page, not in the row.** `MessageRow` takes HTML that is
already rendered, so the marker form — this API's, not chat's in general — stops at the page
boundary. An earlier version tokenized the body at each marker and bound the runs separately, which
was safe only while bodies were plain text: a mention inside formatting splits its `<strong>` across
two bindings and the parser auto-closes each half. Substituting the chip in place keeps the document
well-formed whatever surrounds it.

## Presence

Poll-only. Nothing pushes presence — no Mercure topic carries it — and the server keeps it in a
cache that forgets a member after 90 seconds, so `MemberPresenceService` runs two timers: one
announcing us (60 s), one reading the tracked set (45 s). Both stop when the tab is hidden or the
browser is offline, because `POST /presence/ping` allows **6 requests per minute** per user and
organization and a member with four background tabs would otherwise spend the whole budget. A `429`
pauses pinging for three minutes rather than retrying sooner: being limited means other tabs are
already announcing us.

Three server constraints are absorbed by `chunkMemberIds`: `memberIds` must be **bare** UUIDs (the
provider parses IRIs for `organization` only), duplicates are removed **before** the cap is checked,
and the list is split at 100 — exceeding it is a `400`, not a truncation.

The organization is a **parameter**, like everywhere else a root-provided unit needs it:
`ORGANIZATION_CONTEXT_PORT` is bound by the shell route and a root injector cannot see it.

**Typing indicators do not exist and cannot be built client-side.** There is no endpoint, no topic
and no cache key, and the subscriber JWT is minted with `publish: []`, so a browser physically
cannot fan out its own signal. This needs backend work before any UI is worth designing.

## Assistant

**The assistant is summoned from the header, not navigated to.** It has no route and never will:
it opens over whatever page is showing. So its control lives in the shell's header-actions slot
(`withAssistantToggle()`) — nothing in a navigation list, which would promise an address that does
not exist.

**The panel is a sheet at every width, and claims no shell slot.** `AssistantToggle` owns both the
trigger and the right-anchored `hlm-sheet` that carries `AssistantPanel`, so the assistant never
competes with the routed page for width and inherits spartan's backdrop, focus trap and Escape
dismissal instead of reimplementing them. The trigger and the surface sit in one component because
both read the single `panelOpen` signal, which is what keeps `aria-expanded` honest. There is no
`withAssistantPanel()`: the assistant does not contribute to `DASHBOARD_PANEL_SLOT`, which stays
available for a genuinely page-owned panel.

`AssistantStore` is provided by the **dashboard route** (`provideCollaborationAssistant()`), not
root. Root would work — `ORGANIZATION_CONTEXT_PORT` is bound at root by
`provideOrganizationFeature()` in `app.config.ts` — but route scoping keeps the store out of the
auth and error shells, which have no organization and no use for it. The header contribution
resolves from that one environment injector, which is what makes the trigger and the panel's own
close button agree on a single answer.

Its `onInit` calls `resume()`, so a remembered thread is read on the first signed-in page rather
than on panel open. Without a thread cookie that is a no-op; with one it is a single GET, which is
the price of the panel opening on its transcript instead of on a spinner.

The panel covers the page rather than taking a column, so it owns a keyboard exit: Escape closes
it, unless a question is half-written — throwing that away is not what anyone means by Escape.

Four behaviours exist because of gaps in the API, and each will look wrong to anyone who assumes
otherwise:

- **The thread is created on the first question, never on panel open**, and its id is remembered in
  a per-organization cookie. `listAssistantThreads` takes no member filter, so a thread that is not
  remembered is unreachable; and creating one eagerly would leave an empty thread behind on every
  open. A remembered thread that 404s is forgotten silently rather than surfaced as an error.
- **Frames are applied directly to state.** The `body` column stays empty until the reply completes,
  so partial text exists _only_ in the Mercure frames. The refetch-on-frame pattern the message
  thread uses (`§ Realtime`) would read `body: ''` here. Each frame carries the whole accumulated
  body, not a delta.
- **The subscription is re-minted every 10 minutes.** The subscriber token expires at 900s and
  nothing renews it, while `MercureService` reconnects forever without surfacing an error — so a
  panel left open would go quiet with no symptom.
- **A silent generation is reported after 90s.** There is no cancel endpoint, no retry endpoint and
  no server-side deadline: a reply whose worker died stays `streaming` forever. `dismissStalled()` is
  therefore local-only — it marks the turn failed on screen and leaves the row untouched server-side.

Cut deliberately: the model picker and `temperature` (validated against an operator allowlist no
endpoint exposes), thread management (no rename, archive or delete exists), and Markdown rendering
(replies are plain text with preserved whitespace — turning model output into HTML needs a
sanitizing pipeline this app does not have).

Requires the API's `assistant` Messenger worker to be running (`assistant_worker` in the backend's
compose file); without it, questions are accepted and never answered.

## State and Data Access

`data-access/services/` holds the transport boundary, every class extending `HydraApiService`.
`state/` holds one slice per concern. Slices that key rows by id use `withEntities`; single-resource
slices use plain `CallState` fields.

## Published Contracts

`SubjectDiscussion` (`ui/components/subject-discussion/`) is a self-contained, store-owning
widget: `organizationId`, `subjectType`, `subjectId`, `active` and `composerAutoFocus` in,
`dirtyChanged` out. On activation it resolves its own conversation through
`ConversationService.openSubjectThread` (get-or-create, memoized per
`(organization, subjectType, subject)` triple so re-activating the same subject never repeats the
call) and renders `MessageThread` + `MessageComposer` itself. A consumer embeds it inside its own
sheet or panel and supplies the subject's identity; it owns no messaging state and injects nothing
from this feature beyond the component. `dirtyChanged` is the one exception to "nothing out", and
stays consistent with that rule in spirit: it reports whether closing the host overlay right now
would lose something — an unsent draft, or a send still in flight against this component's own
component-scoped `MessageThreadStore` — which is UI state the _consumer's_ overlay needs to gate
its own dismissal on, not messaging state this component resolves for itself.
`features/interventions` is the first consumer to wire it, into its discussion sheet's own
`disableClose` and abandon-confirmation (see that feature's `FEATURE.md`).

**Exported from `ui/components/index.ts`, never from the root `index.ts`.** The root barrel already
carries `MessagingSyncCoordinatorService` for the app initializer that starts it, and
`organization.routes.ts` / `organization/providers/index.ts` both load past the root barrel for
exactly that reason (see Entry Points): a wide root export travels into whatever eagerly-loaded
bundle imports it. `SubjectDiscussion` would land there too — it injects `MessageThreadStore`,
which already depends on `MessagingSyncCoordinatorService` — so it is published through the
concern-level `ui/components` barrel instead, the same public-surface class `ARCHITECTURE.md`
§13.2 sanctions for a barrel scoped below the feature root. This costs a consumer nothing beyond
what it already pays importing `MessageThread`: reaching this barrel at all means rendering a
thread, coordinator included.

Currently consumed by `features/interventions` (its own `FEATURE.md` records the dependency).

## Cross-Feature Dependencies

- Consumes the parent feature's `ORGANIZATION_CONTEXT_PORT` wherever a unit needs the active
  organization as a parameter — `DirectMessagesNav`, presence pinging, the assistant store.
- Consumes `MEMBER_DIRECTORY_PORT` to resolve member ids to names and avatars. It is bound in
  `organization.feature.ts`, so a root-provided store can see it; earlier notes here claiming
  otherwise described a route-scoped binding that no longer exists.
- Consumes `ORGANIZATION_MEMBER_ACCESS_PORT` for the acting member's profile and permissions: to
  decide which messages are the reader's own, and to gate the composer on `messaging.write`, which
  `messaging.read` does not imply.
- Consumes `@features/organization/models` for `ORGANIZATION_PERMISSION` and `MemberDirectoryEntry`,
  and `@features/organization/http/guards` for `organizationPermissionGuard`.
- Consumes `@features/organization/services` for `SubmissionGateService`. `ChannelsStore` shares one
  `mutationCallState` across rename, move and delete, so `ChannelConversationPage`'s delete
  confirmation holds a gate over it rather than reading `isMutating()`/`mutationError()` raw — a
  rename that failed a moment earlier must not surface as the delete's own error.
- May be consumed by a sibling organization subfeature through `SubjectDiscussion`
  (`ui/components`, see Published Contracts above) for its own record's live thread —
  `features/interventions` is the first such consumer. A consumer supplies the subject's identity
  and renders the surface inside its own overlay; it owns no messaging state.

## Invariants reviewers must preserve

These come from the backend contract and are easy to get wrong:

- **Never key an entity off `@id`.** `ChannelOutput` and `ChannelParticipantOutput` are re-normalized
  through the anonymous JSON-LD path, so `@id` is a fresh Skolem genid (`/.well-known/genid/…`) on
  every response and `@type` is the DTO class name. Key off the scalar `id` / `memberId`.
- **Never merge a whole mutation response into an entity.** Write endpoints return fabricated
  derived fields: every channel write returns `unreadCount: 0` and `isFavorite: false`, and
  `ListChannelsProvider` hard-codes `unreadCount: 0` on every row. Patch only what changed, or
  refetch.
- **Omitted, not null.** `skip_null_values` is global, so every nullable field arrives as
  `undefined`. A `=== null` guard lets them all through. The only genuine `null`s are
  `MessageReferenceOutput.label` / `.code`.
- **Presence-based filters.** `isArchived` must be sent only when filtering, and only as a real
  boolean — an empty string coerces to `false` and silently means "unarchived only". Pass
  `undefined` to omit; `buildParams` drops it.
- **Bare ids out, IRIs in — asymmetrically.** You send bare UUIDs (`teamId`, `parentChannelId`,
  `memberId`) and receive IRIs (`team`, `parent`, `createdByMember`), except
  `ChannelParticipantOutput.memberId`, `ConversationOutput.parentConversationId` and
  `MessagingLinkOutput.messageId`, which come back bare.
- **Mercure frames are invalidation signals, not data.** A frame carries six fields where
  `MessageOutput` needs twelve, there is no `GET /api/messages/{id}` to hydrate one,
  `message.created` doubles as the threaded-reply event, and frames emit explicit `null`s where REST
  omits the key. `MessageThreadStore.connect()` therefore coalesces frames and re-reads the newest
  page, upserting so paged-in history survives. The limit is real and unavoidable: a change to a
  message outside the loaded window is not picked up.
- **The subscriber token must be re-minted.** The hub issues it with a 900 s lifetime and
  `MercureService` never renews one: on expiry the socket closes, every reconnection retries with
  the same dead token, and the conversation goes quiet with no visible symptom. `connect()` re-mints
  on a `timer(0, …)`, and the inner `switchMap` reopening the socket is required rather than
  incidental — the token travels in the `EventSource` URL, so a fresh one only takes effect on
  reopen.
- **Reconnecting is when to refetch.** The hub replays nothing — no transport is configured and
  publishers set no update ids — so `Last-Event-ID` resume does not exist here. The store watches
  `MercureService.status()` and catches up when a topic returns to `connected`.
- **The optimistic row keeps its id.** `send` mints the client id, shows the row immediately and
  posts under that id, so the confirmation lands on the same row — nothing to swap, and the Mercure
  echo of one's own message upserts onto it instead of duplicating. A `409` is success.
- **`send` uses `mergeMap`, not `switchMap`.** Two messages in quick succession are two intentions;
  cancelling the first would clear the composer for a message that never left.
- **Never queue a `POST` send.** `POST /conversations/{id}/messages` mints the id server-side, so a
  retry after a lost response creates a second message that nothing can detect. Anything replayable
  must go through `postMessageWithClientId()` → `PUT .../messages/{clientId}` with
  `If-None-Match: *`, and must treat the `409` `/problems/client-resource-already-exists` as
  **success**.
- **A channel _is_ a conversation row.** `createChannel()` persists a `MessagingConversationRecord`
  with the channel's own id, so `channelId === conversationId` and the
  `/api/conversations/{id}/…` reads take the channel id directly. The reverse does not hold:
  `/api/channels/{id}/participants` 404s for a DM or a subject thread.
- **`contentUrl` is not a link.** The download route is bearer-authenticated and forces
  `Content-Disposition: attachment`, so it cannot go in `<img src>`, `<a href>` or `window.open`.
- **The newest messages are on the _last_ page.** `listByConversation` orders `createdAt ASC` from a
  plain offset, so page 1 is the oldest 50. A thread therefore opens on the last page, reads history
  by walking page numbers **down**, and refreshes the last page rather than the first. Re-reading
  page 1 — which is what the store did before this surface existed — means a new message is never
  picked up in any conversation longer than one page. `withEntities` keeps insertion order, so the
  thread renders `sortedMessages`, not the raw collection.
- **`MessageThreadStore` must be `reset()` between conversations.** It is component-scoped, but the
  router reuses the page when only `:conversationId` changes, so `providers: [MessageThreadStore]`
  runs once. Without the reset the previous thread's messages render under the new header for a full
  round trip and its unsent rows keep a Retry that targets the wrong conversation.
- **A send outlives the route change that started it.** `mergeMap` is deliberate, so both handlers
  check the thread is still on the conversation the message was written in. The outbox queue is
  outside that check: the message was written and is owed a delivery wherever the reader has gone.
- **`itemsPerPage` is clamped server-side to 1..100** and pagination must be driven from
  `totalItems`, never from `member.length`.
- Collections use `member` / `totalItems`, matching `ARCHITECTURE.md` §11.7 and
  `core/api/models/hydra-collection.interface.ts`.

## Accessibility decisions worth keeping

These look like they could be simplified. They cannot.

- **The assistant transcript is not a live region.** A reply arrives as ~20 Mercure frames, each
  carrying the whole accumulated answer rather than a delta, so `aria-live` on the container makes a
  screen reader restart the paragraph twenty times. A sibling `role="status"` line announces the
  _state_ — loading, answering, ready, failed — and the transcript stays silently readable.
- **A dot cannot carry its own label.** `aria-label` on a bare `<span>` has no role to attach to and
  most screen readers drop it, so the presence dot and the unread badge were colour-only in practice
  despite looking labelled. The state now lives in `sr-only` text or in the trigger's own name.
- **An avatar image carries `alt=""`.** Without it a picture avatar is announced as its URL, and a
  real `alt` would repeat a name the row already prints. The author's name is adjacent text at every
  call site, so the image is decorative by construction.

**Per-message actions are answerable per row, never per surface** — a control offered to someone
the server will refuse is worse than none. `buildMessageViews` stamps `canEdit` (author only,
holding `messaging.write`) and `canDelete` (author or `messaging.manage`) onto each view, and the
row's menu hides items the server would refuse; the server still re-checks every write, and a
`403` that slips through surfaces inline in the owning dialog. Other decisions in that menu:

- The menu trigger is always in the DOM (revealed on hover/focus-within, always visible on
  touch), so it stays keyboard-reachable; the dropdown itself is spartan's, keyboard and focus
  handled by brain.
- An optimistic (pending/failed) row shows no menu — it has no server id anything could act on.
- A tombstone keeps exactly one item, "View thread", and only when it has replies: the API keeps
  serving a deleted message's replies.
- Menu items disable (`[disabled]`, mirrored to `aria-disabled` by the button) while an
  interaction is in flight, and the edit/delete dialogs busy-lock with `aria-busy` until their
  write settles — the same stay-open-on-failure contract as the channel delete confirm, each
  behind its own `SubmissionGate` so a stale failure never leaks into a freshly opened dialog.

## The conversation surface is spartan, assembled here

`@shared/chat` no longer exists, and it is not coming back: **spartan owns the chat vocabulary.**
The components under `ui/` are compositions of vendored primitives, not new design:

| Surface             | Built from                                                                                                                                                                                                                                      |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MessageRow`        | `hlmMessage` (`align`), `hlmMessageAvatar`, `hlmMessageContent`, `hlmMessageHeader`, `hlmMessageFooter`, `hlmBubble` / `hlmBubbleContent`                                                                                                       |
| `MessageReactions`  | host is `hlmBubbleReactions`; chips are `hlmToggle`; picker is `popover`                                                                                                                                                                        |
| `MessageThread`     | date rules are `hlmMarker` / `hlmMarkerContent`                                                                                                                                                                                                 |
| `MessageComposer`   | card is `input-group` (`hlmInputGroupTextarea` + a `block-end` `hlmInputGroupAddon` + `hlmInputGroupButton`), hint is `hlmKbd`, read-only notice is `hlmAlert`, mention rows are `hlmItem`                                                      |
| `DirectMessagesNav` | rows are `hlmSidebarMenuButton` (icon-rail tooltip, `hlmAvatar` leading element), unread count is `hlmSidebarMenuBadge`, "New message" is `hlmBtn` (`ghost`/`icon-sm`, matching the header's icon buttons), loading is `hlmSidebarMenuSkeleton` |

Anything missing is generated with `npx ng g @spartan-ng/cli:ui <name>` before it is written by
hand — that is the rule, and the first pass at this feature broke it. **The CLI reformats
`tsconfig.json`** (every array expanded to multi-line) on each run: revert it and re-add only the
new `@shared/ui/<name>` path entry.

**Both scrollers are native `overflow-y-auto`, deliberately.** Spartan's `scroll-area` was generated
during this work and then **removed again**, along with the `ngx-scrollbar` dependency it drags in —
a runtime dependency `ARCHITECTURE.md` §1.1 does not list. The thread's scroller could not have used
it anyway: scroll position there is driven imperatively through `scrollTop` on the element. Styling
one pane's scrollbar and not the one beside it would have cost a documented dependency exception to
buy an inconsistency. Re-generating `scroll-area` reinstates the dependency; that is a decision, not
a detail.

**`DirectMessagesNav` has no name filter.** Its predecessor, `DirectConversationList`, filtered the
already-loaded rows client-side over `counterpartName`; the sidebar rail is narrower than that pane
ever was, and a search field belongs beside a scrollable list, not an icon-collapsible one. The list
is still capped at one page — the API pages direct conversations and nothing here asks for another
page — so a name that has not been loaded will not be found either way. Revisit both when paging
arrives.

**One deviation, and it is mechanical rather than visual.** The mention list is a local positioned
overlay: `autocomplete` and `command` bind a combobox to an input's whole value, not to a caret
position inside a multiline draft, and `popover` would pull focus out of the textarea the author is
still typing in. Its rows are `hlmItem` and its surface mirrors `hlm-popover-content` token for
token.

Four decisions in that surface are load-bearing, because spartan covers none of them:

- **The thread owns the only scroller on the page.** The dashboard shell wraps a routed page in an
  `overflow-y-auto` box of its own, so every level between the two declares `min-h-0` and the page
  host declares `overflow-hidden`. One omission and the whole page scrolls, taking the composer with
  it.
- **The composer is projected into the thread, not placed beside it.** It becomes the scroller's
  sticky footer, which is what lets the scrollbar run to the bottom of the pane instead of stopping
  short of the composer — and, because the two then share one content box, what makes them line up
  at every width with no compensation for the scrollbar's gutter.
- **Scroll position is managed in TypeScript because nothing in CSS covers it.** The thread opens at
  the newest message, follows new ones only while the member is already within 64 px of the bottom,
  and holds its place when older history lands above. `overflow-anchor` cannot substitute — Safari
  does not implement it.
- **The read marker moves on `caughtUp`, not on scroll.** The thread reports arriving at the newest
  message; the page moves the marker, and only while the tab is visible. Gating on the event rather
  than the scroll handler is what keeps a Mercure burst from becoming one `PATCH` per frame.

**Reactions live inside the bubble, in spartan's own slot.** `hlmBubbleReactions` floats the cluster
over the bubble's corner and drops its padding once it holds buttons (`has-[button]:p-0`) — it is
built for an interactive cluster, not a passive badge. The component carries it as a host directive
and hides itself rather than rendering an empty pill.

**Reactions are a toggle the store resolves.** A chip reports only which emoji was pressed;
`MessageThreadStore.toggleReaction` decides whether that adds or withdraws, because it holds the
tally the chip was drawn from — asking the row would mean answering the same question twice and
letting the two disagree. The picker offers a short fixed set rather than an emoji keyboard: the API
stores whatever string it is sent, so a wider choice fragments the tallies without adding meaning.
A chip carries a full accessible name (`react with 👍, 3 so far`); neither the emoji nor the count
reads as a control on its own, and colour alone never says whether the reader is part of a tally.

Reacting is gated on `messaging.write`, not on being able to read the conversation. Without it the
existing tallies still render, disabled, and the picker is absent.

Pins, saved messages and threaded replies are rendered since 2026-08-28; **reference cards are
not** — their slice stays pruned. The message actions surface is spartan too: the row menu is
`dropdown-menu`, the edit and delete dialogs are `dialog` / `alert-dialog`, and the reply and
channel-info panels are `sheet`s via `@shared/sheet-side`, exactly like the participants sheet.

The threaded-reply facts that shaped `state/message-replies/` and `MessageReplySheet`:

- `GET /conversations/{id}/messages` excludes replies (`parentMessage IS NULL`), so a thread is a
  second collection read from its parent (`GET /messages/{id}/replies`), and there is no
  `parentMessageId` on the wire — thread membership is only knowable from which list a row came.
- Threading is **single-level**: the server refuses a reply to a reply, which is why reply rows
  carry no menu and no counter of their own.
- Replies are read once at the server's 100-row cap, oldest first. A longer thread truncates at
  its newest end; the parent's `replyCount` still reports the real total. Revisit if real threads
  ever approach the cap.
- A posted reply bumps the parent row's counter through the sheet's `replyPosted` output and
  `MessageThreadStore.noteReplyPosted` — there is no way to refetch one message, and
  `message.created` frames trigger the thread's own newest-page refresh anyway.

Two write responses stay **partially fabricated** and are merged field-by-field, exactly like
reactions: the pin response's `replyCount`/`references` (only `pinnedAt`/`pinnedBy` are taken)
and the save response's (only `isSaved` is taken). The `204` unpin/unsave/delete answers carry no
body at all, so their effects are applied locally — the delete redacts the local row the way the
API's tombstone does (body, mentions, attachments, reactions and references cleared;
`replyCount` and the pin kept).

Realtime already covers pin/edit/delete: `message.pinned`/`unpinned`/`updated`/`deleted` frames
flow through the same coalesce-and-refresh path as `message.created`, within the same limit — a
change outside the loaded newest page is not picked up. Saving is private and publishes no frame;
another client's saved list refreshes only on its next visit (the page reloads per visit for
exactly that reason).

Known gap, deliberately not fixed here: a failed send is only retryable from inside the conversation
it belongs to, so a member who navigates away has no way back to it short of reopening that
conversation. The outbox keeps draining regardless, so nothing is lost — only the retry control is
out of reach.

## Permissions

`organization.messaging.read` gates reading, `.write` posting and editing, `.manage` channel
administration and moderation. `organization.assistant.use` gates the assistant — without it neither
the panel nor its toggle renders.

## Invariants

- See "Invariants reviewers must preserve" above for the full backend-contract list; those are the
  invariants that matter most for this feature and must not regress silently.
- Collaboration owns its own pages under `/organizations/:organizationId/messages`; it must not take
  over shell composition, and a shell contribution goes through `@shared/layout-slot` rather than a
  layout import.
- **No member id ever reaches the screen as a name.** Only the list endpoint reports a counterpart,
  and the directory needs `organization.members.read`, which messaging does not imply. Every
  unresolved case — deep link, conversation past the first page of the list, missing permission —
  renders the same neutral label.
- Only replay-safe operations (message send, reactions) may be queued in the offline
  outbox; read-state mutations (conversation read markers) must never be queued.
- **A mutating confirm dialog stays open, busy-locked, until the write settles.** The channel delete
  confirm mirrors interventions' publish confirmation: it stays open on failure and shows the outcome
  inline, so the operator sees it exactly where they took the action and can retry without reopening
  the dialog, rather than the failure surfacing only as a page-level toast.
- **Conversation pages are the sanctioned full-bleed exception to the Page Grammar**
  (DESIGN.md § Page Grammar). They render no canonical root wrapper, own their 48px in-page
  header (the mobile back button lives there), and register nothing in `#pageActions` — the
  thread-owns-the-scroller layout above requires it. This exception covers the conversation
  pages only; other collaboration surfaces follow the standard page grammar.
- **`ChannelsStore.load` is the sanctioned bounded drain of the Server Rule** (DESIGN.md
  § Collections). `ChannelService.listAll` walks every server page at `itemsPerPage: 100` and
  the store loads the full result in one go; the messaging API has no server-side search for
  channels, so filtering happens in memory over the already-loaded set rather than through the
  server. Do not read this as license to drain an unbounded collection elsewhere.
