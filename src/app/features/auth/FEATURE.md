# Auth Feature

## Purpose

Owns authentication and session lifecycle for the application.

This feature is responsible for:

- sign-in and MFA flows,
- password reset workflows,
- access token and refresh bootstrap,
- auth guards and auth-related HTTP interceptors,
- publishing the application auth session contract.

This feature does not own user profile presentation or notification UX. Those belong to `features/account`.

## Entry Points

- Routes: `auth.routes.ts`
- Public API: `index.ts`
- Root provider: `providers/auth.provider.ts`

## Routes

- `/auth/login`
- `/auth/mfa-verify`
- `/auth/password-reset/forgot`
- `/auth/password-reset/verify`
- `/auth/password-reset/new`

Route access is enforced by auth-owned guards such as `guestGuard`, `mfaGuard`, `passwordResetVerifyGuard`, and `passwordResetNewGuard`.

## State and Data Access

Primary stores:

- `AuthStore`
- `SessionStore`
- `TrustedDeviceStore`
- `ActiveTrustedDeviceStore`
- `PasswordResetStore`

Primary services:

- `AuthService`
- `SessionService`
- `TrustedDeviceService`
- `PasswordResetService`
- `OAuth2Service`

## Published Contracts

- `AUTH_SESSION`
- `AuthSessionPort`

This contract is the stable boundary consumed by auth-owned infrastructure such as HTTP interceptors.

## Cross-Feature Dependencies

- May coordinate with `features/account` during bootstrap to load the authenticated user profile.
- Must not move account-owned state or UI into auth just because auth initializes first.

## SSR and Bootstrap Notes

- `provideAuth()` is invoked from the app shell but ownership remains in `features/auth`.
- SSR initialization attempts session restoration only when a real browser or per-request server context exists.
- Auth bootstrap is allowed to hydrate user state, but it must await that work when it is part of the startup contract.

## Invariants

- Auth session state is owned by `AuthStore` and published through `AUTH_SESSION`.
- Public auth routes must stay lazy-loaded under `/auth`.
- Auth interceptors and guards belong to this feature, not to `core`.
- Password reset and MFA are auth workflows even when rendered in separate pages.
