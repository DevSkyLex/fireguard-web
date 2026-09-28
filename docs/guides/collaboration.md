# Collaboration and realtime messaging

Direct conversations and organization channels share message infrastructure. Receipt semantics are based on acknowledged browser activity, not API persistence alone.

**Authoritative references:** [Collaboration](../../src/app/features/organization/features/collaboration/FEATURE.md) · [Organization](../../src/app/features/organization/FEATURE.md).

## Durable messages and receipts

The sender receives a persistence confirmation first. A different browser loads the message before acknowledging delivery, and advances its read position only after the visible thread catches up.


Sent means a confirmed server message. Received requires an acknowledgement from
another member's browser after loading it. Seen requires the read position to pass
the message. Channels display counts of current participants; missing acknowledgements
never become fabricated receipts. Subject threads do not display these indicators.

## Ephemeral activity

Typing uses short-lived private Mercure activity containing the acting member and
expiry, without draft text. Expiry, visibility and connection lifecycle stop stale
indicators. Organization/member authorization applies to subscription and activity.
Presence preferences belong to the account/User boundary; invisible users are
projected as offline without exposing their private preference.

## Reconnect and offline

Realtime frames invalidate authorized reads. Reload durable receipt positions on
opening or reconnecting. Only replay-safe sends/reactions enter the offline outbox;
read markers are never queued. Preserve client identities and drafts through failure.
Late reads and local-storage restoration are fenced by account and conversation.

## Conversation composition reference

The owner contract is [The conversation surface is spartan, assembled here](../../src/app/features/organization/features/collaboration/FEATURE.md). The reference below was
reviewed against the 2026-09-28 source baseline. Numbered delivery phases,
retired designs and measured bundle sizes describe that implementation history;
the current owner contract and code determine present behavior.

<details>
<summary>Implementation details and decision history</summary>

`@shared/chat` no longer exists, and it is not coming back: **spartan owns the chat vocabulary.**
The components under `ui/` are compositions of vendored primitives, not new design:
Sent message bubbles use white fill and black text in both themes, with a neutral outline
in light mode. Deleted-message and delivery-state treatments remain independent.

| Surface               | Built from                                                                                                                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `MessageRow`          | `hlmMessage` (`align`), `hlmMessageAvatar`, `hlmMessageContent`, `hlmMessageHeader`, `hlmMessageFooter`, `hlmBubble` / `hlmBubbleContent`                                                  |
| `MessageReactions`    | host is `hlmBubbleReactions`; chips are `hlmToggle`; picker is `popover`                                                                                                                   |
| `MessageThread`       | date rules are `hlmMarker` / `hlmMarkerContent`                                                                                                                                            |
| `MessageComposer`     | card is `input-group` (`hlmInputGroupTextarea` + a `block-end` `hlmInputGroupAddon` + `hlmInputGroupButton`), hint is `hlmKbd`, read-only notice is `hlmAlert`, mention rows are `hlmItem` |
| `CollaborationNav`    | two `hlmSidebarMenuButton` links with native icon-rail tooltips                                                                                                                            |
| `ChannelsPanel`       | `hlmItem` links, `hlmInputGroup` search, `hlmCollapsible` sections, neutral unread badges and the existing channel creation sheet                                                          |
| `DirectMessagesPanel` | `hlmInputGroup` search, `hlmItem` links, `hlmAvatar`, `hlmBadge` unread counts, `hlmBtn` actions and `hlmSkeleton` loading rows                                                            |

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

**The panel filters loaded counterpart names locally**, ignoring case and accents. The existing
store loads one API page, so filtering does not search unloaded conversations or message bodies.
Rows use the real last-message timestamp and unread count; the API exposes no last-message body
preview here. Do not fabricate previews, presence or member names, or issue one thread request
per list row to imitate those fields.

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

</details>
