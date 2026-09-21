# Organization webhooks

Owns `/organizations/:organizationId/integrations/webhooks`: subscriptions, event selection,
one-time signing secrets, tests and delivery history. The `integrations` URL segment groups
organization integrations; it does not introduce a second owner or data loading path.

Read and manage grants are independent. The route requires `WEBHOOKS_READ`; management controls
require `WEBHOOKS_MANAGE`. The backend authorizes every action and destination. Forms submit
changed fields only and use the server event catalog. Delivery totals and outcomes come from
server pages; an accepted test or redelivery remains queued until a later read confirms it.

The page owns a route-scoped SignalStore, typed mutation feedback and browser-only reads.
Organization changes cancel obsolete reads and fence writes; old results never reveal secrets
in a new scope. Plaintext secrets exist only in a transient event and local dialog state and
are discarded on close, navigation or scope change. They never enter entity state, TransferState,
URLs or browser storage. A lost secret response requires explicit rotation, never automatic retry.

Public scope is the lazy route tree; models/data-access/state barrels are internal to this
subfeature. Organization context and permissions use the parent's published APIs. Native sheets
adapt to the shared interaction mode; destructive changes require an alert dialog.
