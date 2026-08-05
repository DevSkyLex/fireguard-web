# Auth Feature

## Purpose

Owns authentication and session lifecycle for the application.

This feature is responsible for:

- sign-in and MFA flows,
- public self-service registration (account creation + email verification),
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
- `/auth/register`
- `/auth/register/verify`
- `/auth/mfa-verify`
- `/auth/password-reset/forgot`
- `/auth/password-reset/verify`
- `/auth/password-reset/new`

Route access is enforced by auth-owned guards such as `guestGuard`, `mfaGuard`, `registerVerifyGuard`, `passwordResetVerifyGuard`, and `passwordResetNewGuard`.

All seven screens are mounted. Each page owns orchestration only: it maps form values onto the
transport DTO, calls the store, and reacts to the resulting state. Every form is a **Signal Forms**
component under `ui/forms/` (`ARCHITECTURE.md` §10.4) that owns its own model and rules and emits
`submitted` — no page builds a form, and no form calls a store.

`ui/forms/otp-form/` is shared by the three verification screens (registration, MFA, password
reset). Its `showResend` input exists because a TOTP challenge has no delivery to repeat.

**Backend submit failures surface as toasts, not as inline banners.** No auth page renders its
store's error signal: the stores already dispatch their failures as `StoreFailureEventPayload`
events, `provideFeedback()` forwards them to the app-wide queue, and `@shared/toast` renders it.
Adding a banner would duplicate a message the user is already being shown. Field-level errors are
the opposite case and stay in the form, next to the input that has to change.

## Password policy

`validators/password/password.validator.ts` is the single expression of the API's password rules,
applied by both surfaces that write a password (registration and reset). `applyPasswordConfirmation`
is the cross-field rule replacing the classic `matchFields` validator: a schema rule reading its
sibling through `valueOf`, reporting on the confirmation field. Changing the policy means changing
this file and nothing else.

## State and Data Access

Primary stores:

- `AuthStore`
- `SessionStore`
- `TrustedDeviceStore`
- `ActiveTrustedDeviceStore`
- `PasswordResetStore`
- `RegisterStore`

Primary services:

- `AuthService`
- `SessionService`
- `TrustedDeviceService`
- `PasswordResetService`
- `RegistrationService`

## Published Contracts

- `AUTH_SESSION_PORT`
- `AuthSessionPort`

This contract is the stable boundary consumed by auth-owned infrastructure such as HTTP interceptors.
It exposes the access token, initialization state, authenticated-session validity, and session clearing.

## Cross-Feature Dependencies

- May coordinate with `features/account` during bootstrap and logout through the account-owned `USER_PROFILE_PORT` contract.
- Must not move account-owned state or UI into auth just because auth initializes first.
- **Publishes `AUTH_LOGOUT_PORT`** to two approved consumers outside auth:
  `features/organization`'s invitation landing (the invitee signed in with the
  wrong account) and `features/error`'s `ForbiddenPage` (the member has no
  organization they can open, so signing out is one of the only exits that does
  not loop). Both are recorded in their own `FEATURE.md`.

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
- Registration creates a `pending_verification` account; the email-verification
  step (`/auth/register/verify`) activates it and auto-logs the user in by
  applying the returned session to `AuthStore` (`applySession`), then routing to
  `/onboarding`. Registration never creates an organization — onboarding owns that.
- A user with an active TOTP (authenticator app) enrollment (`features/account`) gets
  `mfa_method: 'totp'` and `mfa_destination: 'Authenticator App'` at login. TOTP challenges have
  no delivery counterpart to resend — the backend rejects `POST /api/auth/mfa/resend` for a
  `totp` challenge with `totp_not_resendable` (400), so `MfaVerificationPage` hides the resend
  affordance (`OtpVerificationForm`'s `showResend` input) whenever `AuthStore.mfaMethod() === 'totp'`.
