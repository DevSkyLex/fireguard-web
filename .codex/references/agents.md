# FireGuard Web native agents

The 25 frontend role definitions set their model, effort and tier directly. The primary
configuration also exposes the 22 API roles. See [the workflow](../workflow.md#native-agent-settings)
for native invocation, current availability, permissions and shared-project discovery.

| Agent                          | Responsibility                                                                                                                                        | Model                  | Effort | Mode            |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ------ | --------------- |
| `fg-web-a11y-auditor`          | Audit FireGuard semantics and interaction accessibility with concrete evidence and limits.                                                            | gpt-6.1-sol · Standard | high   | Read-only       |
| `fg-web-access-builder`        | Build FireGuard permission projections and owner-published access contracts.                                                                          | gpt-6.1-sol · Standard | high   | Assigned writes |
| `fg-web-api-contract-reviewer` | Compare FireGuard frontend transport contracts with explicitly scoped backend evidence.                                                               | gpt-6.1-sol · Standard | high   | Read-only       |
| `fg-web-architecture-reviewer` | Review FireGuard ownership, imports, public contracts, state and SSR invariants.                                                                      | gpt-6.1-sol · Standard | high   | Read-only       |
| `fg-web-collection-builder`    | Build presentational FireGuard tables and dataviews with explicit collection events.                                                                  | gpt-6.1-sol · Standard | medium | Assigned writes |
| `fg-web-comment-maintainer`    | Define or maintain assigned comment conventions, correct source docblocks and run scoped documentation formatting and lint without changing behavior. | gpt-6-luna · Fast      | medium | Assigned writes |
| `fg-web-component-builder`     | Build FireGuard pages and ordinary presentational components with correct ownership and public contracts.                                             | gpt-6.1-sol · Standard | medium | Assigned writes |
| `fg-web-design-reviewer`       | Critique FireGuard visual composition against current artifacts, DESIGN.md and native Spartan.                                                        | gpt-6.1-sol · Standard | high   | Read-only       |
| `fg-web-directive-builder`     | Build SSR-safe FireGuard behavioral directives and typed template markers.                                                                            | gpt-6.1-sol · Standard | medium | Assigned writes |
| `fg-web-e2e-runner`            | Verify FireGuard behavior in a real browser with bounded scenarios and durable evidence.                                                              | gpt-6.1-sol · Standard | medium | Assigned writes |
| `fg-web-feature-builder`       | Define FireGuard feature ownership, public APIs, ports, composition and normative FEATURE.md contracts.                                               | gpt-6.1-sol · Standard | high   | Assigned writes |
| `fg-web-form-builder`          | Build FireGuard Signal Forms, reusable validators and explicit draft/submission contracts.                                                            | gpt-6.1-sol · Standard | high   | Assigned writes |
| `fg-web-i18n-auditor`          | Audit FireGuard message IDs, placeholders and locale catalogs without claiming visual or linguistic completeness.                                     | gpt-6-luna · Fast      | medium | Read-only       |
| `fg-web-offline-sync-builder`  | Build FireGuard offline persistence and durable replay under the feature's conflict contract.                                                         | gpt-6.1-sol · Standard | xhigh  | Assigned writes |
| `fg-web-overlay-builder`       | Build native FireGuard overlays with safe dismissal, focus and adaptive surface contracts.                                                            | gpt-6.1-sol · Standard | high   | Assigned writes |
| `fg-web-performance-reviewer`  | Review frontend bundle cost, lazy loading, request duplication, reactivity and SSR hydration from evidence.                                           | gpt-6.1-sol · Standard | high   | Read-only       |
| `fg-web-pipe-builder`          | Build pure FireGuard Angular pipes when a computed value or built-in does not fit.                                                                    | gpt-6-luna · Fast      | high   | Assigned writes |
| `fg-web-routing-ssr-builder`   | Build FireGuard routing, guards, resolvers and explicit SSR/hydration loading boundaries.                                                             | gpt-6.1-sol · Standard | xhigh  | Assigned writes |
| `fg-web-security-auditor`      | Review frontend auth/session, SSR cookies, token exposure, unsafe HTML and redirect boundaries.                                                       | gpt-6.1-sol · Standard | xhigh  | Read-only       |
| `fg-web-service-builder`       | Build FireGuard Hydra transport, pure data adapters and ordinary behavioral services.                                                                 | gpt-6.1-sol · Standard | medium | Assigned writes |
| `fg-web-signal-store`          | Build FireGuard SignalStore slices with explicit request state, typed events and deliberate lifecycle scope.                                          | gpt-6.1-sol · Standard | high   | Assigned writes |
| `fg-web-spartan-ui`            | Refine existing FireGuard visual composition, density and native Spartan interaction patterns.                                                        | gpt-6.1-sol · Standard | high   | Assigned writes |
| `fg-web-utils-builder`         | Build pure FireGuard helpers, constants and option sets at their lowest justified scope.                                                              | gpt-6-luna · Fast      | medium | Assigned writes |
| `fg-web-web-test-writer`       | Write and repair FireGuard Angular unit/integration tests at the owning boundary.                                                                     | gpt-6.1-sol · Standard | high   | Assigned writes |
| `fg-web-workflow-reviewer`     | Review frontend CI, browser tests, permissions, caches, images and deployment gates.                                                                  | gpt-6.1-sol · Standard | high   | Read-only       |

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

Security review owns frontend trust/exposure paths; access-builder implements permission
projections. Performance review needs measured bundle/network/render evidence. Workflow
review owns frontend CI/deployment gates; the API workflow reviewer remains backend-scoped.
