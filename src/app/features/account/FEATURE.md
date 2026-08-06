# Account Feature

## Purpose

Owns authenticated user account data exposed to the shell and account-facing pages.

This feature is responsible for:

- user profile state, its editable fields and the avatar,
- the authenticated password change and the authenticator-app (TOTP) enrollment lifecycle,
- notification center state and UI,
- shell-facing user identity, access, and notification contracts,
- current-user global permission helpers built on the account-owned access contract,
- account-specific pages under `/account`.

This feature does not own authentication, session restoration, or auth transport concerns. Those
belong to `features/auth` — including **active sessions and trusted devices**, whose stores and
services (`SessionStore`, `TrustedDeviceStore`, `SessionService`, `TrustedDeviceService`) live in
`features/auth` because they are session-lifecycle concerns. Neither has a UI surface today; when
one is built, whether it renders under `/account/security` is a placement decision, not a transfer
of ownership.

## Entry Points

- Routes: `account.routes.ts`, mounted from `app.routes.ts` under the one `DashboardLayout` shell
- Public API: `index.ts`
- Root provider: `account.feature.ts` (`provideAccountFeature()`), wired from `app.config.ts`

## Routes

`/account` redirects to `/account/profile`. Each section is a full page:

- `/account/profile` — identity, avatar, first/last name and interface language
- `/account/security` — authenticator app (TOTP) and the two-step password change
- `/account/notifications` — the notification feed, filtered by category and paged on demand

The tree carries `authGuard`: no shell route in this application carries one, and every account
screen reads or writes the signed-in user.

**The account is a page of the workspace shell, not a shell of its own.** It shares the single
`DashboardLayout` mount with the organization tree, so opening it changes the content column and
nothing else — the same sidebar, the same header, the same collapse state, no shell rebuild. It is
never a panel, a secondary column, or a surface layered over another page.

`/account` names no organization, and nothing else selects one, so the shell shows exactly that:
the switcher displays its "no organization selected" state and the organization rows go inert
(`features/organization/FEATURE.md`). The account asks for no ambient organization — no identifier
to invent, no second answer to "which organization".

**The account is not a destination of the sidebar's navigation.** That column lists the work; the
reader reaches their own account through the seat menu pinned at its foot (`AccountMenu`), which
carries all three sections.

**The account is read-only until asked otherwise.** The profile shows its values; one Edit control
swaps the editable group — the two names and the interface language — for its form, in place, next
to the values being changed rather than in a dialog that would hide them (`ARCHITECTURE.md` §10.5).
Everything below it carries no affordance at all, because none of it can be changed here: the
address has no self-service endpoint, and the roles are granted by an administrator.

`features/organization` renders another member's profile at
`/organizations/:organizationId/members/:memberId`, sharing only `@shared/identity-summary` with
this one — the sameness a reader sees is that component, not a shared parent.

## State and Data Access

Root-provided stores:

- `UserStore` — the profile, its derived identity, and the SSR/`TransferState` handoff
- `NotificationStore` — the feed as `withEntities`, its paging, filter and Mercure stream

Page-scoped workflow stores (provided by the page, so an abandoned edit does not follow the user):

- `AccountProfileEditStore` — profile save and avatar upload
- `AccountPasswordChangeStore` — the two-step change, holding the challenge token that ties the
  steps together
- `AccountTotpEnrollmentStore` — setup, confirm and disable

Services:

- `UserProfileService` — `/api/me`, `/api/me/avatar`, `/api/me/password/{request,confirm}`
- `NotificationService` — `/api/notifications*` (including the bulk `/read-all`),
  `/api/notification-types`
- `TotpService` — `/api/otp/totp/{setup,confirm,disable}`

Every workflow store dispatches typed outcome events (`accountProfileEditStoreEvents`,
`accountPasswordChangeStoreEvents`, `accountTotpEnrollmentStoreEvents`). They exist so the app-wide
feedback listener can raise a toast: no account page renders an error surface of its own, because a
rejected save is a whole-request failure rather than a field problem (`ARCHITECTURE.md` §10.4).

## Published Contracts

- `USER_IDENTITY_PORT` / `UserIdentityPort`
- `USER_ACCESS_PORT` / `UserAccessPort`
- `USER_PROFILE_PORT` / `UserProfilePort`
- `NOTIFICATION_CENTER_PORT` / `NotificationCenterPort`
- `ACCOUNT_PERMISSION`, `ACCOUNT_PERMISSION_NAMES`, `AccountPermissionName`
- `UserPermissionService`
- `accountPermissionGuard`
- `withAccountMenu()`
- `provideAccountFeature()`

`AccountMenu` (`ui/components/account-menu/`) is account-owned even though it only ever renders
inside a layout: it reads user identity, and rendering location does not transfer ownership
(`ARCHITECTURE.md` §2.7). A shell contributes it to its sidebar-footer slot through
`withAccountMenu()` — the shell renders the component without importing it, and never learns that
a user profile exists. The menu consumes `AUTH_LOGOUT_PORT` for sign-out rather than reaching into
auth state.

It is the **only** way into the account, so it carries all three sections. Adding one to
`/account` means adding it here too, or it is unreachable.

These contracts are intended for shell consumers such as layouts and shared shell widgets,
plus approved external workflows that need to bootstrap or clear the authenticated user profile.
`accountPermissionGuard`/`ACCOUNT_PERMISSION`/`UserPermissionService` are the stable surface for
gating **global** (non-organization-scoped) permissions outside this feature.

## Cross-Feature Dependencies

- May be initialized or cleared by `features/auth` through `USER_PROFILE_PORT` after successful
  session restoration or logout.
- **Consumes `features/auth`'s published password policy** — `applyPasswordRules` and
  `applyPasswordConfirmation` — in the change-password form. Account owns the form; auth owns the
  policy, and is the single authority mirroring the API's constraints. Recorded in auth's
  `FEATURE.md`.
- Must not own auth guards, auth interceptors, or refresh-token behavior.
- `accountPermissionGuard`/`ACCOUNT_PERMISSION`/`UserPermissionService` may be consumed by other
  features to gate routes or UI on a global permission.

## Shell Integration Notes

- `provideAccountFeature()` binds account-owned ports to concrete stores using `useExisting`, and
  primes the notification center once a profile is present.
- Layouts should consume account ports instead of injecting account stores directly.

## Approved Exceptions

- **`qrcode` dependency.** The TOTP enrollment renders the `otpauth://` provisioning URI as a QR
  image. It is imported **dynamically and browser-only** inside `AccountMfaPanel`, so it never
  enters the SSR bundle, and a failure to render is swallowed: the setup key is printed beside the
  image, so a missing QR costs convenience rather than access. An Angular wrapper
  (`angularx-qrcode`, `ng-qrcode`) was rejected — both wrap this same library while pinning a peer
  range to the Angular major, which would gate the next Angular upgrade on the wrapper shipping.

## Invariants

- User profile remains account-owned even when auth bootstrap triggers its loading.
- Shell-level user identity and notification behavior must cross feature boundaries through ports.
- Account pages orchestrate account stores and render account-owned UI components; the panels and
  forms take `input()`s and emit `output()`s and inject nothing.
- **`UserProfileOutput.totpEnabled` (from `/api/me`) is the only authoritative source for whether
  TOTP is active.** `AccountTotpEnrollmentStore` tracks the in-progress workflow only, and calls
  `UserStore.reload()` after a successful `confirm`/`disable` so the flag propagates across the
  shell. `AccountSecurityPage` keys the panel's three states (not set up / pending confirmation /
  active) off `UserStore.profile()?.totpEnabled` and the store's transient `setupResult`; the panel
  itself holds no "enabled" flag of its own.
- An emptied name is sent as `null`, never as `''`: under merge-patch `null` clears the field, `''`
  is a blank name the API rejects, and omitting the key silently keeps the value the user deleted.
- **No account page renders anything derived from an absent profile.** `AccountProfilePage` and
  `AccountSecurityPage` both gate on `UserStore.profile() !== null` and show placeholders until it
  lands. This is not cosmetic: `totpEnabled` falls back to `false`, so rendering early tells a user
  with two-factor on that it is off, next to a button offering to set it up; and the profile form
  seeds from the profile, so rendering early presents empty fields as stored values that a save
  would then persist.
- `UserLocale` mirrors the backend `Locale::VALUES` byte for byte. TypeScript cannot catch a drift
  here; the symptom is a rejected `PATCH`.

## Not Built Yet

Backend endpoints exist for these; no frontend model, service method or store does:

- **Notification preferences** — `GET`/`PATCH /api/notifications/preferences` (per-category email
  and Mercure delivery). Distinct from the bulk `/read-all`, which **is** wired.
- **Account deactivation** — `POST /api/me/deactivate`. Self-service and irreversible without an
  administrator, so it needs a confirmation surface designed for that.
- **Active sessions and trusted devices** — the auth-owned stores and services are complete and
  specced; only the UI is absent.

Email cannot be changed by the user at all: `email` is read-only on `CurrentUserProfileOutput` and
absent from the input DTO, and no endpoint exists.
