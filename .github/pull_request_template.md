# Context

- Issue / ticket:
- Goal:
- Out of scope:

## Change Summary

- TODO
- TODO

## Review Guide

### Features / Areas

<!-- Example: auth, organization, interventions, core/http, shared, layouts, .github -->

- TODO

### Main Files / Entry Points

<!-- Point reviewers to the exact pages, stores, data-access services, ports, routes, models, or specs that matter. -->

- TODO

### Reviewer Focus

Select only what really matters for this PR.

- [ ] Business logic correctness
- [ ] Architecture / ownership boundaries (`ARCHITECTURE.md`)
- [ ] State management (SignalStore, `CallState`, events)
- [ ] API contract / model alignment with the backend
- [ ] SSR / hydration / `TransferState` behavior
- [ ] Routing, guards, resolvers
- [ ] Accessibility (WCAG 2.1 AA, keyboard, focus, dark mode)
- [ ] Responsive / field (mobile) behavior
- [ ] Offline and sync behavior
- [ ] i18n / translation catalogs
- [ ] Bundle size / performance
- [ ] CI / workflow / release impact
- [ ] Regression risk
- [ ] Missing tests

## Functional Impact

- [ ] No functional impact
- [ ] User-visible behavior changed
- [ ] Public feature API, port, or barrel changed
- [ ] Route or navigation structure changed
- [ ] Backend contract expectation changed
- [ ] Translation catalogs changed
- [ ] Config / environment impact
- [ ] CI / delivery impact
- [ ] Breaking change

### Before

<!-- Optional: short description of the previous behavior. -->

Needs manual confirmation.

### After

<!-- Optional: short description of the expected new behavior. -->

Needs manual confirmation.

## Risk And Rollback

- [ ] No special risk
- [ ] Security-sensitive change (auth, session, tokens, cookies, interceptors)
- [ ] Cross-organization scope or permission gating involved
- [ ] SSR / hydration behavior changed
- [ ] Offline persistence or outbox replay changed
- [ ] Release or deployment process changed

### Risk Notes

<!-- Call out the exact edge cases or failure modes reviewers should validate. -->

- TODO

### Rollback Plan

<!-- How to revert safely if this goes wrong in production. -->

- TODO

## Validation

### Local Validation

<!-- Only list what you actually ran locally. Example: targeted `npx ng test --include=...`, `npm run quality`, manual browser check. -->

- TODO
- TODO

### CI Validation

<!-- GitHub Actions is the source of truth for automated validation on this PR. -->

- [ ] I expect the standard PR checks (format, lint, unit tests, build, audit, e2e) to cover this change
- [ ] This PR needs the e2e suite on more than chromium (`CI` → `Run workflow` → `e2e_browsers`)
- [ ] This PR needs an extra manual verification outside standard CI

### Additional Evidence

<!-- Optional: screenshots (light + dark), API payloads, Playwright report, Lighthouse notes, bundle diff. -->

## Deployment Notes

- [ ] No special deployment step
- [ ] New env var / runtime config required
- [ ] Service worker / cache invalidation impact
- [ ] Manual post-deploy check required

### Details

<!-- Add exact deployment or verification steps if needed. -->

## Known Gaps

<!-- Anything intentionally deferred or not covered in this PR. -->

- TODO

## Copilot Review Request

```text
Review this pull request using the repository architecture documents (ARCHITECTURE.md, AGENTS.md, PRODUCT.md) and the touched FEATURE.md files.
Focus only on actionable findings in the changed code.
Prioritize correctness, ownership and dependency-direction violations, state management patterns, API contract regressions, SSR and hydration risks, accessibility, workflow impact, and missing tests.
Ignore formatting and non-essential refactoring advice.
```
