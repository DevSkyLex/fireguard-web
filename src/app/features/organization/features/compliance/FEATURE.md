# Feature: Compliance

## Purpose and ownership

The organization's **compliance register**: a KPI strip plus three read-only
listings — Inspections, Non-conformities, Checklists — that let a compliance
owner see where the organization stands without leaving the page.

Nested under `organization` because both the URL and the ownership are
nested: the register only exists inside an organization, and every figure it
shows is organization-scoped.

## Route entry points

| URL            | Component        | Guard                                            |
| -------------- | ---------------- | ------------------------------------------------ |
| `…/compliance` | `CompliancePage` | `organizationPermissionGuard([COMPLIANCE_READ])` |

The three tabs are `?tab=inspections\|non-conformities\|checklists`, not
child routes: no tab has a workflow of its own that would need its own guard
or resolver, and a query param keeps the default tab off the URL. A tab that
ever grows a distinct write workflow must become a real child route instead,
because `canActivate` does not re-run on a query-param change.

## Invariants

- **Additive, never a replacement for `/inspections`.** The page's own route
  guard is `organization.compliance.read`, a different permission from
  `organization.inspection.read`. Redirecting inspections here would lock out
  every member holding only the inspection permission.
- **A second permission gates three of the four tabs/cards.** The Inspections,
  Non-conformities, and Checklists tabs, and the "Inspections in review" /
  "Checklist templates" KPI cards, all read from endpoints gated on
  `organization.inspection.read` — not the page's own `compliance.read`. A
  member with `compliance.read` alone must not see those tabs fire a request
  that 403s; `CompliancePage.canViewInspectionData` gates both the KPI values
  (rendered as an em dash) and the tab bodies (an inline restricted-access
  message replaces the table so it never mounts and never queries).
- **`complianceRate === null` is not `0`.** The backend returns it undefined
  when a site tracks no scheduled equipment, and says so explicitly:
  "undefined, NOT 0%". The KPI strip renders an em dash there, same as the
  parent dashboard's card.
- **The `totals` map is loosely typed by the API** (`int|float|null`), so it
  is read through `adaptComplianceTotals` rather than probed in `computed`
  blocks (ARCHITECTURE §17.6).
- **"Inspections in review" means `status === 'submitted'`** (awaiting
  closure), counted by a dedicated query
  (`ComplianceInspectionsReviewCountStore`, `itemsPerPage: 1`) rather than
  read off the Inspections tab's own paginated, user-filterable query — the
  two are different query concerns (ARCHITECTURE §9.7).
- **"Checklist templates" reflects the Checklists tab's current total**, not
  a fixed "active only" count: it is `ChecklistsTableStore.queryData()
?.totalItems`, so changing the tab's own sort does not change the number,
  but a future status filter on that tab would. Documented here rather than
  hidden — see "Not built yet".
- **`Ref` on the Inspections and Non-conformities tabs is not a backend
  reference code.** `InspectionOutput` and `NonConformityOutput` expose no
  such field; both tables fall back to a shortened id (`#`+first 8 chars),
  uniformly — the Non-conformities tab no longer substitutes
  `equipmentSerialNumber` there, since that duplicated the `Equipment`
  column verbatim. The Checklists tab differs: `ChecklistOutput.referenceCode`
  is a real backend field, so its `Ref` only falls back to the shortened id
  for checklists created before that field existed.
- **`Checklist` is the only server-sortable column on the Checklists tab.**
  The backend's checklist listing accepts `order[name|version|status
|createdAt]`; neither `updatedAt` nor `itemCount` is in that list, so
  `Items` and `Last updated` render without a sort affordance.

## State and data access

- `ComplianceSummaryStore` — component-scoped, one query (`withQueryState`).
  Backs the compliance-rate and open-non-conformities KPI cards.
  `ComplianceService.getSummary` — `GET /organizations/{orgId}/compliance`.
- `ComplianceInspectionsTableStore` — Inspections tab. Calls the
  `inspections` feature's public `InspectionService.list`.
- `ComplianceNonConformitiesTableStore` — Non-conformities tab, across every
  inspection of the organization. Calls the `inspections` feature's public
  `InspectionService.listOrganizationNonConformities` (`GET
/organizations/{orgId}/non-conformities`).
- `ComplianceChecklistsTableStore` — Checklists tab, loaded eagerly
  regardless of the active tab because its total also feeds the KPI strip.
  Calls the `checklists` feature's public `ChecklistService.list`.
- `ComplianceInspectionsReviewCountStore` — "Inspections in review" KPI only;
  see the invariant above.

All four table/KPI stores are `withQueryState`, single-query, component-scoped
under `CompliancePage`. None is part of this feature's public `state/index.ts`
barrel — they are page-internal and imported from their own slice folders.

## Published API

- `state/index.ts` — `ComplianceSummaryStore` (+ `ComplianceSummaryStoreType`)
  only. The four table/KPI stores are page-internal (see above).
- `models/index.ts` — `ComplianceFacilityRow`, `ComplianceSummaryOutput`,
  `ComplianceTotals`.

These two barrels are the only entry points for consumers outside this
feature. The approved external consumer is the **parent `organization`
feature**: its overview dashboard instantiates `ComplianceSummaryStore`
(component-scoped, gated on `organization.compliance.read`) to feed its own
"Compliance by site" card (`ui/components/organization-dashboard/components
/compliance-by-site`) — a separate component from anything in this feature's
`ui/`. Consumers inherit the invariants above — in particular a `null` rate
renders as an em dash, never 0%.

## Cross-feature dependencies

- Reads organization route context from the parent feature.
- The parent `organization` feature consumes this feature's summary store and
  models for the overview "Compliance by site" card (see Published API) —
  parent → child through the public barrels only, never deep imports.
- **This page consumes the sibling `inspections` and `checklists` features'
  public data-access services** (`InspectionService`, `ChecklistService`) and
  `inspections`' public non-conformity tag registry
  (`resolveInspectionTag`/`inspectionTagOptions`) directly — a documented,
  read-only, sibling-to-sibling dependency, the same pattern `checklists`
  already documents for `inspections`. Compliance does not duplicate the
  `NonConformityOutput`/`InspectionOutput` contracts or the severity/status
  tag registry; it imports them.
- The backend module that owns the `/compliance` endpoint also owns
  `/facility-tree`, which the **facilities** feature consumes for its
  hierarchy view. That is a backend ownership detail, not a frontend
  dependency: the two features call different endpoints and share no code.

## Not built yet

- **The regulatory PDF export** (`/compliance/export`). It requires
  `organization.compliance.export` **and** a pro/max plan, so it needs
  plan-aware gating this feature does not have yet.
- **A result-count + search/status toolbar sits above all three tabs**,
  matching the Non-conformities tab's pre-existing filter row: Inspections
  gained a free-text `search` filter (`InspectionListFilter.search` is
  supported by the endpoint), Checklists gained a `status` filter
  (`active`/`archived`, the only filter its endpoint exposes — it has no
  `search` param). Neither tab gained a status/severity select beyond that;
  further column filters remain out of scope for this pass.
- **The "Open non-conformities" KPI's supporting line only reports the
  critical count.** `ComplianceRollup` does not expose a trend or a due-date
  breakdown, so the other three KPI cards intentionally render without a
  third line rather than fabricate one.
- **Fr/es catalog entries for this pass's new `compliance.*` keys** were
  hand-written into `messages.fr.xlf`/`messages.es.xlf` rather than produced
  by `npm run i18n:extract`, which is still blocked by pre-existing, unrelated
  compile errors elsewhere in the app. Older `compliance.*` ids referenced by
  this feature's templates (column headers, empty states, the
  Non-conformities toolbar's own search/severity/status placeholders) predate
  this pass and were already missing from both catalogs before it — that gap
  is unrelated to this pass and still awaits a clean extraction run. The
  removed Overview/Sites tab's now-orphaned keys
  (`compliance.tabs.overview`, `compliance.tabs.sites`,
  `compliance.kpi.overdue`, `compliance.kpi.dueSoon`,
  `compliance.kpi.unscheduled`, `compliance.search`, `compliance.filter.*`,
  `compliance.count`, `compliance.noMatch`) will be pruned by that same run.
