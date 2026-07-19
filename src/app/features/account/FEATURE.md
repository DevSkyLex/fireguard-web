# Account Feature

## Purpose

Owns authenticated user account data exposed to the shell and account-facing pages.

This feature is responsible for:

- user profile state,
- active session and trusted device management,
- notification center state and UI,
- shell-facing user identity, access, and notification contracts,
- current-user global permission helpers built on the account-owned access contract,
- account-specific pages under `/account`.

This feature does not own authentication, session restoration, or auth transport concerns. Those belong to `features/auth`.

## Entry Points

- Routes: `account.routes.ts`
- Public API: `index.ts`
- Root provider: `providers/account.provider.ts`

## Routes

- `/account` — single profile page with a hero header (decorative banner, avatar and
  read-only user identity) followed by a sticky **vertical navigation menu** that switches
  between three sections: **Profile** (detailed identity/access attributes), **Security**
  (MFA status + authenticator app key generation, active sessions, trusted devices) and
  **Notifications**. The active section is driven by the `tab` query parameter
  (`?tab=profile|security|notifications`).

Account navigation is exposed through the **header user menu** (`AccountUserMenu`),
not the sidebar.

## State and Data Access

Primary stores:

- `UserStore`
- `UsersStore`
- `SessionStore`
- `TrustedDeviceStore`
- `NotificationStore`
- `AccountTotpEnrollmentStore` (component-scoped; see invariant below)

Primary services:

- `UserService`
- `UserProfileService`
- `SessionService`
- `TrustedDeviceService`
- `NotificationService`
- `TotpService`

## Published Contracts

- `USER_IDENTITY_PORT`
- `UserIdentityPort`
- `USER_ACCESS_PORT`
- `UserAccessPort`
- `USER_PROFILE_PORT`
- `UserProfilePort`
- `NOTIFICATION_CENTER_PORT`
- `NotificationCenterPort`
- `ACCOUNT_PERMISSION`, `ACCOUNT_PERMISSION_NAMES`, `AccountPermissionName`
- `UserPermissionService`
- `accountPermissionGuard`

These contracts are intended for shell consumers such as layouts and shared shell widgets,
plus approved external workflows that need to bootstrap or clear the authenticated user profile.
`accountPermissionGuard`/`ACCOUNT_PERMISSION`/`UserPermissionService` are the stable surface for
gating **global** (non-organization-scoped) permissions such as `audit.read` outside this feature —
see `features/organization`'s `audit` route and its sidebar "Audit log" navigation entry for the
first consumers.

## Cross-Feature Dependencies

- May be initialized or cleared by `features/auth` through `USER_PROFILE_PORT` after successful session restoration or logout.
- Must not own auth guards, auth interceptors, or refresh-token behavior.
- `accountPermissionGuard`/`ACCOUNT_PERMISSION`/`UserPermissionService` may be consumed by other
  features to gate routes or UI on a global permission (e.g. `features/organization`'s audit log).

## Shell Integration Notes

- `provideAccount()` binds account-owned ports to concrete stores using `useExisting`.
- Layouts should consume account ports instead of injecting account stores directly.

## Invariants

- User profile remains account-owned even when auth bootstrap triggers its loading.
- Shell-level user identity and notification behavior must cross feature boundaries through ports.
- Account pages should orchestrate account stores and render account-owned UI components.
- The `Otp` module exposes the full TOTP lifecycle: `POST /api/otp/totp/setup` persists a
  **pending** secret server-side (replacing any previous pending secret on re-call),
  `POST /api/otp/totp/confirm` activates it with a verification code, and
  `POST /api/otp/totp/disable` deactivates an active enrollment with a current code as proof of
  possession. `UserProfileOutput.totpEnabled` (from `/api/me`) is the **only** authoritative
  source for whether TOTP is active — `AccountTotpEnrollmentStore` only tracks the in-progress
  workflow and calls `UserStore.reload()` after a successful `confirm`/`disable` so `totpEnabled`
  propagates across the shell. `AccountMfaPanel` must key its three states (not set up / pending
  confirmation / active) off `UserStore.profile()?.totpEnabled` and the store's transient
  `setupResult`, never off a locally-held "enabled" flag.

## Unified inbox

`…/account/inbox` merges everything needing the signed-in user's attention
across sources and organizations (`InboxStore`, `InboxService`).

It lives here rather than under an organization because `InboxItem.organizationId`
is **optional**: an account-level item has no organization to be nested under,
and such an entry is rendered but stays inert — routing it somewhere invented
would be worse than not linking it.

Invariants:

- **Pages accumulate, never replace.** This is a feed the reader scrolls, not a
  table they page through, so "load more" appends.
- **Unread is a dot _and_ a bold title** — status is never colour-only.
- `load`/`loadMore` are `rxMethod<void>`: rxMethod does not emit when handed
  `undefined`, so an "all organizations" call written as `load(undefined)`
  silently does nothing.
