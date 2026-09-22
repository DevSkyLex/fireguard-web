# Offline persistence and replay

Read ARCHITECTURE.md §10.7 and the feature's offline contract first. Interventions and
collaboration have different databases and lifecycles; never copy one feature's queue semantics
into another without its contract.

IndexedDB databases/repositories/outboxes live in `data-access/services/<concern>-offline/`.
Sync, publication and device lifecycle coordination live in feature `services/`.
Transport remains in Hydra services; stores own view/query state.

Preserve durable identity, owner/session/organization isolation, accepted command revisions and
the documented replay order. Retry must not bypass conflict review or duplicate a committed
operation. Retain draft/local intent on recoverable writes and device-persistence failures.
Do not equate browser connectivity with server reachability or global resource availability.

Test persistence failure, reload/replay, duplicate acknowledgment and relevant conflict/race
boundaries with controlled dependencies. Browser offline flows require the feature's real
IndexedDB harness and explicit evidence limits. State any storage/migration compatibility
requirement before changing a database schema; never clear a user queue to make a test pass.
