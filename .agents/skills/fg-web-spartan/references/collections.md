# Tables and collection dataviews

Read ARCHITECTURE.md §10.3. `ui/tables/` renders tabular entity grids;
`ui/dataviews/` renders scannable card/list browsing. Both receive collection state and emit
paging, sorting, filtering, selection and action events; neither injects a feature store or API.

Helm table primitives provide styling. Own sorting/grouping/selection semantics explicitly:
sort buttons and aria-sort, expanded group controls, real links for row navigation and separate
interactive action targets. Keep the page/store responsible for server-query state and mutations.

Preserve total/page semantics, stable entity identity and selection behavior when data refreshes.
Represent loading, empty, filtered-empty and recoverable errors distinctly. Do not derive a
server-wide total from a visible page or imply a bulk action applies to unloaded rows.

Use the project collection/filter contracts and native primitives; avoid a generic data-grid
abstraction without proven consumers. Read the overlay reference when filtering uses drawers.
Test emitted event payloads and state rendering, then inspect the affected desktop/mobile
surface with long values and relevant scroll/focus behavior.
