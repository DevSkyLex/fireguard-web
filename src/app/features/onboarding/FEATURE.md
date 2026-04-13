# Onboarding Feature

## Purpose

Owns the organization onboarding workflow that can block navigation until setup is complete.

This feature is responsible for:

- onboarding state retrieval and progression,
- the onboarding page and wizard orchestration,
- the guard that determines whether onboarding blocks protected navigation.

This feature does not own organization management after onboarding is complete. Ongoing organization workflows belong to `features/organization`.

## Entry Points

- Routes: `onboarding.routes.ts`
- Public API: `index.ts`

## Routes

- `/onboarding`

The feature is mounted behind an auth-protected shell route and exposes the onboarding page at the feature root.

## State and Data Access

Primary store:

- `OnboardingStore`

Primary service:

- `OnboardingService`

## Cross-Feature Dependencies

- Works with auth-protected routes because onboarding state may redirect authenticated users away from other areas.
- Must not take ownership of long-term organization context or shell organization switching.

## Routing and SSR Notes

- `onboardingGuard` is part of this feature because it enforces onboarding business rules.
- Guard-driven API calls must remain intentional because they affect initial navigation and SSR stabilization.

## Invariants

- Onboarding blocking rules are defined here, not in layouts or in `core`.
- A missing onboarding record may be treated differently from a blocking workflow, but that policy belongs here.
- The onboarding page is the route-entry orchestrator for this workflow.
