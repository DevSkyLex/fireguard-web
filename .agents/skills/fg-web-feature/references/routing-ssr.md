# Routing and SSR boundaries

ARCHITECTURE.md §12 defines the loading decision order. Read the feature and parent contracts,
then identify route-critical data, its owner and current loading paths before changing them.

App routes choose layouts/entry points; a feature owns its subtree and `http/` guards/resolvers.
A route-critical resolver seeds the owner, owns a small explicit TransferState handoff or is the
sole load path. Avoid a second load in page initialization/store hooks. Hidden tabs and pickers
usually load browser-only or on action.

Specify browser navigation, per-request SSR, hydration and request-less execution. Preserve
redirects, session/member gating and cancelled stale reads on parameter/organization changes.
Consume and remove targeted TransferState keys; never serialize tokens, secrets or broad private
collections. Changing a store handoff requires explicit ownership of its slice and tests.

Test allowed/denied/unknown access, redirects, failures and duplicate-load prevention.
Use the real SSR smoke only for its supported boundary; SPA and unit tests do not prove raw
server HTML or hydration. See `.codex/references/validation.md`.
