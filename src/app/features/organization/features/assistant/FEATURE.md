# Feature: Assistant

## Purpose and ownership

The organization assistant: ask questions about the organization's sites,
equipment and interventions, and read past exchanges.

## Route entry points

| URL           | Component       | Guard                                          |
| ------------- | --------------- | ---------------------------------------------- |
| `…/assistant` | `AssistantPage` | `organizationPermissionGuard([ASSISTANT_USE])` |

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

- `AssistantThreadStore` — component-scoped: threads, the open thread's turns,
  and asking.
- `AssistantService` — threads, thread detail, ask, and the Mercure
  subscription.

## Known gap

**The per-organization "assistant enabled" setting is not read.** The route is
gated on the `assistant.use` permission only, so an organization that switched
the assistant off still sees the page. Closing this needs the setting exposed on
`OrganizationSettingsOutput`; until then a permission-holder in a disabled
organization gets a page whose requests will fail.

This is also why the refonte plan wanted the assistant as a _panel_ rather than
a route: a route can only express permissions, and availability here depends on
a setting too.

## Not built yet

Creating a thread (the page only opens existing ones) and deleting threads.
