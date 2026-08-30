# Account Feature

## Purpose

Owns authenticated user account data exposed to the shell and account-facing pages.

This feature is responsible for:

- user profile state, its editable fields and the avatar,
- the authenticated password change and the authenticator-app (TOTP) enrollment lifecycle,
- the authenticated half of the sign-in email change (request and cancel; the public
  confirmation page belongs to `features/auth`),
- self-service account deactivation (`POST /api/me/deactivate`),
- notification center state and UI,
- shell-facing user identity, access, and notification contracts,
- current-user global permission helpers built on the account-owned access contract,
- account-specific pages under `/account`, including the caller's own organization membership
  list and self-service "leave" at `/account/organizations` — the ability itself is
  organization-owned (see Cross-Feature Dependencies).

This feature does not own authentication, session restoration, or auth transport concerns. Those
belong to `features/auth` — including **active sessions and trusted devices**, whose stores and
services (`SessionStore`, `TrustedDeviceStore`, `SessionService`, `TrustedDeviceService`) live in
`features/auth` because they are session-lifecycle concerns. `/account/security` renders their UI
(`AccountSessionsPanel`, `AccountTrustedDevicesPanel`), a placement decision that is not a transfer
of ownership: `AccountSecurityPage` injects both auth-owned stores directly, scoped to the page
(`providers: [SessionStore, TrustedDeviceStore]`), the same way it already scopes its own workflow
stores.

## Entry Points

- Routes: `account.routes.ts`, mounted from `app.routes.ts` under the one `DashboardLayout` shell
- Public API: `index.ts`
- Root provider: `account.feature.ts` (`provideAccountFeature()`), wired from `app.config.ts`

## Routes

`/account` redirects to `/account/profile`. Each section is a full page:

- `/account/profile` — identity, avatar, first/last name and interface language
- `/account/security` — authenticator app (TOTP), the sign-in email address (current address +
  the change-email dialog), the two-step password change, active sessions, trusted devices, and
  the danger zone carrying self-service account deactivation
- `/account/organizations` — the organizations the caller is a member of, each with its logo, name,
  and (for a non-owner) a "Leave" control; the active workspace is marked. Data and the leave
  mutation come from `features/organization`'s `MY_ORGANIZATIONS_PORT` — see Cross-Feature
  Dependencies
- `/account/notifications` — the notification feed, filtered by category and paged on demand
- `/account/notifications?tab=preferences` — the per-category delivery matrix (email / in-app), each
  switch its own commit

The tree carries `authGuard`: no shell route in this application carries one, and every account
screen reads or writes the signed-in user.

**The account is a page of the workspace shell, not a shell of its own.** It shares the single
`DashboardLayout` mount with the organization tree, so opening it changes the content column and
nothing else — the same sidebar, the same header, the same collapse state, no shell rebuild. It is
never a panel, a secondary column, or a surface layered over another page.

`/account` names no organization, but the shell keeps the one last worked in, so the switcher still
names a workspace and the organization rows still lead into it
(`features/organization/FEATURE.md`). The account itself asks for no ambient organization: it reads
none, and nothing on the page changes with the one the sidebar happens to show.

**The account is not a destination of the sidebar's navigation.** That column lists the work; the
reader reaches their own account through the seat menu pinned at its foot (`AccountMenu`), which
carries every section.

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
- `NotificationStore` — the feed as `withEntities`, its paging, filter and Mercure stream.
  `unreadCount` is a state field fed by `GET /api/inbox/unread-count`, never derived from the
  loaded page: that derivation stops counting at the page size, which is exactly when the badge
  matters. The inbox endpoint is preferred over `/notifications/unread-count` — the two agree
  today, and the inbox one keeps agreeing once Messaging registers mentions and direct messages
  as sources. Local actions keep it honest between fetches: marking one read decrements it,
  marking all read zeroes it.

Page-scoped workflow stores (provided by the page, so an abandoned edit does not follow the user):

- `AccountProfileEditStore` — profile save and avatar upload
- `AccountPasswordChangeStore` — the two-step change, holding the challenge token that ties the
  steps together
- `AccountTotpEnrollmentStore` — setup, confirm and disable
- `AccountDeactivationStore` — self-service account deactivation. The endpoint takes no body and
  is idempotent; on success the backend has already revoked every server-side session, so
  `AccountSecurityPage` performs the logout flow's local half — `AUTH_SESSION_PORT.clearSession()`
  (token, profile, `sessionEnded`) — and navigates to `/auth/login`. The confirmation dialog adds
  no typed-name or password gate, because the API asks for none; its copy states the verified
  backend behavior: reactivation is admin-only (`POST /users/{id}/activate`), signing in again
  does **not** reactivate — a deactivated login is rejected as invalid credentials.
- `AccountEmailChangeStore` — the sign-in email change: `POST /api/me/email-change` (202,
  verifies the current password, emails a confirmation link to the NEW address) and the
  idempotent `DELETE /api/me/email-change` (204). Confirmation is NOT this store's job — the
  emailed link lands on auth's public `/auth/email-change/confirm` page. **Known limit,
  by backend design**: there is no `GET` for a pending request, so the "link sent to X"
  panel (with its Resend and Cancel controls) lives exactly as long as the page does — a
  reload shows the plain form again. That is safe: requesting again REPLACES the pending
  request server-side, and cancel is idempotent. Resend reopens the dialog with the pending
  address prefilled and asks for the password again, because the password is required by the
  API and never retained client-side. Failures toast the backend's neutral RFC 7807 detail
  (wrong password → 422, "This email address cannot be used." → 409, rate limit → 429);
  the accepted request and the cancellation stay toast-free — their outcome is the panel swap
  on screen.
- `AccountNotificationPreferencesStore` — the notification preferences matrix. The category list is
  derived from the type catalog (`GET /api/notification-types`), never hard-coded, so a category
  added server-side appears without a frontend change. A category with no server row is enabled on
  every channel — the absence of a row is the "everything enabled" default — and the page merges
  the explicit rows over that default. The `PATCH` answers with the full customized set, so a
  successful commit refreshes the canonical rows without another `GET`. A failed commit leaves the
  canonical rows untouched and raises the error toast, but the flipped switch keeps its local
  position until the next successful load — the same trade the organization notifications form
  makes. The matrix is a Signal Forms field tree over the dynamic row list, rendered as a real
  `<table>`; the in-flight lock deliberately does **not** use the schema's `disabled()` — natively
  disabling the focused switch mid-save drops keyboard focus (WCAG 2.4.3), so the fields stay
  enabled, `aria-disabled` marks the lock, and the commit handler plus the store's `exhaustMap`
  gate the race. Load failures render `@shared/error-state` (with retry) and an empty catalog
  renders `@shared/empty-state`, inside a polite live region — the toast stays the message
  channel.

Services:

- `UserProfileService` — `/api/me`, `/api/me/avatar`, `/api/me/password/{request,confirm}`,
  `/api/me/email-change` (request + cancel; the public confirm is auth's `EmailChangeService`),
  `/api/me/deactivate`
- `NotificationService` — `/api/notifications*` (including the bulk `/read-all` and
  `/notifications/preferences`), `/api/notification-types`
- `TotpService` — `/api/otp/totp/{setup,confirm,disable}`

Every workflow store dispatches typed outcome events (`accountProfileEditStoreEvents`,
`accountPasswordChangeStoreEvents`, `accountTotpEnrollmentStoreEvents`,
`accountNotificationPreferencesStoreEvents`, `accountDeactivationStoreEvents`, `accountEmailChangeStoreEvents`). They exist so the app-wide
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
- `withNotificationBell()`
- `provideAccountFeature()`

`AccountMenu` (`ui/components/account-menu/`) is account-owned even though it only ever renders
inside a layout: it reads user identity, and rendering location does not transfer ownership
(`ARCHITECTURE.md` §2.7). A shell contributes it to its sidebar-footer slot through
`withAccountMenu()` — the shell renders the component without importing it, and never learns that
a user profile exists. The menu consumes `AUTH_LOGOUT_PORT` for sign-out rather than reaching into
auth state.

It is the **only** way into the account, so it carries every section — the three main pages and
the notification preferences matrix. Adding a page to `/account` means adding it here too, or it
is unreachable.

`NotificationBell` (`ui/components/notification-bell/`) is account-owned for the same reason, and a
shell contributes it to its header-actions slot through `withNotificationBell()` (`order: 7`, between
the global search and the assistant toggle). It is the only ambient signal that a notification
arrived; the notification centre itself stays at `/account/notifications`.

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
- **Injects `features/auth`'s `SessionStore` and `TrustedDeviceStore` directly** in
  `AccountSecurityPage`, scoped to that page. Recorded in auth's `FEATURE.md`.
- **Consumes `features/auth`'s `AUTH_SESSION_PORT`** in `AccountSecurityPage` to purge the local
  session after a successful account deactivation — the same `clearSession()` the 401 path uses.
- **Consumes `features/organization`'s `MY_ORGANIZATIONS_PORT`** in `AccountOrganizationsPage` —
  the caller's own organization memberships and the ability to leave one, entirely through the
  port; this feature imports no organization store, service, or dialog directly. Recorded in
  organization's `FEATURE.md`. The page's own destructive confirmation
  (`AccountLeaveOrganizationDialog`, `ui/dialogs/`) is a **local** component rather than a
  cross-boundary import of `OrganizationLeaveDialog`, per `DESIGN.md` Action Surfaces rule 5 — each
  destructive confirmation is a per-case local component, and account may not import
  organization-owned UI regardless.
- Must not own auth guards, auth interceptors, or refresh-token behavior.
- `accountPermissionGuard`/`ACCOUNT_PERMISSION`/`UserPermissionService` may be consumed by other
  features to gate routes or UI on a global permission.

## Shell Integration Notes

- `provideAccountFeature()` binds account-owned ports to concrete stores using `useExisting`, and
  primes the notification center once a profile is present.
- Layouts should consume account ports instead of injecting account stores directly.

## Approved Exceptions

- **`NotificationBell` injects `NotificationStore` directly.** `.claude/rules/components.md` reserves
  store injection for pages. A slot-root component is the orchestrator of its own surface, with no
  page above it to inject on its behalf — the same exception `OrganizationSwitcher` takes. It stays
  read-mostly: `load()` on first open, `markAsRead()` on click, nothing else.
- **`qrcode` dependency.** The TOTP enrollment renders the `otpauth://` provisioning URI as a QR
  image. It is imported **dynamically and browser-only** inside `AccountMfaPanel`, so it never
  enters the SSR bundle, and a failure to render is swallowed: the setup key is printed beside the
  image, so a missing QR costs convenience rather than access. An Angular wrapper
  (`angularx-qrcode`, `ng-qrcode`) was rejected — both wrap this same library while pinning a peer
  range to the Angular major, which would gate the next Angular upgrade on the wrapper shipping.

## Invariants

- User profile remains account-owned even when auth bootstrap triggers its loading.
- Shell-level user identity and notification behavior must cross feature boundaries through ports.
- **The bell's panel is capped at `max-h-[165.75px]`, which is exactly three rows.** A row is an
  `hlmItem size="xs"` and measures 55.25px, identical on chromium and webkit; 165.75px holds three
  and cuts cleanly, leaving no sliver of a fourth. Two things about `HlmPopoverContent` make this
  work and must not be undone: its base `gap-2.5 p-2.5` is neutralised with `gap-0 p-0` so the
  separators run full-bleed, and `overflow-hidden` is then **required** — the primitive is
  `rounded-lg` without it, because its own padding normally keeps children off the corners, so
  full-bleed children would square them off. Any change to a row's padding or line count breaks the
  cap — re-measure rather than adjusting it by eye.
- **`/account/notifications` is one page with two tabs**, the feed and the preference matrix,
  selected by `?tab=inbox|preferences` (default `inbox`). They were two routes; they share the
  same type catalog and splitting them put "stop sending me these" a navigation away from "read
  these". The old `/account/notifications/preferences` survives as a `RedirectFunction` to
  `?tab=preferences`, so existing links and bookmarks still land. The matrix fetches its rows on
  first activation of its pane, never on arrival at the feed.
- **The bell is a popover, not a dropdown menu.** `CdkMenuItem.trigger()` closes the whole menu
  stack on every click and takes no per-item opt-out, so marking one notification read inside a
  dropdown would dismiss the panel. Measured on chromium and webkit before the switch.
- **The bell's unread dot reads `NotificationStore.unreadCount`, never `hasUnread`.** `hasUnread` is
  derived from the loaded entity collection, which is empty until the menu has been opened once;
  only the count, primed from `/api/inbox/unread-count` by `provideAccountFeature()`, is meaningful
  before then. Its spec locks this.
- **Leaving the organization currently open in the workspace navigates to `/organizations`**,
  which re-resolves the next accessible workspace or onboarding. Leaving any other organization
  only removes its row from `/account/organizations` — no navigation. This mirrors
  `OrganizationSettingsPage`'s retired `navigateAwayOnLeave` and must be preserved if the leave
  surface ever moves again.
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

- `AccountOrganizationsPage`, `AccountLeaveOrganizationDialog`, and `MyOrganizationsStore`
  (organization-owned, backing `MY_ORGANIZATIONS_PORT`) ship without unit specs or an e2e spec —
  scaffolded together with the port for `fg-web-test-writer` and `fg-e2e` to cover.
- The "last organization" case for leave is deliberately undefined here: leaving a member's only
  remaining organization succeeds against the backend (nothing blocks it beyond
  owner/last-administrator) and the page navigates to `/organizations` exactly as for any other
  active-organization leave; whether that should route to onboarding instead, or read
  differently on this page, has not been decided — flag before shipping broadly.

The sign-in email change (formerly listed here) shipped: request/cancel on `/account/security`,
public confirmation on auth's `/auth/email-change/confirm`.
