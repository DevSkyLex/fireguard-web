# Maintenance exports

Maintenance exports owns immutable, versioned CSV/JSON prestation archives and their external
resource reference mappings. Export generation and an operator-confirmed external import are
distinct server states. Commercial quotations, invoices, taxes and payments remain in the ERP.

The route tree is `/organizations/:organizationId/maintenance-exports`, publicly composed through
`MAINTENANCE_EXPORT_ROUTES`. Published dossier choices are server-paginated and retain their
publication-time customer/site identities. A missing historical snapshot blocks selection explicitly.
External references are picked from readable owner directories, never entered as arbitrary UUIDs.
Customer choices explicitly browse active or archived server pages under the same Customer read grant.
A historical archived customer remains mappable without restoring it; changing directory pages or status
retains the chosen stable identity and reviewed mapping draft, with no customer contacts projected.

The route-scoped SignalStore owns Hydra transport, named request states, optimistic revisions,
exact operation replay and authenticated organization/session fences. Reads are browser-only;
no private archive, reference or financial response enters TransferState or SSR HTML.
Accepted writes survive navigation while late results cannot populate another session or scope.
Uncertain operations retain their exact UUID, revision and body until recovery. Confirmed conflicts
keep the draft and require explicit source review before a new command is accepted.

Forms own Signal Forms state and emit intents only. Native sheets stay open during writes and
failures. Downloads return retained server bytes; the browser never rebuilds a file. Adjustments
append a linked archive and preserve every predecessor. Internal costs additionally require the
independent financial read permission for creation, detail and download.

Approved dependencies: organization access/models/ports and services/browser-download;
auth session port; Customer, Facility and Equipment public data-access/models for scoped
external-reference directory choices. Owner directory reads respect their separate permissions.

Public concern APIs are models, data-access MaintenanceExportService and state MaintenanceExportStore.
No root barrel, portal, external send, automatic import claim or commercial invoicing is introduced.
