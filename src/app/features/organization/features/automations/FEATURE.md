# Automations

Owns organization execution history and explicit recovery at `/organizations/:organizationId/automations`.
The existing automation policy editor remains in organization settings. The backend owns enabled
policy, outcome totals and retry capabilities; reads require `organization.automation.read` and
retry also requires `organization.automation.manage`. Admin wildcard roles retain access.

The route-scoped SignalStore loads browser-only after hydration, clears organization data on scope
changes and fences late mutations. Retry sends the expected attempt identity and never recreates
the action locally. A conflict or lost response refreshes history without silently repeating the
command. Historical failed attempts remain visible; legacy failures without retained inputs have
no retry action. Error codes are safe, stable API values, never raw execution exceptions.

Public entry point: `automations.routes.ts`. Other features do not consume this feature's internals.
Uses the organization context port and permission guard. No feature data enters TransferState.
