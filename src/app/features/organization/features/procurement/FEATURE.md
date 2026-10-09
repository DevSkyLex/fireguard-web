# Procurement Feature

Procurement owns the internal supplier directory, purchase drafts and lifecycle, physical
receipts, motivated returns, and explicit individualization of received equipment into reserve.
Commercial quotations, taxes, invoices and payments remain in the ERP.

Its route subtree is `/organizations/:organizationId/procurement`. One organization-scoped
workspace provides Suppliers, Orders and Receipts views. Authenticated and picker reads start
in the browser or on user action; no broad response is serialized for SSR.

Quantities and internal unit costs stay exact decimal strings with six fractional digits.
The server owns currency, quantities still awaiting delivery, statuses and permissible transitions.
Cost fields require financial permissions independently from procurement rights; absence and
unknown cost remain distinct. Equipment receipts never become quantitative inventory stock.

All existing-record writes send the displayed `If-Match: "revision-N"`. Receipt, return and
individualization commands retain their operation UUID and payload across failures and retry the
same physical declaration. Accepted writes are not canceled by navigation; late results cannot
populate another organization. Conflicts preserve the user's draft and require explicit review.
Supplier and purchase draft creations always send an operation UUID. Failed identical creations
retain it; success or a changed draft after a confirmed rejection starts a fresh operation.
A lost response retains the original creation payload until its result is recovered.
Clearing a purchase selection cancels its detail, receipt and return reads, so late responses
cannot restore the cleared context. Pending or uncertain physical commands still block clearing.
A received quantity remains retained while individualization is blocked, and reserve equipment is
created only after explicit confirmation.

Forms own native Signal Forms state and emit validated commands; the page orchestrates navigation
and writes through the route-scoped SignalStore. Collections remain server-paginated. Supplier browsing
uses explicit active, archived and all filters; all sends archived=all while purchase pickers remain active-only.

Public contracts are the transport DTOs in `models` and `ProcurementService` in `data-access`.
There is no root feature barrel and no external portal or cross-organization supplier sharing.

Approved dependencies: organization access/models/ports; Equipment's public catalogue; Inventory's
public models/data-access and part/warehouse picker components. Cross-feature access uses their
published barrels only. Procurement does not mutate either owner's store or domain records directly.
