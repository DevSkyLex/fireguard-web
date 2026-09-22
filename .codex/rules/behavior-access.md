# Behavioral services, access and persistence

Read ARCHITECTURE.md §10.7–§10.8 and select the corresponding `fg-web-service` reference.
Transport and IndexedDB repositories belong to `data-access/services/`; workflow/device/sync
coordination belongs to `services/`; permission projections belong to `access/services/`.

Keep access helpers thin and read-only over owner state. Unknown access is not a grant.
Respect the FEATURE.md contract for session loss, organization changes, retries and offline
conflicts. Helpers do not invent backend permissions or duplicate transport.

Concrete service registration follows §10.14: root `@Service()`, or `autoProvided: false`
when deliberately supplied by a provider. A documented exception must remain visible.
