# Auth Feature

## Purpose

Owns authentication and session lifecycle for the application.

This feature is responsible for:

- sign-in and MFA flows,
- public self-service registration (account creation + email verification),
- password reset workflows,
- the public confirmation of a sign-in email change (the emailed token is the credential),
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
- `/auth/register/verify` — carries the challenge token as its `token` query param.
  `registerVerifyGuard` rehydrates `RegisterStore` from it, so the step survives a reload,
  a back navigation, or a direct link; the masked recipient is not recoverable from the
  token alone, so the page keeps its generic copy. Twin of `/auth/password-reset/verify`.
- `/auth/mfa-verify`
- `/auth/password-reset/forgot`
- `/auth/password-reset/verify`
- `/auth/password-reset/new`
- `/auth/email-change/confirm` — the landing page of the email change confirmation link.
  **Guardless on purpose**: the link lands in the NEW mailbox, where the visitor may be
  signed in, signed out, or someone mid-session — `guestGuard` would bounce a signed-in
  user away from their own confirmation. The page never consumes the single-use token on
  load (mail clients and browsers prefetch links); the POST happens only on an explicit
  click. On success the backend has revoked every session, so the page performs the local
  purge (`AUTH_SESSION_PORT.clearSession()`) and links to sign-in — the user reconnects
  with the new address. The authenticated half of the workflow (request/cancel) is owned
  by `features/account` and lives on `/account/security`.

Route access is enforced by auth-owned guards such as `guestGuard`, `mfaGuard`, `registerVerifyGuard`, `passwordResetVerifyGuard`, and `passwordResetNewGuard`.

All seven screens are mounted. Each page owns orchestration only: it maps form values onto the
transport DTO, calls the store, and reacts to the resulting state. Every form is a **Signal Forms**
component under `ui/forms/` (`ARCHITECTURE.md` §10.4) that owns its own model and rules and emits
`submitted` — no page builds a form, and no form calls a store.

`ui/forms/otp-form/` is shared by the three verification screens (registration, MFA, password
reset). Its `showResend` input exists because a TOTP challenge has no delivery to repeat. Its
`serverError` and `resendAvailableIn` inputs render the failed verify/resend call and run the
local resend-cooldown countdown; the owning stores keep the cooldown as an absolute
`resendAvailableAt` timestamp fed by the API's `mfa_resend_in`/`canResendIn` on success and by
the parsed 429 detail on a refused resend (`utils/resend-delay/` — parsing the detail was chosen
over propagating the `Retry-After` header through `HydraApiService`, which no other call needs).

**Backend submit failures surface inline in the owning form.** Each auth form takes a
`serverError` input (`StoreError | null`) bound by its page to the store's error signal and
renders the message as a `role="alert"` banner above the fields. The stores still dispatch
`StoreFailureEventPayload` events for the app-wide feedback queue, but the auth screens do not
rely on it: a sign-in rejection must be visible exactly where the user is looking. Field-level
errors stay next to the input that has to change.

## Password policy

`validators/password/password.validator.ts` is the single expression of the API's password rules,
applied by every surface that writes a password — registration and reset here, and the account
change-password form through the published rule set below. `applyPasswordConfirmation`
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
- `EmailChangeConfirmStore` — page-scoped (provided by `EmailChangeConfirmPage`): one call,
  one outcome, rendered inline rather than toasted, because the outcome is the page's content

Primary services:

- `AuthService`
- `SessionService`
- `TrustedDeviceService`
- `PasswordResetService`
- `RegistrationService`
- `EmailChangeService` — the public confirm endpoint only (`POST /api/me/email-change/confirm`);
  request and cancel belong to account's `UserProfileService`, which owns the authenticated `/me` surface

## Published Contracts

- `AUTH_SESSION_PORT`
- `AuthSessionPort`
- `PASSWORD_MIN_LENGTH`, `PASSWORD_MAX_LENGTH`, `PASSWORD_PATTERN`
- `applyPasswordRules`, `applyPasswordConfirmation`

`AUTH_SESSION_PORT` is the stable boundary consumed by auth-owned infrastructure such as HTTP interceptors.
It exposes the access token, initialization state, authenticated-session validity, and session clearing.

The password policy is published as a **rule set**, not only as constants: `features/account`'s
change-password form owns the form but not the policy, and handing it the four numbers rather than
the four rules would let two expressions of one API constraint drift apart. A consumer applies
`applyPasswordRules(path)` to its own field; the messages come from here, so a policy change reaches
every surface at once.

## Cross-Feature Dependencies

- May coordinate with `features/account` during bootstrap and logout through the account-owned `USER_PROFILE_PORT` contract.
- Must not move account-owned state or UI into auth just because auth initializes first.
- **`features/account`'s `AccountSecurityPage` injects `SessionStore` and `TrustedDeviceStore`
  directly**, scoped to that page (`providers: [SessionStore, TrustedDeviceStore]`), to render active
  sessions and trusted devices at `/account/security`. The stores stay auth-owned; only their UI
  renders under account.
- **Publishes `AUTH_LOGOUT_PORT`** to two approved consumers outside auth:
  `features/account`'s `AccountMenu` (the shell's sign-out control) and
  `features/error`'s `ForbiddenPage` (the member has no organization they can
  open, so signing out is one of the only exits that does not loop). The
  invitation landing named here previously never consumed it.
- **Publishes `withLogoutControl()`** (feature barrel), a header-slot contribution rendering
  the auth-owned `LogoutControl`. `app.routes.ts` mounts it on `/onboarding`'s split shell so
  the wizard — which renders no account menu and whose guards forbid leaving — still offers a
  way out of the session. The control listens to `sessionEnded` (not the logout call's outcome,
  since a failed logout still ends the local session) and then routes to `/auth/login`.

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
