# Specialist catalogue

Choose the narrowest useful responsibility. A skill describes how; a role executes assigned
files/contracts. A specialist is not a mandatory delegation step.
The parent assigns scope and preserves other workers' edits. Direct launches inherit the
session; delegated model/effort selection follows [workflow](../workflow.md#agent-profiles)
and [agent-profiles.toml](../agent-profiles.toml).

| Agent                          | Owned responsibility                                                                                              | Mode            | Category / effort |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------- | --------------- | ----------------- |
| `fg-web-component-builder`     | Build FireGuard pages and ordinary presentational components with correct ownership and public contracts.         | Assigned writes | terra / high      |
| `fg-web-directive-builder`     | Build SSR-safe FireGuard behavioral directives and typed template markers.                                        | Assigned writes | terra / high      |
| `fg-web-feature-builder`       | Define FireGuard feature ownership, public APIs, ports, composition and normative FEATURE.md contracts.           | Assigned writes | sol / high        |
| `fg-web-service-builder`       | Build FireGuard Hydra transport, pure data adapters and ordinary behavioral services.                             | Assigned writes | terra / high      |
| `fg-web-signal-store`          | Build FireGuard SignalStore slices with explicit request state, typed events and deliberate lifecycle scope.      | Assigned writes | sol / high        |
| `fg-web-spartan-ui`            | Refine existing FireGuard visual composition, density and native Spartan interaction patterns.                    | Assigned writes | sol / high        |
| `fg-web-utils-builder`         | Build pure FireGuard helpers, constants and option sets at their lowest justified scope.                          | Assigned writes | luna / medium     |
| `fg-web-pipe-builder`          | Build pure FireGuard Angular pipes when a computed value or built-in does not fit.                                | Assigned writes | luna / high       |
| `fg-web-web-test-writer`       | Write and repair FireGuard Angular unit/integration tests at the owning boundary.                                 | Assigned writes | terra / high      |
| `fg-web-e2e-runner`            | Verify FireGuard behavior in a real browser with bounded scenarios and durable evidence.                          | Assigned writes | terra / medium    |
| `fg-web-a11y-auditor`          | Audit FireGuard semantics and interaction accessibility with concrete evidence and limits.                        | Read-only       | terra / high      |
| `fg-web-architecture-reviewer` | Review FireGuard ownership, imports, public contracts, state and SSR invariants.                                  | Read-only       | astra / high      |
| `fg-web-form-builder`          | Build FireGuard Signal Forms, reusable validators and explicit draft/submission contracts.                        | Assigned writes | sol / high        |
| `fg-web-overlay-builder`       | Build native FireGuard overlays with safe dismissal, focus and adaptive surface contracts.                        | Assigned writes | sol / high        |
| `fg-web-collection-builder`    | Build presentational FireGuard tables and dataviews with explicit collection events.                              | Assigned writes | terra / high      |
| `fg-web-routing-ssr-builder`   | Build FireGuard routing, guards, resolvers and explicit SSR/hydration loading boundaries.                         | Assigned writes | sol / xhigh       |
| `fg-web-access-builder`        | Build FireGuard permission projections and owner-published access contracts.                                      | Assigned writes | sol / high        |
| `fg-web-offline-sync-builder`  | Build FireGuard offline persistence and durable replay under the feature's conflict contract.                     | Assigned writes | sol / xhigh       |
| `fg-web-i18n-auditor`          | Audit FireGuard message IDs, placeholders and locale catalogs without claiming visual or linguistic completeness. | Read-only       | luna / medium     |
| `fg-web-api-contract-reviewer` | Compare FireGuard frontend transport contracts with explicitly scoped backend evidence.                           | Read-only       | sol / high        |
| `fg-web-design-reviewer`       | Critique FireGuard visual composition against current artifacts, DESIGN.md and native Spartan.                    | Read-only       | sol / high        |

## Selection boundaries

- Component builder owns page/ordinary unit structure; Spartan UI refines native composition
  and existing visual density. Form, overlay and collection builders own their narrower
  component boundaries; avoid assigning their files twice.
- Feature builder owns architecture/public composition; routing SSR builder handles focused
  routes, guards/resolvers and loading lifecycles. A store handoff requires explicitly assigned
  slice ownership and coordination with the SignalStore role.
- Service builder handles transport/adapters and ordinary behavior. Access and offline roles
  own their dedicated concerns. API contract review only compares evidence.
- Directive, pipe and util builders stay separate: DOM lifecycle/typed projection, Angular pure
  transformation and dependency-free helper work have different correctness boundaries.
- Design review assesses observed visual composition. A11y audit assesses semantics and
  interaction accessibility. E2E executes browser cases and records evidence; it does not
  establish design quality through visibility assertions alone.
- Localization review is static and bounded. It does not certify translation fluency or layout.
  Unit test authors verify the owned boundary, not another layer's implementation.

Read-only roles use the native read-only sandbox. Implementation roles keep the user's runtime
permissions; no agent grants itself additional filesystem, network or approval authority.
