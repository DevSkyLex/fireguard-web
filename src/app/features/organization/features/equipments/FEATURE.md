# Equipments Feature

**Reading guide:** [Documentation index](../../../../../../docs/README.md) · [Related guide](../../../../../../docs/guides/facilities-and-spatial-views.md).

## Purpose and ownership

Owns the organization equipment inventory, declared identity and lifecycle, type catalog,
replacement links, attachments, maintenance history and tags. The inventory remains centered
on fire equipment; `fire`, `safety` and `other` are server catalog families, not separate apps.
FireGuard's public identity and existing URLs remain unchanged.

Inspections own control results and anomalies. Interventions own work orders and execution.
Maintenance owns operation plans and due dates. Equipment consumes their authorized read
projections and deep links; it never infers a control result from operational status or
considers a generated intervention a completed control.

## Routes and presentation

- `/organizations/:organizationId/equipments`: server-paged table and mobile cards,
  search, type/status filters, sort preferences, CSV export, QR labels and a create sheet.
- `/equipments/create`: compatibility redirect to the list with `?create=1`, retaining
  the optional facility context. Creation is permission-gated and site-scoped.
- `/equipments/types`: catalog administration, guarded by `EQUIPMENT_WRITE`.
  Stable codes cannot be renamed. Revision conflicts retain the draft and require explicit
  comparison with the latest server revision before retry.
- `/equipments/:equipmentId`: the equipment dossier. The resolver seeds
  `ActiveEquipmentStore` without blocking activation; skeleton, failure and retry belong
  to the page. The document title prefers name and asset reference, retaining historical
  type/brand/model fallback.

The dossier distinguishes declared operational state, control due status and exact open
anomalies. `maintenanceDueStatus` describes controls only; maintenance operations remain
independent and open through the plan library filtered by equipment and operation kind.
Inspection and intervention permissions are checked separately. Loading, denied and failed
secondary projections never render as zero counts or an empty confirmed work queue.

Identity remains editable on the record through `EquipmentInformationPanel`. Name and
organization-unique asset reference are optional. The characteristics editor is a native
Signal Form for criticality and up to fifty unique key/value/unit declarations. These
values do not establish regulatory obligations.

Overview, attachments, maintenance history and tags remain dossier sections. Secondary tabs
load on first activation. Facility assignment uses a read-only paged facility picker.
Floor-plan placement remains owned by the facility Plans tab.

## Catalog and replacement invariants

`EquipmentTypeCatalogStore` loads every server catalog page, cancels obsolete organization
reads and clears earlier organization choices. It can seed an authorized offline snapshot.
Secondary catalog reads are browser-only and never use broad authenticated TransferState.
All entries, including archived ones, remain available for historical labels and filters;
new creation choices exclude archived entries.

Historical codes at revision one reuse localized labels and their existing icons. Revised
historical labels and custom labels come from the server. Custom codes use a safe icon
fallback. `EQUIPMENT_TYPE_OPTIONS` is the historical presentation registry, not the authority
for allowed equipment types.

Replacement accepts a reserve successor or creates a new identity in the same server
transaction. The terminal move requires explicit alert-dialog confirmation after editing
the replacement sheet. A network-uncertain result retains its exact command and operation
UUID for replay; editing cannot silently create a second operation. Draft dismissal is
protected, and switching between existing/new successor choices preserves the draft.

The historical equipment is retired, its dossier and QR remain readable, and predecessor
and successor links open their real records. Individualized reserve equipment is distinct
from future quantitative consumable stocks.

## State and transport

Each leaf route provides its own `EquipmentStore`; `ActiveEquipmentStore` remains the
root current-record source. The page provides independent catalog, replacement,
inspection-summary and open-work stores with explicit request states.

`EquipmentService` owns the equipment transport and consumes owner read endpoints:

- Exact inventory/facility summaries share matching family/customer/due filters and
  subtree scope with the corresponding list; counts never depend on page size.
- `inspection-summary` returns authorized published control evidence and exact anomaly counts.
- `open-work` returns authorized intervention/work-item identities without pagination.
- `replace` sends one stable atomic command and reads its receipt.

The dossier reuses open work of the same action before offering a new intervention.
Intervention links carry `targetEquipment` and `workAction`; new preparation additionally
uses `create=1`. Observed defects reuse the equipment-scoped inspection creation workflow.
No unsupported equipment filter is invented on the intervention list.

Write responses merge with known records rather than erase fields omitted by serialization.
An accepted explicit-null detail patch clears the requested field even when the response
omits nulls; unrelated omitted fields remain unchanged. Unassignment always clears the
facility relation. Lifecycle actions respect the terminal retired state.

CSV export covers the complete inventory and warns when list filters are ignored.
QR printing retains explicit inventory/facility/selection scopes and server preview limits.
Equipment reports and attachment downloads keep the existing entitlement and transport
contracts. Published equipment deletion remains decommissioning; there is no duplicate
delete button or standalone edit route.

## Public APIs and boundaries

The feature `index.ts` publishes the historical options, `EquipmentTypeCatalogStore`
and its instance type, catalog output/option/family types, and `buildEquipmentTitle`.
Organization assets, onboarding, compliance settings, facilities, maintenance schedules,
service requests and procurement
may consume these contracts. Models remain type-only except the existing status registries.

`data-access` publishes stable services. Facilities may read equipment, exact summaries
and plan positions. Maintenance schedules may read equipment choices. Inspection and work
projections are permission-gated server resources, rather than cross-feature private store imports.

Service requests may use the published equipment transport, identity models and title utility
to qualify a repair target and reuse open work. Procurement may use the authorized catalog
and its public models to declare equipment that will be individualized by the server.
Quantitative parts remain Inventory-owned; reserve equipment does not contribute to those balances.

Facility options and assignment selectors use the facilities feature's approved public APIs.
Organization setup may consume the catalog transport and pure Equipment-owned option mapping
through its façade. Onboarding consumes that setup contract rather than Equipment internals.
Pages own requests, navigation and mutations; forms, dialogs, sheets and tables consume
inputs and emit intent. Native Spartan primitives, Signal Forms, localization, SSR and
central interaction capabilities remain mandatory.

### Published entry points

| Entry point     | Consumers                                                                                                                                                                                                                     |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.ts`      | `organization`, `onboarding`, `organization/features/facilities`, `organization/features/maintenance-schedules`, `organization/features/procurement`, `organization/features/service-requests`                                |
| `data-access`   | `organization`, `organization/features/facilities`, `organization/features/maintenance-schedules`, `organization/features/inspections`, `organization/features/service-requests`, `organization/features/maintenance-exports` |
| `models`        | `organization/features/service-requests`, `organization/features/procurement`, `organization/features/maintenance-exports`                                                                                                    |
| `utils`         | `organization`, `organization/features/service-requests`                                                                                                                                                                      |
| `ui/components` | `organization`                                                                                                                                                                                                                |

## Verification

Transport tests cover catalog pagination, optimistic revisions and atomic replacement
payloads. Store tests cover organization changes, stale reads, uncertain command replay
and duplicate submissions. Form tests cover normalized unique properties and retained
drafts. Dossier tests distinguish operational/control/anomaly states and authorized work.
Browser scenarios cover catalog administration and replacement on desktop and mobile.
