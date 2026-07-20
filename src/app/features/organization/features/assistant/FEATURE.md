# Feature: Assistant

## Purpose and ownership

The organization assistant: ask questions about the organization's sites,
equipment and interventions, and read past exchanges.

## Entry point

**No route.** The assistant is a shell panel, contributed by
`withAssistantPanel()` (`providers/panel`) under the id `assistant` and rendered
by `AssistantPanel` (`ui/drawers`). The design kit puts it beside the thread it
answers from, so it opens from the messaging composer's sparkles action rather
than from a destination in the navigation.

The `assistant.use` gate lives on the contribution's `available`, where the
route's `canActivate` used to be.

## Invariants

- **An answer arrives empty and fills in over Mercure.** `AssistantMessage`
  comes back `pending` with `body: ''`, so a renderer must show the wait rather
  than an empty bubble — a blank answer reads as a broken assistant.
- **Incoming messages are upserted by id, never appended.** A streaming answer
  arrives repeatedly under the same id; appending would stack one copy per
  chunk.
- **A second question cannot race the first.** The composer stays disabled while
  any assistant message is `pending` or `streaming`.
- Live updates go through `resilientMercureStream`, never `MercureService`
  directly — see the messaging feature for why.

## State and data access

- `AssistantThreadStore` — threads, the open thread's turns, starting a thread,
  and asking. `startThread` writes the new id into `startCallState`; the panel
  reads `startedThreadId()`, opens it, then calls `clearStartedThread()`.
- `AssistantService` — threads, thread detail, ask, and the Mercure
  subscription.

## Known gap

**The per-organization "assistant enabled" setting is not read.** The panel is
gated on the `assistant.use` permission only, so an organization that switched
the assistant off still sees it. Closing this needs the setting exposed on
`OrganizationSettingsOutput`; until then a permission-holder in a disabled
organization gets a panel whose requests will fail.

Being a panel rather than a route makes this fixable: `available` is a
`computed`, so it can read a setting as easily as a permission — a route's
`canActivate` could only express the latter.

## Not built yet

Deleting threads, and renaming one from the panel.
