# Feature: Compliance

## Purpose and ownership

The organization's **compliance register**: how much of the equipment fleet is
covered by an in-date maintenance schedule, and how that coverage breaks down
site by site.

Nested under `organization` because both the URL and the ownership are nested:
the register only exists inside an organization, and every figure it shows is
organization-scoped.

## Route entry points

| URL            | Component        | Guard                                            |
| -------------- | ---------------- | ------------------------------------------------ |
| `…/compliance` | `CompliancePage` | `organizationPermissionGuard([COMPLIANCE_READ])` |

Two sections — **Overview** and **By site** — are `?tab=`, not child routes: both
come from a single query behind a single permission. A section that ever needs
its own guard must become a real child route instead, because `canActivate` does
not re-run on a query-param change.

## Invariants

- **Additive, never a replacement for `/inspections`.** The two sit behind
  different backend permissions (`organization.compliance.read` vs
  `organization.inspection.read`). Redirecting inspections here would lock out
  every member holding only the inspection permission.
- **`complianceRate === null` is not `0`.** The backend returns it undefined when
  a site tracks no scheduled equipment, and says so explicitly: "undefined, NOT
  0%". Both the page and the table render an em dash there. Collapsing the two
  would report an unscheduled site as fully non-compliant.
- **`trackedEquipmentCount` is the denominator** the rate is derived from
  (up-to-date + due-soon + overdue), not the total fleet. It is shown beside the
  rate so a 100% built on two assets is not mistaken for a clean estate.
- Sites are sorted **worst coverage first**, with untracked sites last — they are
  unmeasured, not failing.
- The `totals` map is loosely typed by the API (`int|float|null`), so it is read
  through `adaptComplianceTotals` rather than probed in `computed` blocks
  (ARCHITECTURE §17.6).

## State and data access

- `ComplianceSummaryStore` — component-scoped, one query (`withQueryState`).
- `ComplianceService.getSummary` — `GET /organizations/{orgId}/compliance`.

## Cross-feature dependencies

- Reads organization route context from the parent feature.
- The backend module that owns this endpoint also owns `/facility-tree`, which
  the **facilities** feature consumes for its hierarchy view. That is a backend
  ownership detail, not a frontend dependency: the two features call different
  endpoints and share no code.

## Not built yet

- **The regulatory PDF export** (`/compliance/export`). It requires
  `organization.compliance.export` **and** a pro/max plan, so it needs plan-aware
  gating this feature does not have yet; shipping the button without it would
  offer an action that fails for most organizations.
- **A checklist-template tab.** The backend exposes no standalone template
  registry, so the third tab in the mockup has no data behind it.
