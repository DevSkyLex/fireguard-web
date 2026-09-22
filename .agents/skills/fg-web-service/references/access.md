# Access projections and published access contracts

Read ARCHITECTURE.md §5/§10.8 and the owning FEATURE.md. Access helpers under
`access/services/<concern>/` are thin read-only projections over owner access state.
Keep permission catalogs, helper methods and exposed ports aligned with the backend contract.

Unknown/loading access is not a grant. Follow the existing contract for authentication/MFA,
session loss, organization switching, stale state and guard redirects. Do not add a parallel
permission store, invent a backend entitlement or bypass a server refusal through UI checks.

Ports and provider aliases belong to their owner. Navigation consumes the published contract;
layout rendering does not transfer business ownership. Coordinate guard or store changes with
their assigned owner before editing.

Test representative granted/denied/unknown states and the actual invalidation transitions
introduced by the task. Report the public contract changed and any backend policy assumption.
