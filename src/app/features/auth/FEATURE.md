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

## Published Contracts

- `AUTH_SESSION_PORT`
- `AuthSessionPort`

This contract is the stable boundary consumed by auth-owned infrastructure such as HTTP interceptors.
It exposes the access token, initialization state, authenticated-session validity, and session clearing.

## Cross-Feature Dependencies

- May coordinate with `features/account` during bootstrap and logout through the account-owned `USER_PROFILE_PORT` contract.
- Must not move account-owned state or UI into auth just because auth initializes first.

## SSR and Bootstrap Notes

- `provideAuth()` is invoked from the app shell but ownership remains in `features/auth`.
- SSR initialization attempts session restoration only when a real browser or per-request server context exists.
- Auth bootstrap is allowed to await account-owned user profile initialization, but it must not serialize the bearer token into `TransferState`.
- Global TransferCache must not serialize authenticated API responses; auth-sensitive hydration is handled explicitly by owning features.

## Invariants

- Auth session state is owned by `AuthStore` and published through `AUTH_SESSION_PORT`.
- Public auth routes must stay lazy-loaded under `/auth`.
- Auth interceptors and guards belong to this feature, not to `core`.
- Password reset and MFA are auth workflows even when rendered in separate pages.
