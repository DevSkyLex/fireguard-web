# Maintenance costs

Organization-owned private operational finance. The feature publishes its `models`, `data-access`,
`state` and route tree `MAINTENANCE_COST_ROUTES`; Intervention may link to
`/organizations/:organizationId/maintenance-costs?interventionId=...` without embedding financial data.

`organization.maintenance_cost.read` gates browser reads and page visibility. Management additionally
requires `.manage`; no financial request or payload enters SSR or TransferState. Route-scoped state
uses Auth's public `AUTH_SESSION_PORT` revision to cancel superseded reads, clear private data and
ignore late replies after scope/session changes. Accepted writes remain serialized and their replies
cannot populate another session. Currency and rates load only when the settings surface opens.

Amounts remain exact decimal strings, including unknown/null values; display groups integer digits
without conversion to floating point. Current realized facts and the immutable private closure
snapshot remain separate. Financial planning uses its own revision, beginning at zero, and honors
the server's `planningEditable` capability. A stale draft is retained until the user explicitly
accepts the newly read planning revision. Expenses and rate retries keep the original identity and
payload after an uncertain response; adjustments reference the original expense.

Forms are native Spartan Signal Forms and emit intent, while the page owns orchestration. The
feature consumes Organization's public permission service, member transport/helper and regional
formatting port. Member names/pickers load only with `organization.members.read`; missing names
never turn into editable UUID fields. The ordinary intervention dossier/PDF remains outside finance.

The read-only `/maintenance-costs/reports` route owns economic pilotage by equipment, site or customer.
Dedicated financial transport returns exact full-filter totals and server-paginated allocation rows;
an oversized query is explicitly refused and never shown as a partial total. Each source fact is
counted once. Unknown valuations, missing historical snapshots and unallocated global work remain
explicit; global budgets and resource estimates are independent metrics. Current realized facts,
private immutable closure facts and their exact forecast variance retain separate columns.
The inclusive UTC date window selects publications by their immutable publication instant and open
work by planned start or creation when no start is set; it includes those dossiers' full current facts.
The source bound applies to the complete organization's date window before allocation filters,
including directly assigned material facts outside operational tasks. Oversized windows require
shorter dates; named filters cannot lift this bound. Estimated resources supply planned cost when
present, otherwise the global dossier budget supplies its forecast without adding both metrics.

The minimal financial dossier directory is server-paginated and searchable, available with
`organization.maintenance_cost.read` alone. Its named site, customer and equipment selections
replace report scopes without contacting ordinary operational directories. Allocation source
navigation uses the report's exact bounded source identifiers and minimum names. Neither directory
contacts nor operational edit capabilities enter this contract. Closed secondary directory data
loads only after disclosure. Procurement uses an organization-wide order-creation date window and
the selected orders' full receipt/return histories, independently of target filters; those totals
never add to consumed-parts costs. Private queries and source names are absent from SSR/TransferState
and are cleared with drafts at organization/session replacement.
