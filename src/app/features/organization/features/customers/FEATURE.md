# Customers Feature

Owns internal customer identity and contacts within an organization. These records do not
grant external access and remain separate from offline replay client identifiers.

## Entry points

- `CUSTOMER_ROUTES`: `/organizations/:organizationId/customers`.
- `models`: `CustomerOutput`, `CustomerInput`, `CustomerContact`.
- `data-access`: `CustomerService`; revision-checked update, archive and restore.
- `ui/components`: `CustomerPicker`, an explicitly authorized business widget with its
  own scoped store. Facilities use this public API for optional root-site assignment.

The directory searches and paginates on the server. Active and archived views remain
separate. Administration is online; drafts survive server and connectivity failures.
Page and picker reads are browser-only, with no authenticated TransferState handoff.
Accepted writes cannot be cancelled by a second click. Organization changes cancel reads
and reject feedback from the old scope.

Archived records remain readable and retain historical site assignments. The picker
hydrates an existing selection independently of search pages and only accepts active
candidates for a new assignment. Root-site ownership is enforced by the Facility API.

Organization permissions `organization.customers.read` and `organization.customers.manage`
gate directory reads and mutation affordances. No portal, cross-organization sharing,
commercial invoicing or bulk export is owned here.

Forms emit normalized input; pages own commands, navigation and editor dismissal.
`customerStoreEvents.saved` reports the immutable organization and record identity.

## Public entry points

| Entry point   | Consumers                                   |
| ------------- | ------------------------------------------- |
| `data-access` | `organization/features/maintenance-exports` |
| `models`      | `organization/features/maintenance-exports` |

Maintenance exports may read named reference candidates only with customers.read.
Its source picker otherwise uses the minimal retained identity of the publication.
