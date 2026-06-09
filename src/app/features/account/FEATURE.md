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

- `/account/profile`
- `/account/sessions`
- `/account/trusted-devices`
- `/account/notifications`

The feature redirects `/account` to the profile page.

## State and Data Access

Primary stores:

- `UserStore`
- `UsersStore`
- `SessionStore`
- `TrustedDeviceStore`
- `NotificationStore`

Primary services:

- `UserService`
- `UserProfileService`
- `SessionService`
- `TrustedDeviceService`
- `NotificationService`

## Published Contracts

- `USER_IDENTITY_PORT`
- `UserIdentityPort`
- `USER_ACCESS_PORT`
- `UserAccessPort`
- `USER_PROFILE_PORT`
- `UserProfilePort`
- `NOTIFICATION_CENTER_PORT`
- `NotificationCenterPort`

These contracts are intended for shell consumers such as layouts and shared shell widgets,
plus approved external workflows that need to bootstrap or clear the authenticated user profile.

## Cross-Feature Dependencies

- May be initialized or cleared by `features/auth` through `USER_PROFILE_PORT` after successful session restoration or logout.
- Must not own auth guards, auth interceptors, or refresh-token behavior.

## Shell Integration Notes

- `provideAccount()` binds account-owned ports to concrete stores using `useExisting`.
- Layouts should consume account ports instead of injecting account stores directly.

## Invariants

- User profile remains account-owned even when auth bootstrap triggers its loading.
- Shell-level user identity and notification behavior must cross feature boundaries through ports.
- Account pages should orchestrate account stores and render account-owned UI components.
