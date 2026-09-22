# Routing and SSR

Read ARCHITECTURE.md §12 and the `fg-web-feature` routing/SSR reference for route changes.
App routes select shells and entry points; features own their route trees and `http/` concerns.

Assign one owner for route-critical loading. A resolver seeds the owner, provides a small explicit
TransferState handoff, or is the sole loading path. Secondary hidden surfaces load browser-only
or on user action. Define browser navigation, per-request SSR, hydration and request-less behavior.
Never serialize tokens, secrets or broad authenticated responses into HTML.

Test redirects, errors, duplicate-load prevention and state isolation at the changed boundary.
An SSR-off browser suite cannot establish SSR correctness; select the real smoke when applicable.
