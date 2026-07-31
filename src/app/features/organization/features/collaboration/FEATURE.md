# Collaboration

Nested subfeature of `features/organization`, alongside `facilities`, `equipments`,
`inspections` and `interventions` — the same shape those four have: a top-level backend module
whose resources are owned by an organization, so the frontend keeps it under the organization it
belongs to.

## Purpose

Owns the organization's conversational surface: channels, direct conversations, subject threads,
messages and their reactions, pins, saves and attachments, plus presence and the AI assistant.

Backed end-to-end by the API's `Messaging` and `Assistant` modules — nothing here is mocked. Those
modules reach `Organization` exactly like `Intervention` and `Facility` do: through its inbound
ports (`OrganizationAuthorizationPort`, `OrganizationNotificationPolicyPort`, `TeamDirectoryPort`)
and its published domain types.

## Entry Points

- Routes: `collaboration.routes.ts`
- Public API: `index.ts`
- Shell contribution: `collaboration.feature.ts`

Mounted inside the workspace shell under `/organizations/:organizationId` (`channels/:channelId`,
`direct/:conversationId`, `saved`). The feature contributes to the shell rather than owning the
frame:

| Slot                       | Contribution                                                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------------ |
| `SECONDARY_NAV_SLOT`       | `withCollaborationChannelNav()` — favorites and channel sections                                 |
| `CONVERSATION_HEADER_SLOT` | `withCollaborationInfoToggle()`, `withCollaborationAssistantToggle()`, `withMessagingSyncChip()` |
| `PANEL_SLOT`               | `withCollaborationAssistantPanel()` (priority 90), `withCollaborationInfoPanel()` (priority 10)  |

The panel is instantiated by the layout, so it receives no routed input. `ChannelPanelStore` is the
bridge: root-provided, it reads the routed channel off the router and republishes it, and the
contribution's `active` signal is `channelId() !== null` — which is what keeps the panel off the
intervention route, where the page owns its own aside.

Because that store lives in the **root** injector it cannot see `MEMBER_DIRECTORY_PORT`, which the
shell route provides. Member names are therefore resolved by `ChannelInfoPanel`, not by the
store. Moving that lookup back into the store throws `NG0201`.

## Routes

Its own routes, gated by `organization.messaging.read`:

| Path                  | Surface                                                         |
| --------------------- | --------------------------------------------------------------- |
| `channels/:channelId` | the conversation column — a channel id _is_ its conversation id |
| `saved`               | the member's bookmarks across the organization                  |

A message's secondary actions (reply, copy, mark as read, pin/unpin, delete) sit behind one overflow
trigger on the row rather than on its action bar; only the quick reactions and the bookmark stay
one tap away.

Inbox and Drafts are deliberately absent. Nothing honest backs them yet: the channel list provider
hard-codes `unreadCount: 0`, so an inbox derived from it would always be empty, and drafts have no
persistence before the offline layer lands. Ship them with their data, not before.

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

The offline surface is `MessagingSyncChip`, contributed to `CONVERSATION_HEADER_SLOT` — the only
shell slot that exists. A full-width banner would need a new layout slot. It renders **nothing**
while everything is fine: a permanent indicator that usually reads "fine" trains people to stop
reading it.

`MessageComposer` still clears its draft on send, and that is now safe: a failed send does not
vanish, it becomes a durable outbox row rendered in the thread as "Not sent" with a retry. The text
is preserved as a message, which is more useful than a restored draft.

**Only replay-safe work may be queued.** Sending qualifies because the client mints the message id;
reactions, pins and saves qualify because the server swallows duplicates. Marking a conversation
read does **not**: the server's upsert has no monotonic guard, so a stale marker replayed later
moves the read pointer backwards.

## Composer and message bodies

`MessageComposer` is a PrimeNG (Quill) editor, like `CommentComposer` on the intervention side.
`POST /messages` stores rich text sanitized against `messaging.message` in the API's
`config/packages/html_sanitizer.yaml`, and the editor's `getSemanticHTML()` output maps onto that
allow-list directly — `<strong> <em> <u> <s> <ul>/<ol>/<li> <blockquote> <pre> <a href>`.

Four things about that editor are not obvious and are easy to undo by accident:

- **The toolbar may only offer marks that survive the round trip.** The allow-list keeps no
  attribute but `a[href]`, so alignment, indentation, colour and syntax language — everything Quill
  expresses through a `class` or a `data-` attribute — are dropped on the way in. Adding such a
  button gives the member a control that silently does nothing. What is offered has been checked
  against the stored result, including the code block, which arrives as
  `<pre data-language="plain">` and keeps its `<pre>`.
- **`getSemanticHTML()` encodes every space as `&nbsp;`**, not just runs of them.
  `normalizeEditorHtml` undoes it before anything else touches the body. Left alone it breaks two
  things at once: a stored message never wraps, and a mention label of more than one word stops
  matching its entry and is never substituted for its marker.
- **Enter is taken from the editor in the capture phase**, by a listener on the composer's own host.
  Quill installs its own `keydown` handler on the editor root and bails on `event.defaultPrevented`,
  so running first is all it takes — but a template `(keydown)` bubbles, and by then the line break
  is already in. The same listener is what drives the mention list.
- **The 4000-character ceiling is measured on the serialized HTML**, because that is what the domain
  validates, and a contenteditable has no `maxlength` to lean on. `canSend` and the counter both
  read the body that will actually be posted.

**Mentions are text, not a field.** The author writes `@{memberUuid}` inline, the server parses it
into `mentions[]` and leaves the marker in the body — **escaped**. Symfony's sanitizer rewrites
every `@` in a text node to `&#64;`, so a body read back from the API always reads
`&#64;{memberUuid}`; `renderMessageBodyHtml` matches both spellings, and only the escaped one ever
occurs in practice. The composer therefore shows `@Name` and keeps
a label → id map, substituting markers back on send (`applyMentionMarkers`). Labels are substituted
longest-first, and a name already used for someone else in the same draft gets a short id suffix —
without that, two members sharing a display name would silently mention the wrong one.

Candidates come from `MEMBER_DIRECTORY_PORT`, resolved by the **page** and passed in: the composer
is presentational, and the port is route-provided behind `organization.members.read`. Without that
permission the list is simply empty — a working composer with no suggestions, never an error.

`ChatMessageBody` (`@shared/chat`) renders the body in **one** binding, and takes HTML that is
**already rendered**: `MessageRow` applies `renderMessageBodyHtml` before handing it over, because
the marker form is this API's — the sanitizer rewrites every `@` — and a generic chat primitive
must not inherit one backend's serialization. An earlier version tokenized the body at each marker
and bound the runs separately, which was safe only while bodies were plain text: a mention inside
formatting splits its `<strong>` across two bindings and the parser auto-closes each half.
`renderMessageBodyHtml` substitutes the chip in place instead. The rich-text skin is a set of
descendant rules on that element, for the same reason the chip's class is applied there — the
stored HTML carries no classes of its own.

The pages pass one `mentionNames` map for the whole thread, the directory underneath and the
messages' own names on top. The messages' names are authoritative, but the optimistic row of a
message just sent carries none, and its chips would read "member" until the server echoed back.

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

`AssistantStore` is provided by the **shell route**, not root: it reads the organization through
`ORGANIZATION_CONTEXT_PORT` (a route binding) and both slot contributions resolve from that same
environment injector. Root would throw `NG0201` on the port.

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

## Cross-Feature Dependencies

- Consumes the parent feature's `ORGANIZATION_CONTEXT_PORT` (bound by the shell route) wherever a
  root-provided unit needs the active organization as a parameter — for example presence pinging
  and the assistant store. The port is kept rather than replaced by a direct store import even
  though nesting would now allow one: the slot contributions below are instantiated by
  `workspace-layout`, and `ARCHITECTURE.md` §4 forbids a layout from injecting a feature store.
- Consumes `MEMBER_DIRECTORY_PORT` (provided by the shell route) to resolve member ids to
  names/avatars; a root-provided store cannot see it, which is why member-name resolution lives in
  `ChannelInfoPanel` rather than in `ChannelPanelStore`.
- Contributes to `workspace-layout` shell slots (`SECONDARY_NAV_SLOT`, `CONVERSATION_HEADER_SLOT`,
  `PANEL_SLOT`) instead of owning the shell frame.

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
  omits the key. `MessageThreadStore.connect()` therefore coalesces frames and re-reads page 1,
  upserting so paged-in history survives. The limit is real and unavoidable: a change to a message
  that has fallen off page 1 is not picked up.
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
- **`/api/saved-messages` wants the organization as an IRI.** Every other collection accepts the
  bare UUID; this one rejects it.
- **A channel _is_ a conversation row.** `createChannel()` persists a `MessagingConversationRecord`
  with the channel's own id, so `channelId === conversationId` and the four
  `/api/conversations/{id}/…` panel reads take the channel id directly. The reverse does not hold:
  `/api/channels/{id}/participants` 404s for a DM or a subject thread.
- **The activity endpoint sends counts, not levels.** The four-step heatmap ramp is a client
  decision (`buildActivityCells`), graded against the busiest day in the window. The counts include
  threaded replies and tombstoned messages, so the strip's total will not match the visible message
  count.
- **Deleting a message cleans up nothing.** Its links stay in the Links tab, its files in the Files
  tab, and it stays pinned — redacted. Render a tombstone placeholder; never assume `body` exists.
- **`contentUrl` is not a link.** The download route is bearer-authenticated and forces
  `Content-Disposition: attachment`, so it cannot go in `<img src>`, `<a href>` or `window.open`.
  The Files tab lists metadata only.
- **`MessagingLinkOutput.label` is never populated** and `ConversationAttachmentOutput.revision` is
  always `1` on the list — the factory behind it never assigns the real value.
- **Page 1 replaces, later pages append.** Message and bookmark lists arrive oldest-first, so
  history is a _further_ page. A page-1 read is a fresh load or a conversation switch and must reset
  the collection — appending it would leave the previous conversation's rows on screen.
- **`itemsPerPage` is clamped server-side to 1..100** and pagination must be driven from
  `totalItems`, never from `member.length`.
- Collections use `member` / `totalItems`, matching `ARCHITECTURE.md` §11.7 and
  `core/api/models/hydra-collection.interface.ts`.

## Accessibility decisions worth keeping

Four of these look like they could be simplified. They cannot.

- **The assistant transcript is not a live region.** A reply arrives as ~20 Mercure frames, each
  carrying the whole accumulated answer rather than a delta, so `aria-live` on the container makes a
  screen reader restart the paragraph twenty times. A sibling `role="status"` line announces the
  _state_ — loading, answering, ready, failed — and the transcript stays silently readable.
- **A status region has to exist before it fires.** `message-row`'s "Not sent" line is mounted
  unconditionally and hidden with a class, because a `role="status"` inserted at the same instant as
  its text is a region the screen reader has never seen, and the announcement is lost.
- **A dot cannot carry its own label.** `aria-label` on a bare `<span>` has no role to attach to and
  most screen readers drop it, so the presence dot and the unread badge were colour-only in practice
  despite looking labelled. The state now lives in `sr-only` text or in the trigger's own name.
- **Avatars are `aria-hidden`.** PrimeNG's `p-avatar` renders an `<img>` with no `alt` attribute at
  all, so an image avatar was announced as its URL. The author's name is adjacent text in every
  call site.

`@shared/chat`'s `ChatMessage` takes `canReact` / `canPin` / `canSave` / `canReply` / `canCopy` /
`canMarkRead` for the same class of reason: the saved-messages page can only unsave and copy, so
leaving the rest mounted put focusable controls per row in the tab order that silently did nothing.

`canDelete` is answered **twice**, and both answers must be yes. The view-model's `canDelete` says
whether the _reader_ may delete this message — the API allows the author or a holder of
`organization.messaging.manage`, and only the consumer can decide that, which the pages feed in
through the adapter's `actingMember` and `canModerate` options. The `canDelete` **input** is the
surface's veto over that: the reply panel's root message is deletable in principle but has nowhere
to send the event, so it turns the input off. The input never grants; it only withholds. Both
mirror, and neither replaces, the server's own check.

## The conversation surface comes from `@shared/chat`

`ChatThread` owns the scroller, the date rules, the empty/loading/error states and the "load older"
affordance; `ChatMessage` owns a row. This feature supplies data and receives events — including
`loadMore`, because how many pages there are is this feature's arithmetic, not the thread's.
`data-access/adapters/chat-message.adapter.ts` is the whole boundary: it projects `MessageOutput`
onto `ChatMessageItem`, and everything the chat concept must not know stops there — the mention
marker form, the author IRI, and the fact that delivery state is tracked as id lists rather than
per message.

Both conversation pages are now the same three things: a thread, a composer, and (for a direct
conversation) a counterpart header. **Every label is passed in**, because the two name themselves
differently — `@@workspace.thread.aria` "Conversation" against `@@workspace.direct.thread.aria`
"Direct conversation" — and a shared concept can own neither string.

Three consequences worth keeping:

- **Reference cards reach a row through a template, not a field.** Their four types are this
  domain's, so `<ng-template appChatMessageExtra let-message>` renders them from `message.data`,
  which is the message itself round-tripped untouched.
- **Body rendering is memoized in two stages.** Turning mention markers into chips is a regex over
  every body; sending a message touches the store's in-flight ids. Folded into one computed, every
  send would re-render the mentions of the whole loaded thread — hence `baseMessages` (the regex)
  and `chatMessages` (delivery state only) in both conversation pages.
- **The composer is projected into the thread, not placed beside it.** It becomes the scroller's
  sticky footer, which is what lets the scrollbar run to the bottom of the pane instead of stopping
  short of the composer — and, because the two then share one content box, what makes them line up
  at every width with no compensation for the scrollbar's gutter.

## Threaded replies live in their own store and their own panel

`GET /conversations/{id}/messages` **excludes replies** (`parentMessage IS NULL` in the repository),
so a reply is not a row `MessageThreadStore` will ever hand back. It is a second collection, read
from its parent — which is why `MessageRepliesStore` exists beside the thread rather than inside it,
and why `MessageThreadDrawer` is a panel over the conversation rather than an inline expansion.

Threading is single-level: the API refuses a reply to a reply, so nothing recurses.

Two consequences:

- **A reply has no optimistic row.** `POST /messages/{id}/replies` mints the id server-side, unlike
  the thread's client-id send, so an optimistic reply could not be reconciled with the confirmed one
  and would appear twice.
- **The parent's `replyCount` is bumped through an event, not a refetch.** `MessageRepliesStore`
  emits `posted`, and `MessageThreadStore` increments the parent in place — `refresh()` only re-reads
  page 1, and a parent the member scrolled back to is not on it. There is no
  `GET /api/messages/{id}` to refetch one message with.

Known gaps, deliberately not fixed here because both need a new shell region rather than a finition
edit: `MessagingSyncChip` lives in `CONVERSATION_HEADER_SLOT`, which is inside `<main>`, so it is
invisible while a phone is on the channel-list pane; and a failed send is only retryable from inside
the channel it belongs to, so "2 not sent" is a dead end once the member has navigated away.

## Permissions

`organization.messaging.read` gates reading, `.write` posting and editing, `.manage` channel
administration and moderation. `organization.assistant.use` gates the assistant — without it neither
the panel nor its toggle renders.

## Invariants

- See "Invariants reviewers must preserve" above for the full backend-contract list; those are the
  invariants that matter most for this feature and must not regress silently.
- Collaboration contributes to the workspace shell through published slots; it must not take over
  shell composition or route ownership from `layouts/workspace-layout`.
- Only replay-safe operations (message send, reactions, pins, saves) may be queued in the offline
  outbox; read-state mutations (conversation read markers) must never be queued.
