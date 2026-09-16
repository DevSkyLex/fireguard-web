# Bounded E2E verification

## Final status — 2026-09-13

The planned interaction, contract, application-composition and test-harness corrections
are implemented in the existing dirty branch. The latest intervention-detail polish adds
the active-tab border alignment, circular activity icon rails, encoded-mention
normalisation, and a denser, padding-free Properties grid. Installed Spartan components and
upstream skill payloads were not edited. No commit, PR or merge was performed.

The independent architecture and accessibility reviews found no new actionable P1/P2 in
their bounded static scopes. This is not proof of every runtime state. Current commands and
environment limits are documented in [README.md](README.md).

| Check                                  | Executed result                                                                                   | Evidence                                                                                                                                                                                                                                                                                                                                                                         |
| -------------------------------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Angular unit/integration suite         | 6,035/6,035 tests, 591 suites; `npm run test:ci`                                                  | Terminal gate                                                                                                                                                                                                                                                                                                                                                                    |
| Route inspection                       | 100/100 assertions and evidence generation passed; Chromium; source unchanged during the run      | [Gallery](artifacts/mobile-visual-review/branch-review/implementation-final-current-r2-100-20260913/index.html), [JSON](artifacts/mobile-visual-review/branch-review/implementation-final-current-r2-100-20260913/results.json)                                                                                                                                                  |
| Intervention-detail and overlay replay | 24/24 passed in Chromium + WebKit; includes filter, overlay and discussion flows                  | Terminal gate                                                                                                                                                                                                                                                                                                                                                                    |
| Isolated harness                       | 138/138 expected outcomes; Chromium + WebKit, including deliberately verified safety-net failures | [JSON](artifacts/mobile-visual-review/branch-review/implementation-harness-current-20260913/results.json)                                                                                                                                                                                                                                                                        |
| Real SSR smoke                         | Build passed; 8/8 tests in Chromium + WebKit                                                      | [Build identity](artifacts/ssr-smoke/implementation-final-20260913/server/build.json), [request ledger](artifacts/ssr-smoke/implementation-final-20260913/server/server-requests.json), [Chromium mobile](artifacts/ssr-smoke/implementation-final-20260913/ssr-chromium/mobile.json), [WebKit mobile](artifacts/ssr-smoke/implementation-final-20260913/ssr-webkit/mobile.json) |
| French and Spanish catalogs            | 1/1 per locale; compiled localized HTML at 390px/light                                            | [FR evidence](artifacts/mobile-visual-review/branch-review/implementation-localized-fr-20260913/locales/fr/evidence.json), [ES evidence](artifacts/mobile-visual-review/branch-review/implementation-localized-es-20260913/locales/es/evidence.json)                                                                                                                             |
| Local tooling                          | 38 hook tests, 13 review-check tests and 12 Python tests passed; integrity validation passed      | [.codex documentation](../.codex/README.md)                                                                                                                                                                                                                                                                                                                                      |

Formatting, lint, E2E TypeScript, production build, i18n extraction and git whitespace
checks passed during this implementation. The production build still reports the known
bundle-budget/CommonJS and historical translation warnings; those warnings are not being
relabelled as a warning-free build. JSDOM still emits its unsupported canvas/navigation
warnings.

## Corrected behavior

- Filter drafts are captured once on opening. External source updates cannot overwrite an
  active draft. Validation emits before explicit closure; cancellation discards the draft.
  Browser checks assert committed values, URL parameters and displayed results.
- Interaction-capability consumers use the published port. Automatic mode classification remains
  separate from geometry; a narrow desktop retains desktop controls and navigation.
- Native slot injection preserves the parent drawer context. Search shortcuts work with the
  mobile trigger unmounted; an open parent closes before the search dialog opens. Search
  ownership is feature-local and initialisation remains browser-only.
- Only the topmost overlay responds to its own backdrop. Successful route navigation closes
  Quick actions; rejected navigation does not. Enabled focus destinations replace disabled
  plan-picker openers. Public CDK focus-region boundaries address iOS tab containment.
- All five Quick actions use readable native icon/text rows with full-width targets.
  Navigation labels, measured bottom spacing, native Card sizing, tabs and single-page
  pagination were corrected through application composition, without editing installed
  Helm sources.
- The intervention detail uses the public paginated-tabs composition, places its active
  underline on the page-header border, gives activity markers a bordered circular rail,
  resolves legacy HTML-escaped mention tokens safely, and keeps Properties rows compact.
- Invalid drawer inputs, untyped selection payloads, readonly casts and touched
  documentation were corrected. The E2E harness rejects wrong methods/organisations,
  incomplete or occluded targets, missing/corrupt images and unexpected requests.

The interaction replay covers filter apply/cancel and draft preservation, nested overlays,
Ctrl/Cmd+K with the parent closed or open, Escape, backdrop, pointer swipe, focus
restoration, appearance Tab/ShiftTab and plan-picker-to-editor focus. It does not save plan
geometry or pins.

## Source identities and sequencing

HEAD remains `204bf2f6f4aa8a605304436b3d9a96bb02ae37f0`; the reviewed `develop` baseline is
`427c0ec161f17b29ee1333e5999c8835637e3e10`. Evidence records the dirty authored tree, not
HEAD alone. Pre-existing unrelated changes are preserved.

Every current evidence sidecar records its own revision, source fingerprint, dirty state,
file count and `sourceChanged` result. Fingerprint scope excludes secret environment files,
dependencies and generated artifacts; it includes authored E2E files. A later documentation
or harness edit can therefore change a checkout fingerprint without changing product code or
an emitted bundle. No run name containing “final” is treated as evidence for subsequent edits.

The final inspection is regenerated after the last application edits. Locale and SSR
sidecars identify the exact source/build state used by their respective runs. The working
tree remains intentionally dirty so unrelated user changes are not lost.

## Route and visual coverage

The matrix contains 30 source-backed routes/open surfaces at 390×844 in light and dark (60),
plus eight representative surfaces at each of phone 375×812/light, phone 458×915/dark,
tablet 1024×1366/dark, narrow desktop 375×844/light and desktop 1440×1000/dark (40). See
the [inventory](support/helpers/mobile-visual-matrix.ts) and gallery for exact scenarios
and retained scroll frames.

It includes Home, More, interventions/list/detail/create, assets, equipment, facilities,
inspections, checklists, maintenance, calendar, approvals, imports, messages, saved
messages, channels/conversations, members, teams, roles, settings, billing, audit and
account surfaces. Primary fixtures are bounded and populated, including Teams, Checklists,
Calendar and Saved messages.

The review specifically checks both the shell and the intervention detail: page-header tab
geometry, activity rails, mentions, Properties density, bottom navigation, drawers, sheets,
filters, forms, focus restoration and the desktop-narrow classification. Contact sheets
support a broad layout review, not pixel-level inspection of every retained scroll frame.
At short heights, content and some actions require scrolling; critical-action checks verify
complete bounds and absence of occlusion after bringing the target into view, not simultaneous
visibility of every control.

## Remaining verification limits

- Security session/provider catalogs and notification-preference categories are empty. Their
  populated rows are not validated. Dense catalogs, every permission combination, all
  loading/error/invalid-form states and the complete business state space remain outside this
  bounded pass.
- Business writes, export contents, billing portals and populated search-result navigation
  across organisations were not executed against a real backend.
- FR/ES checks use real localized builds and matching `/me` profile locales. They verify More,
  navigation, nested Quick actions, notification unread labels and Search close/focus, not
  every translated route. Fixture business text remains English.
- Seventeen IDs were completed in each translation catalog. Final extraction finds no newly
  missing ID, but 229 historical IDs remain missing per locale. The Spanish capture still
  shows “Appearance: Light”; these passes do not certify a fully translated interface.
- SSR verifies login HTML before JavaScript, local server refresh 401, hydration, rejected
  fixture login and anonymous onboarding redirection. It does not verify authenticated
  dashboard SSR: those workspace routes deliberately use client rendering.
- Chromium/WebKit emulation does not prove physical iPhone/Android behavior, OS keyboards,
  real safe areas, hardware input detection or assistive-technology behavior.
- Type-aware `no-floating-promises` remains disabled because its required engine is absent.
  The compatible toolchain upgrade is deferred; no implicit TypeScript migration was made.
- Server and browser signals cannot perfectly classify every iPad or privacy-hardened
  browser. Unknown or contradictory evidence deliberately falls back to desktop.

The SSR API stub is reachable by the server, with browser/server egress constrained to the
harness. No real account, database or secret environment file was read. The final inspection
found no harness listeners on ports 4273–4277 and no temporary certificate/key files in the
SSR artifact tree. The user's app on 4200 was left untouched.

## Preserved failure history

Earlier results remain on disk rather than being relabelled as current success:

- [First frozen mobile replay](artifacts/mobile-visual-review/branch-review/final-adaptive-20260913/results.json): 24 passed / 8 failed. It exposed the true parent-context and Appearance focus defects corrected above, alongside assertions tied to outdated internal structure.
- [Focus diagnostic](artifacts/mobile-visual-review/branch-review/final-focus-diagnostic-20260913/results.json): 3 passed / 3 failed. Filter keyboard focus passed; iOS appearance containment required the later public-boundary correction.
- [Changing-source Home/nav attempt](artifacts/mobile-visual-review/branch-review/ready-home-nav-20260913/results.json): transient Vite compile-overlay evidence, not a valid visual confirmation.
- [Earlier strict harness](artifacts/mobile-visual-review/branch-review/ready-harness-scoped-20260913/results.json): exposed tolerant bootstrap mocks. The repaired hermetic harness rejects those requests.
- The first localized attempts retained routing/assertion-scope failures. Search's close button is a sibling of the command palette; the final assertion uses the native dialog's accessible name. This was a test-scope fix, not a product-code workaround.

Missing/invalid expected images fail evidence generation independently of product test status.
No corrupt image or harness gap is silently reported as a product defect; no test is skipped to
obtain a green result.
