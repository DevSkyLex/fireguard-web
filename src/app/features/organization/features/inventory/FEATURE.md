# Inventory Feature

Owns quantitative parts, consumables, warehouses, balances, declarations and immutable stock movements.
Individual reserve equipment remains Equipment-owned and is never counted as a quantitative article.

## Public entry points

| Entry point                                 | Consumers                                                                  |
| ------------------------------------------- | -------------------------------------------------------------------------- |
| `models`                                    | `organization/features/procurement`, `organization/features/interventions` |
| `data-access`                               | `organization/features/procurement`, `organization/features/interventions` |
| `ui/components/inventory-part-picker`       | `organization/features/procurement`                                        |
| `ui/components/inventory-warehouse-picker`  | `organization/features/procurement`                                        |
| `ui/components/inventory-consumption-panel` | `organization/features/interventions`                                      |

## Entry points

- `INVENTORY_ROUTES`: organization-scoped stock, parts, warehouses, declarations and movement history.
- `models`: canonical transport contracts and exact decimal string quantities.
- `data-access`: `InventoryService` quantity-only stock reads, references and stable-UUID commands.
- `ui/components/inventory-part-picker` and `inventory-warehouse-picker`: published Signal Forms
  widgets for Procurement and Inventory consumers. They own scoped browser-only server search,
  pagination and selected-record hydration; archived records remain readable but cannot be newly picked.
- `ui/components/inventory-consumption-panel`: presentation contract for Interventions. The parent
  owns durable local persistence, authorized cached references, transmission, receipt correlation and replay.

Procurement and Interventions may consume these documented UI barrels, `models` and `data-access`.
Inventory consumes the Organization member-access port and Auth's public `AUTH_SESSION_PORT`
generation for local journal ownership; it never reads or persists bearer tokens.

Returns and stock corrections are retained in an account-bound IndexedDB journal before transmission.
An uncertain command stays available for explicit replay with its original UUID and body, including
after navigation. Old session continuations cannot transmit or acknowledge a new session's journal.

Inventory never calculates quantities or money with floating-point numbers. Ordinary balance and
movement contracts contain quantities only; dedicated financial projections and permissions protect
internal values. New movements compensate factual corrections; no history is overwritten.

Reads and administration are browser-only, with no private TransferState handoff. Organization changes
cancel obsolete reads; accepted writes keep their originating scope and repeated clicks cannot cancel them.
Declarations keep one immutable client operation UUID. A received pending declaration is preserved,
without implying a partial stock debit, confirmed stock, completed work or a published dossier.
A publication blocked by received declarations must be resolved through the owning Intervention workflow.

The consumption panel emits intent without calling transports. The parent acknowledges successful
local persistence by matching `acceptedOperationId` or the represented local intent. Server declaration
IDs are distinct from operation UUIDs; server acknowledgment is correlated by the parent command owner.
Local queued, sending and failed states stay separate from server received-pending and confirmed states.

Administration requires the dedicated Inventory permissions. Consumption and returns additionally
require intervention execution; reconciliation requires inventory management and execution; stock
corrections additionally require maintenance-cost management. Financial values never enter ordinary
client reports. Equipment maintenance, procurement, commercial billing and cost dashboards stay with
those owning features.

References have permanent codes and part kinds. The current API exposes no revision precondition for
reference edits; the UI preserves failed drafts and never invents a concurrency token.
