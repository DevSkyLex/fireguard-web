# Implementation follow up October 2026

This general implementation register follows the 47 review corrections across the
API, frontend, delivery tooling and demonstration project. It records the scenario,
expected behavior, regression evidence and current result for each correction.
It describes working copies reviewed on 2026-10-02 through 2026-10-03; deployment
acceptance and the final global gates remain separate.

**Implemented** means the source change and its stated regression evidence exist.
**Prepared** means a runnable suite/configuration or specification exists, without
the required environment execution. **External validation required** identifies
an operational check still needed. **Not done** is an explicit absent action.
A focused passing result applies to its named scope only. Counts below overlap and
must not be added together or substituted for full coverage or a deployed result.

Completed validation scopes are recorded below. The latest production build passes
with a 1.34 MB initial bundle and 304.03 kB estimated transfer, under the unchanged
1.80 MB maximum. The final Angular suite passes 7,925 tests with no pending cases.
The complete frontend instrumented coverage gate also passes: 26,999/28,756 lines,
93.89% against the unchanged 90% line minimum. Branch diagnostics report 84.52%.
The final full API suite passes 13,607 tests/86,068 assertions after the MFA fix.
Its complete instrumented coverage gate passes at 96.3876% lines (62,623/64,970),
with all 4,138 source files present and the existing 90% minimum retained.
API static/schema/default-style gates and fresh OpenAPI export/check also pass.
Final frontend canonical fixture contracts 45/45, sync/fingerprint/drift/type and
catalog extraction idempotence pass. The post-wrap SPA regression passed 24/24
(eight each desktop Chromium, Mobile Chrome and Mobile Safari) in 44.1s with two
workers and zero retries. Its 12 captures and CSS/ARIA measurements were inspected;
post-wrap rebuilt SSR passed 14/14, French 6/6 and Spanish 2/2 on matching runtime source.
An additional exact-catalog-label probe then found French mobile logout controls
and the dialog description clipped in both themes and engines. Root changed only
three button class attributes to allow mobile text wrapping, automatic height and
a 44px minimum height. Text and translation IDs are unchanged. Eight execution-only
catalogue-label probes passed in 34.6s across FR/ES, both mobile engines and themes.
French discard text occupies two lines/58px; every mobile action is at least 44px.
Button text, viewport and document containment passed; two real queued records were
retained and no POST occurred. The scope is catalogue button labels inserted in
running CSS; a fully translated dialog is not certified by this probe. Final source/manifest
and extraction checks passed after two source-XLF line-context metadata updates;
no message ID, source text or target translation changed.
The SPA matrix verifies actual IndexedDB queues and retained pending/failed records,
with no page or Angular console errors. Expected NG0505 hydration warnings remain
in this hermetic SPA harness. It runs in English and does not replace localized,
real SSR or live API acceptance.
A previous passing run does not certify source changed after that run.

Off-host backup and restore were not performed. Restic remains inactive and has no
selected destination. Deployment, Linux image/Ansible acceptance and a real live-API
stack run were not performed either. The code-drawn Promo has 4,616 validated frames
and verified musical 4K/1080p encodes. Its first soundtrack mux was rejected by the
validation guard; the correction now preserves every frame and validates the video,
audio and container at 76.933333 s. The former four delivery hashes are unchanged.
There is no new Demo application
capture from the intended clean source with verified provenance.

Evidence paths beginning with `API:` belong to the sibling `fireguard-api` repository;
`Demo:` paths belong to `fireguard-demo-video`. Other paths belong to this repository.
They refer to current source and reported local checks, not a published commit or
production artifact. Owning `FEATURE.md`, `MODULE.md`, deployment and coverage
contracts remain authoritative.

## Current validation ledger

| Boundary                         | Recorded result                                                                                                                                                                            | Remaining limit                                                                                                                                                                                                                                                                       |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Configured full API suite        | Full functional suite passed 13,607 tests/86,068 assertions in 5m14.970s; complete instrumented suite repeated that result in 7m49.846s, eight workers.                                    | Includes the MFA purge/setup fix; supersedes 13,599/86,022. Final metadata/OpenAPI/static/schema/default-style and complete 90% coverage gates passed; instrumented run had zero error/failure/skip.                                                                                  |
| API static and schema gates      | Final checks passed: PHPStan over 6,298 files, both Deptrac configurations, container lint, 68 YAML files, auth/main mapping and schemas, zero default-style differences.                  | Fresh OpenAPI export and make openapi-check passed with standard 403 Error references restored. Linux deployment remains unexecuted.                                                                                                                                                  |
| Full Angular unit suite          | Full functional suite passed 7,925; the final complete instrumented suite also passed 7,925/7,925, no failure/skip, 691 files and 1,923 suites.                                            | Supersedes 7,918 and includes final focus-provider/checklist changes. Current-source browser scopes and frontend 90% line coverage gate also passed; API coverage remains separate.                                                                                                   |
| Frontend lint and tooling        | Latest normal/real type-aware lint and 75 architecture tests passed; docblocks checked in 117 authored files and formatting checked over 4,580 files passed.                               | The three-button wrapping patch passed scoped HTML formatting and subsequent complete Angular coverage plus browser/label/CSS checks.                                                                                                                                                 |
| OpenAPI/fixture contracts        | Final API export/check and frontend canonical sync/fingerprint/drift/type checks passed, including contracts 45/45 after restored standard 403 Error schemas.                              | Immutable API commit provenance/read access for cross-repository CI is still configuration-dependent; uncommitted content hashes are not commit provenance.                                                                                                                           |
| Built SSR and localized browsers | Post-wrap rebuilt SSR 14/14 Chromium/WebKit passed in 21.7s; French 6/6 desktop/touch passed in 33.3s and Spanish 2/2 in 23.5s.                                                            | Source start/end matched the post-wrap build. Post-wrap SPA24, eight label probes and CSS/ARIA checks passed. Final source/sourceEnd/current manifest and byte-equal extraction also passed. Legacy 611 warnings/558 IDs per locale remain.                                           |
| Production build                 | Latest build passed: initial bundle 1.34 MB, estimated transfer 304.03 kB; maximum unchanged at 1.80 MB.                                                                                   | Earlier 4.30 MB failure was resolved through lazy loading/narrow bootstrap imports. The 700 kB warning remains. Latest post-wrap strict build passed in 26.931s; Post-wrap SPA/label/CSS/SSR/FR/ES scopes passed; the remaining 700kB and legacy i18n/CommonJS warnings are recorded. |
| Dependencies and catalogs        | npm audit reported zero advisories; production SBOM/license inventory contains 147 components. All 59 new translation IDs have target entries.                                             | There are 558 legacy missing IDs and 35 existing duplicate IDs per locale; this is not exhaustive translation coverage.                                                                                                                                                               |
| External operations              | Real API stack, Mercure restart replay, Linux image/Ansible delivery and off-host backup/restore have not run.                                                                             | Backup support is prepared and inactive, with no selected destination. A real operator-provisioned environment is required.                                                                                                                                                           |
| Demonstration                    | Latest Demo set passed 17 tests with zero skips, including real B-frame regression cases; capture/Remotion typechecks passed. Only the Demo opening-card image was rendered and inspected. | No new Demo application capture or spoken narration. Musical 4K/1080p Promo files each decode to 4,616 frames at 60 fps; video/audio/container durations are 76.933333s, AAC 48 kHz stereo. Prior deliveries remain hash-identical.                                                   |

## Authorization and durable workflows

| No. | Correction and scope                                       | Scenario and expected behavior                                                                                                                                                   | Proof and regression                                                                                                                                                 | Result                                                                                                                                                                                      |
| --- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Global OAuth revocation; Auth/OAuth persistence            | Revoke a user while issuance/refresh competes: no surviving usable token bypasses the revocation boundary.                                                                       | `API: UserTokenRevocationIntegrationTest.php` and `UserTokenRevocationConcurrencyIntegrationTest.php`; two PostgreSQL connections, rollback/concurrency regressions. | Implemented; concurrency set 7 tests/59 assertions passed. Latest full API suite passed 13,607/86,068 after the MFA fix; canonical OpenAPI/static/schema/default-style closure also passed. |
| 2   | OAuth scopes intersect RBAC; interactive operations        | Real PKCE/consent/refresh, insufficient scope and forged revoke: delegated grants never replace organization permissions or an interactive-session requirement.                  | `API: OAuthDelegationSecurityApiTest.php`, `OAuthRequestScopeSubscriberTest.php`; positive and denial mappings.                                                      | Implemented; included in passing owned Auth/OAuth scope.                                                                                                                                    |
| 3   | Effective organization roles and delegation                | Add/reactivate/invite/grant/join: resolve effective capabilities and refuse delegation the actor cannot grant.                                                                   | Organization grant/invitation command tests and provisioning controls; collection/detail access remains scoped.                                                      | Implemented; included in reported Organization/Calendar focused scope.                                                                                                                      |
| 4   | Async worker deployment                                    | Fresh installation/publication: initialized durable transports have a supervised consumer using the deployed application context.                                                | `API: compose.prod.yaml`, `ansible/deploy.yml`, worker runbook and maintenance tests; initialization before consumers.                                               | Implemented configuration; external deployment/consumption validation required.                                                                                                             |
| 5   | Five scheduler receivers                                   | Start a fresh scheduler: Maintenance, Intervention, Approval, Inspection and Organization receivers all have a consumer.                                                         | `API: docs/operations/workers-and-scheduler.md`, canonical `OPERATIONS.md` transport list and architecture checks.                                                   | Implemented configuration; actual sweep execution on target host not done.                                                                                                                  |
| 6   | Stop all writers before migrations                         | Rollout/fixture reset while jobs run: drain app and consumers before auth/main migrations and matching snapshots.                                                                | `API: ansible/tests/test_deployment_maintenance.py`; stop ordering, lock retention and failure scenarios in the runbook.                                             | Implemented; Linux service lifecycle validation required.                                                                                                                                   |
| 7   | Atomic recurring materialization, idempotence and recovery | Crash after draft creation or fail outbox enqueue: reservation, complete draft and schedule roll back; replay creates once. Legacy reservations require explicit reconciliation. | `API: DoctrineInterventionRecurrenceAdapterTest.php`; crash/outbox/recovery scenarios with real PostgreSQL.                                                          | Implemented; combined Intervention scope 72 tests/358 assertions passed, no per-point count claimed.                                                                                        |
| 8   | Encrypted off-host backup and restore                      | Missing destination/key/storage export fails before stopping writers; selected snapshot restores both histories and matching files in isolation.                                 | `API: ansible/tests/test_backup.py`, backup helper/example and migrations/backup runbook; synthetic failure/retention checks.                                        | Prepared. Restic activation is false; actual destination is unknown. No real snapshot or restore exercise done.                                                                             |
| 9   | ICS active-account access and uniform 404                  | Revoke account/membership/read access after minting a feed token: the feed stops exposing events with the established hidden-resource response.                                  | `API: CalendarFeedTokenApiTest.php`, `AccountStatusAdapterTest.php`; account/membership/permission lifecycle.                                                        | Implemented; included in reported Organization/Calendar scope.                                                                                                                              |
| 10  | OAuth audit identifier capacity without bearer data        | Issue a long token identifier: audit stores the JTI within the 100-character subject column and never a bearer token.                                                            | `API: OAuthDelegationSecurityApiTest.php`; long JTI regression. Auth migration `Version20261002120000`; `TokenIssuedEvent` carries JTI only.                         | Implemented; focused Auth evidence passed. Migration application on a deployed host not done.                                                                                               |
| 11  | Transactional transition/archive/snapshot events           | Outbox enqueue fails or an event is redelivered: the business mutation rolls back or retains stable event/receipt identity.                                                      | `API: Compliance/SafetyRegisterSnapshotRepositoryTest.php`, owning Equipment/Maintenance/Import modules; queue and consumption regression paths.                     | Implemented; included in reported Maintenance/Import focused checks.                                                                                                                        |
| 12  | Concurrent Equipment/Intervention attachment uploads       | Competing client IDs/path writes: preserve accepted bytes and the winner's row; rollback removes only the losing upload's own file.                                              | `API: AttachmentUploadConcurrencyTest.php`, attachment handler/repository tests and HTTP attachment scopes.                                                          | Implemented; focused scope passed. Real multi-process deployment still uses the documented storage contract.                                                                                |
| 13  | Stable keyset sweeps                                       | Process 401 recurrences/reminders while candidates shrink: an ID cursor avoids offset skips/duplicates.                                                                          | `API: DoctrineInterventionRecurrenceAdapterTest.php`, `DoctrineInterventionReminderAdapterTest.php`; real 401-row regressions.                                       | Implemented; included in passing Intervention scope.                                                                                                                                        |
| 14  | Resumable reminders and delivery receipts                  | Fail partway through recipient/channel fanout, then retry: completed local channels retain receipts and unfinished ones resume.                                                  | `API: NotificationDeliveryRecoveryTest.php`, reminder notifier tests; durable receipt and transaction checks.                                                        | Implemented; focused checks passed. Lost external SMTP acknowledgements may still repeat an email.                                                                                          |
| 15  | Atomic intervention drafts                                 | Second work item fails late: draft, items, activity and allocated number all roll back; corrected retry succeeds.                                                                | `API: DoctrineInterventionWorkflowGatewayAdapterTest.php`, `InterventionDraftFactoryTest.php`.                                                                       | Implemented; included in passing 72-test Intervention scope.                                                                                                                                |

## Scale and frontend durability

| No. | Correction and scope                            | Scenario and expected behavior                                                                                                                    | Proof and regression                                                                                                                              | Result                                                                                                                                                                                                                                                                                                                     |
| --- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 16  | Bounded maintenance memory at 20,000 equipment  | Sweep a large published inventory without hydrating every asset or clearing another caller's pending ORM entity.                                  | `API: MaintenanceImportBoundedWorkloadTest.php`; exact output, query/memory and retained-entity checks.                                           | Implemented; measured median 7.568 s, about 1,300 SQL statements, one managed entity, at most 4 MiB additional memory.                                                                                                                                                                                                     |
| 17  | Batched maintenance reads/writes                | Due-state processing scales by pages and commits each page without a per-equipment object graph.                                                  | Same PostgreSQL benchmark and Maintenance module batch contract; event/outcome equivalence checked.                                               | Implemented; passing Performance scope. Whole-sweep enclosing transactions are outside this supported page-commit contract.                                                                                                                                                                                                |
| 18  | Campaign count and cap 25                       | Preview/generate beyond the configured work-item cap: count truthfully and refuse before allocating a partial campaign.                           | `API: GenerateInspectionCampaignHandlerTest.php`, Maintenance module; bounded candidate read, cap default 25.                                     | Implemented; focused checks passed. Raising the cap requires reviewed performance evidence.                                                                                                                                                                                                                                |
| 19  | Append-only import outcomes and report pages    | Process/replay/resume thousands of rows: each outcome/receipt/counter commits once and reports paginate in file order.                            | `API: Import/MODULE.md`, `MaintenanceImportBoundedWorkloadTest.php`; migration `Version20261002031100`. Web report paging regressions.            | Implemented; API regression scope and frontend focused tests passed. Final canonical export/snapshot synchronization and contracts 45/45 passed.                                                                                                                                                                           |
| 20  | Stable ID tie-breakers                          | Equal visible sort values across pages: deterministic ordering avoids omitted/repeated records.                                                   | Maintenance/Import repository and workload/list regression checks; existing filter/permission scope retained.                                     | Implemented; focused repository checks reported passed.                                                                                                                                                                                                                                                                    |
| 21  | IndexedDB transaction completion/abort          | A request succeeds but its transaction later aborts: persistence must reject rather than acknowledge durability.                                  | `src/app/core/indexed-db/services/indexed-db/testing/indexed-db.service.spec.ts`; commit/abort checks included in offline lot.                    | Implemented; included in 217 tests/13 files passed, not an isolated 217-test database claim.                                                                                                                                                                                                                               |
| 22  | Pending-work logout protection and forced purge | Voluntary logout with queued work offers review/cancel; session replacement/forced logout cancels replay and purges protected state.              | Logout-protection, offline-lifecycle, replay and temporal specs; [pending logout browser scenarios](../../tests/e2e/auth/logout-pending.spec.ts). | Implemented; offline lots 217 tests and later 43 tests/5 files passed. Post-wrap SPA 24/24 and eight catalogue-label probes passed; actual IndexedDB pending+failed records, Cancel/Escape retention, offline/HTTP500 sync failure, explicit discard followed by logout HTTP 200 or 503, keyboard focus and ARIA verified. |
| 23  | Searchable paginated pickers                    | Select records on server pages containing the 101st/201st options, change search, then preserve the selected identity.                            | Facility/member/equipment picker and option-store specs; server search/pagination and independent selected-label recovery.                        | Implemented; scoped regressions and final 7,925-test Angular suite passed. Full picker/browser coverage is not inferred from the curated SPA scope.                                                                                                                                                                        |
| 24  | Organization civil calendar time                | Paris spring/autumn transitions and a local midnight on the previous UTC date: preserve instants and correct inclusive all-day coverage.          | `API: CalendarEventRepositoryTest.php`, `CalendarEventTest.php`, `CalendarFeedIcalWriterTest.php`; web Luxon calendar regressions.                | Implemented; backend and final full API/Angular suites passed. Specific civil-time rendering acceptance remains limited to the tested browser scenarios.                                                                                                                                                                   |
| 25  | Calendar CRUD, revision and pending guards      | Double submit, move failure and organization A→B→A: accepted writes settle once; stale results cannot overwrite the current context.              | Calendar page/feed-store tests; [Calendar contract](../../src/app/features/organization/features/calendar/FEATURE.md#invariants).                 | Implemented; full functional Angular suite passed; post-wrap curated SPA scope passed. Broader calendar interaction/rendering acceptance is not claimed.                                                                                                                                                                   |
| 26  | Lazy option stores with explicit request states | Open/search/page/retry/close a form: separate page/selected-value states, cancel obsolete reads and make no authenticated option read during SSR. | `calendar-facility-options.store.spec.ts`, feature option-store specs and owner contracts.                                                        | Implemented; focused checks and final Angular suite passed. Post-wrap rebuilt SSR scope passed 14/14; its request-free option-read boundary is limited to the tested routes.                                                                                                                                               |
| 27  | Accessible separate date/hour fields            | Keyboard and assistive technology users edit date/hour groups with individual labels and errors; invalid DST gaps remain visible.                 | Calendar component/form tests and browser completeness/multiday scenarios; no drag-only edit path.                                                | Implemented; included in final Angular suite. The curated logout browser matrix does not certify all calendar field interactions.                                                                                                                                                                                          |
| 28  | Progressive Intervention page extraction        | Captured command context and action mapping stay independent of edited form state and reusable orchestration remains with its feature.            | `intervention-detail-page/models/intervention-command-context.interface.ts`, command-action utility/spec and detail-page specs.                   | Implemented in part; extracted boundaries exist. Complete page decomposition is not claimed.                                                                                                                                                                                                                               |
| 29  | Primary control contrast                        | Light/dark and 90% hover primary fills retain readable foregrounds; decorative brand color remains separate.                                      | [Design tokens and measured ratios](../../DESIGN.md): 5.60:1 light, 4.80:1 light hover and 7.21:1 dark; `src/styles.css`.                         | Implemented; 12 post-wrap SPA captures and eight catalogue-label probes inspected; containment/ARIA pass. Actual CSS primary contrast is 5.6026:1 light and 7.2129:1 dark; anchor hover 4.8317:1/6.1456:1. Measured mobile actions are 44px high; scope is sampled controls.                                               |

## Contracts and validation gates

| No. | Correction and scope                                      | Scenario and expected behavior                                                                                                                                        | Proof and regression                                                                                                                                            | Result                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| --- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 30  | Billing discovery, unique cases and Stripe 503            | Former undiscovered cases enter canonical suites; preserve distinct webhook cases and map gateway failure through the query bus to HTTP 503.                          | `API: tests/Unit/Billing/CONSOLIDATION.md`, `BillingApiTest.php`, discovery guard. Former 38 tests audited individually.                                        | Implemented; discovery/consolidation evidence and final full API suite passed. Distinct webhook cases remain discoverable.                                                                                                                                                                                                                                                                                                                                                                      |
| 31  | Exact OpenAPI export/snapshot provenance                  | A changed API export, missing immutable source revision or stale frontend snapshot fails drift validation.                                                            | `API: bin/check-openapi.php`; [reference checker and synchronization contract](../../tests/contracts/README.md).                                                | Implemented checks; final canonical export/sync/fingerprint/drift/type and contracts 45/45 passed after restored HTTP 403 schemas. No verified API commit is recorded in source.json; CI requires an immutable API SHA and read access, failing closed until supplied.                                                                                                                                                                                                                          |
| 32  | Parameter validator correctness                           | Missing required parameters, invalid formats/scalars or unsupported serialization fail; repeated form arrays decode explicitly.                                       | [Validator negative/positive cases](../../tests/contracts/validator.spec.ts); path/query schema and serialization controls.                                     | Implemented; validator/populated focused 25 and final complete post-export contracts 45/45/type checks passed.                                                                                                                                                                                                                                                                                                                                                                                  |
| 33  | Populated fixture contracts and omitted nullable fields   | Eight collection families contain real-shaped items; omitted nullable non-conformity dates/notes remain legal.                                                        | [Populated fixture tests](../../tests/contracts/populated-fixtures.spec.ts), SSR fixture tests and SPA harness.                                                 | Implemented; SPA/SSR-stub harness 23, non-conformity UI 20 and final canonical post-403 complete contracts 45/45 passed. Current-source SPA acceptance is separate.                                                                                                                                                                                                                                                                                                                             |
| 34  | Browser with real API, workers and hub                    | UI login/refresh, org/site/equipment/inspection/publication, multipart and same-ID durable notification/SSE all cross actual HTTP/CORS/cookie boundaries.             | [Live suite](../../tests/e2e/live-api/README.md); fail-closed real readiness probes, isolated run identity and sanitized evidence ledger.                       | Prepared; targeted types/lint/discovery passed (one scenario). No isolated trusted-HTTPS stack was provisioned; smoke not run.                                                                                                                                                                                                                                                                                                                                                                  |
| 35  | Authenticated Messaging HTTP writes                       | Create participants/message/reply, PATCH/DELETE, multipart bytes and receipts; nonparticipant/foreign org writes leave persistence/events unchanged.                  | `API: tests/E2E/MessagingAuthenticatedWritesFlowTest.php`; operation `read:false` regression; anonymous presentation baseline retained.                         | Implemented; 2 tests/298 assertions passed in 17.858 s; baseline 9 tests/96 assertions passed. Recorded realtime port does not prove hub delivery.                                                                                                                                                                                                                                                                                                                                              |
| 36  | PR/mobile/SSR/locales and release engine matrices         | PR runs desktop/mobile Chrome and mobile Safari, real SSR Chromium/WebKit and FR/ES; releases add desktop Firefox/WebKit.                                             | [Browser boundary contract](../guides/testing.md#browser-boundaries), CI/Playwright configurations; nine generic Firefox skips removed after 25 passing probes. | Implemented CI matrix; 25 targeted Firefox probes passed. document.startViewTransition feature-detection skip remains. Post-wrap SPA 24 passed (8 each desktop Chromium/MobileChrome/MobileSafari), no retries. Post-wrap rebuilt SSR 14/14, French 6/6 and Spanish 2/2 passed; eight catalogue-label probes/CSS/ARIA and final canonical metadata/extraction manifest checks passed. All 12 settled SPA captures inspected, ARIA references resolve and measured mobile actions are 44px high. |
| 37  | Working type-aware floating-promise gate                  | A real typed unhandled-promise sentinel must fail before the application lint can report success.                                                                     | `tools/lint/check-type-aware.mjs`, `.oxlintrc.type-aware.json`, `lint:type-aware` script; installed engine and sentinel.                                        | Implemented; real sentinel and scoped type-aware lint passed.                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 38  | Coverage policy and bounded sensitive mutation            | Configured complete coverage gates require 90% executable-line coverage; branch diagnostics remain visible. Refresh/Stripe comparison/logical mutants must be killed. | [Coverage policy](../../COVERAGE.md), API coverage policy and `infection-sensitive.json5`.                                                                      | Implemented gates; reported bounded mutation 28/28 killed. Complete frontend coverage gate passed: 26,999/28,756 lines, 93.89%; branch diagnostics 84.52%. Complete API gate passed: 62,623/64,970 lines, 96.3876%, all 4,138 sources present; native API branches were not collected. No repository-wide mutation or 90% branch threshold claimed.                                                                                                                                             |
| 39  | Baselines and bounded scale budgets                       | Frozen workload hashes/queries and maintenance/import volume scaling stay within reviewed budgets.                                                                    | `API: tests/Performance/README.md` and three ignored benchmark artifacts; real PostgreSQL scope.                                                                | Implemented; Performance 3 tests/32,645 assertions passed. Maintenance 7.568 s; import 1k/5k/10k append 8.057/41.714/85.233 s, resume ten queries. 10k exceeds accepted CSV cap.                                                                                                                                                                                                                                                                                                                |
| 40  | Canonical commands, safe test setup and graphic contracts | Wrapper commands select proper runners; isolated auth/main templates replace development reseeding; Markdown diagrams/links resolve.                                  | [Testing](../guides/testing.md), [local development](../guides/local-development.md), API test bootstrap/runbooks and documentation checker.                    | Implemented docs/tooling; this register and repository documentation passed: 53 docs, 258 links, 6 diagrams, zero errors, using the already installed Chromium.                                                                                                                                                                                                                                                                                                                                 |

## Operations and demonstration delivery

| No. | Correction and scope                                  | Scenario and expected behavior                                                                                                                      | Proof and regression                                                                                                                      | Result                                                                                                                                                                                                                                                                                                                                                                           |
| --- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 41  | Heartbeats, queue age and durable sweep freshness     | Receiver loop stalls, queue ages or sweep marker goes stale: probe fails even if HTTP is green; restart does not reset the persistent baseline.     | `API: WorkerHeartbeatSubscriberTest.php`, `InspectWorkerQueuesCommandTest.php`, `bin/worker-health.php` and worker runbook.               | Implemented checks; target-host heartbeat/queue/sweep acceptance required. No production health inferred from static configuration.                                                                                                                                                                                                                                              |
| 42  | Isolated webhook worker                               | Slow webhook delivery cannot starve ordinary main-outbox/async work.                                                                                | `API: compose.prod.yaml` separate `webhook_worker`, transport setup and documented supervised consumers.                                  | Implemented configuration; actual concurrent service isolation validation external.                                                                                                                                                                                                                                                                                              |
| 43  | Mercure 1.0.2 persistent Bolt and strict restart gate | Private anchor/sentinel survive restart; exact pre-restart sentinel replay and denial/token-redaction checks pass.                                  | `API: DEPLOYMENT.md`, `.github/scripts/check-mercure-contract.py`, `ansible/tests/mercure-replay.py`; pinned digest, 10k Bolt cap.        | Prepared acceptance gate and implemented configuration. Docker daemon unavailable; actual restart/replay not run.                                                                                                                                                                                                                                                                |
| 44  | Migration/warmup failure closes deployment            | Failed migration, warmup or health keeps writers stopped and installation lock held; restore both histories/files or finish forward safely.         | `API: ansible/tests/test_deployment_maintenance.py`, migrations/backup and monitoring runbooks.                                           | Implemented fail-closed flow; Linux rollout/failure drill not done. Image rollback alone never establishes data recovery.                                                                                                                                                                                                                                                        |
| 45  | Runtime bounds and immutable delivery tooling         | Nonroot Node drains SIGTERM; bounded logs/resources, image digests and pinned Actions/tool versions retain identity across rollout.                 | Docker/Compose/server shutdown changes, API/web deployment tests; 105 Action uses across 13 files pinned to SHA40 and pin checker passed. | Implemented source/configuration; Linux image build and Ansible acceptance not done. No deployed runtime result claimed.                                                                                                                                                                                                                                                         |
| 46  | Reproducible Demo source/type/provenance              | Capture requires clean intended frontend, records commits and clip hashes, and rejects snapshots/reused servers; version card discloses mocked API. | `Demo: scripts/prerequisites.test.mjs`, capture/normalize source, shared timing and `demo-accessibility.test.mjs`.                        | Implemented support; latest Demo set passed 17 tests with zero skips and both typechecks passed. Only opening-card image preview rendered/inspected; no new Demo application capture or complete Demo film. The separately code-drawn Promo delivery is validated.                                                                                                               |
| 47  | Complete Promo frames and atomic validated MP4        | Missing/interior/surplus frames, shortened video/audio or failed mux must preserve previous valid delivery.                                         | `Demo: scripts/promo-validation.test.mjs`; exactly 4,616 frames at 60 fps, stream/container/audio duration checks and atomic replacement. | Implemented; included in 17 passing Demo tests, including real B-frame mux regressions with zero skips. Final musical 4K/1080p files each pass decoded frame count 4,616, 60 fps and video/audio/container duration 76.933333 s; AAC 48 kHz stereo/full audio decode passed. First shortened mux refused; corrected atomic delivery leaves four prior delivery hashes unchanged. |

## Focused evidence inventory

The recorded results are completed local scopes, not an arithmetic coverage total:

- **Auth/OAuth:** 1,148 tests/4,916 assertions reported passed in the widened owned
  scope; existing Integration/Auth plus OAuth flow controls 33 tests/264 assertions
  passed separately. Revocation files are under
  `API: tests/Integration/OAuth/Infrastructure/Adapter/Token/`; HTTP delegation is
  `tests/Functional/Api/OAuthDelegationSecurityApiTest.php`; the scope subscriber
  spec is under `tests/Unit/Auth/Infrastructure/EventSubscriber/`.
- **Organization/Calendar:** reported combined filter 1,089 tests/5,608 assertions
  passed. It covers grants/invitations/account status/calendar boundaries; it does
  not establish a browser rendering result. The offset database regression is
  `API: tests/Integration/Calendar/Infrastructure/Persistence/Doctrine/Repository/CalendarEventRepositoryTest.php`.
- **Intervention:** 72 tests/358 assertions reported passed, plus scoped static
  checks. Recurrence/reminder files are under
  `API: tests/Integration/Intervention/Infrastructure/Adapter/{Recurrence,Reminder}/`;
  draft rollback is in `Workflow/DoctrineInterventionWorkflowGatewayAdapterTest.php`.
- **Maintenance/Import:** focused suite reported 147 tests passed; latest import
  regressions 15 tests/610 assertions passed. Performance suite reported 3 tests/
  32,645 assertions passed. Main migrations are `Version20261002031000` and
  `Version20261002031100`; target rollout remains pending.
- **Frontend feature work:** reported 242 targeted tests, then 60 tests after later
  corrections, passed; architecture 75/75, TypeScript, normal/typed lint and
  documentation passed at that worker's scope. This includes picker/import/QR and
  private assistant history support, not a final all-browser result.
- **Offline/session work:** 217 tests/13 files passed for replay/offline/IndexedDB,
  then 43 tests/5 files for PWA/time/logout/lifecycle. Those lots preserve session
  fencing, outbox durability and conflicts. The post-wrap SPA scope passed
  pending-work retention and focus restoration; exhaustive session flows are not claimed.
- **Messaging HTTP:** the 298 assertions above are actual authenticated HTTP and
  PostgreSQL checks. The recorded realtime port remains a separate limit.
- **Final browsers:** post-wrap English SPA 24/24 across three projects passed
  in 44.1 s; its 12 captures and CSS/ARIA measurements are under
  `.tmp/review-captures/logout-pending-20261002-wrapped-final/`.
  Eight catalogue-label containment probes passed in 34.6 s; their evidence is under
  `.tmp/review-captures/logout-translated-20261002-post-fix/`.
  Post-wrap SSR 14/14 passed in 21.7 s, French 6/6 in 33.3 s and Spanish 2/2 in 23.5 s.
  Logs are `tmp/e2e-ssr-wrap-run.log`, `tmp/e2e-localized-fr-wrap.log` and
  `tmp/e2e-localized-es-wrap.log`. Final metadata rebuild passed in 35.700 s;
  canonical source/sourceEnd/current hashes all equal
  `0a0884a663a6b59cd20167e6750785be936fffa4760a5a5d724a836ebca7b6ab`, with
  4,646 Git-filtered authored inputs and sourceChanged=false. The 560-file bundle
  is byte-identical before/after metadata updates, hash
  `da812bf1edb34f336692bbd726fd6c3b8746b6d4cd9297ef97b3d00b786d04c7`.
  Temporary extraction of 5,221 messages is byte-equal to canonical source-XLF,
  SHA `bf846bcf5c8a50fc9606d457580d15e937514ab01ff33497c3e9f16a85dd7349`.
  Only two logout message source-location contexts changed; IDs/text/targets did not.
  Content hashes are not commit IDs; the older artifact-inclusive SPA digest is not
  a canonical authored-source inventory.
- **Frontend full coverage:** current-source complete instrumented suite passed
  7,925/7,925 tests, no failure/skip, 691 test files and 1,923 suites. Summary and
  LCOV agree across 2,797 application files: 26,999/28,756 lines, 93.89% for the
  exact threshold check (V8 displays truncated 93.88%); branches 17,589/20,809,
  84.52%; functions 9,197/10,157, 90.54%; statements 30,787/33,519, 91.84%.
  `--report` and `--enforce` both passed at the unchanged 90% line minimum.
  Source before/after equals the canonical hash above. Reports are
  `coverage/fireguard-web/lcov.info` and `coverage-summary.json`; logs are under
  `.tmp/full-coverage-final-*`. Branches are diagnostic, not a passed 90% threshold.
- **API full coverage:** complete instrumented suite passed 13,607 tests/86,068
  assertions, no error/failure/skip, eight workers with Xdebug 3.4.6, in 7m49.846s;
  reported memory was 306 MB. Collection and the unchanged 90% line gate both
  exited zero. All 4,138 application source files are present: 62,623/64,970 lines,
  96.3876%; methods 8,318/9,098, 91.43%; classes 2,787/3,194, 87.26%. Native
  configuration did not collect branch coverage, so no API branch percentage is
  claimed. Evidence is `API: var/coverage/final-20261002/{run.log,clover.xml,coverage.txt,gate.log,summary.json,junit.xml}`.
- **CI/contracts:** validator/populated set 25 tests, reference checker 2 tests,
  SPA/SSR-stub harness 23 tests and non-conformity UI 20 tests reported passed.
  Final canonical post-403 complete contracts 45/45, sync/fingerprint/drift/type
  checks passed. Extraction of 5,221 messages left source/FR/ES hashes unchanged
  on the second run, preserving all 59 new targeted translations. Mutation
  killed 28/28 generated mutants without escape/error/timeout, limited to the
  configured RefreshToken/Stripe handlers. Action pin checks passed in both repos;
  local dependency audits reported no advisories, with 147 production web components
  and 152 API production license declarations inventoried. License declarations do
  not establish legal compatibility or deployment health.
  API/web CI concurrency groups use a `ci-` prefix so a reusable CI call cannot
  cancel its parent release through an identical group. The four CI/release YAML
  files parsed successfully; no workflow publication or release was executed.
- **Demo:** the earlier owned set passed 15/15 in 157 ms; the latest set passed
  17 tests with zero skips after the real B-frame mux regressions. Capture and
  Remotion typechecks passed. `accessibility:prepare` emitted one visual guide and metadata
  under ignored `out/accessibility/demo-sBwCti`. The old manifest's dirty versions
  and 2026-09-07 date were retained and labelled unverified. No captions/transcript
  were generated because no real narration was supplied. The isolated preview is
  `out/accessibility/version-card-preview.png`; it is not a delivered film.

## Additional corrections and product follow up

Auth worker MFA now refuses use without an active factor, fails closed on lookup
failure and purges private authentication material according to its owner. The
purge-versus-setup fix passes 21 focused tests/149 assertions and the final full API
suite. `API: tests/Integration/Otp/TotpEnrollmentDeletionConcurrencyTest.php`
covers both lock orders, stale authenticated setup after deletion and rollback
after secret deletion. `SetupTotpHandlerTest.php` checks fresh status within the
lock and technical failure before secret generation/save; `TotpEnrollmentSecurityApiTest.php`
checks real enrollment/confirmation/protected disable, DELETE 204, outsider 403,
missing 404 and post-delete old-token setup 401 without a secret. The pre-fix
reproduction had two failures in two tests/nine assertions. Restored HTTP 403 Error
metadata, fresh OpenAPI export/check and final static/schema/default-style gates
all pass; the bounded API/frontend contract review is coherent with no frontend
DTO change. No main-database, foreign-key or migration change was made. The
reported focused 778-test result is a subset/earlier scope, not added to the Auth
total. Trusted API-origin interceptors, refresh-subject consistency and cross-tab
refresh have reported 25- and 60-test focused results and are included in the final
Angular suite. Offline PWA/draft-quota refinements are included in the completed
offline/session scopes. The curated SPA pass does not certify every session flow.

Assistant model context now reads a chronology suffix anchored to the same user's
accepted question and thread, using a single SQL LIMIT 20. The model transcript is
bounded to 20 messages and 24,000 Unicode body characters; the latest accepted
question retains its 8,000-character bound and separate context its 4,000-character
bound. Stored history and TTL are unchanged. Focused validation passed 274 tests/
1,031 assertions, including a real PostgreSQL case with 120 messages returning only
20 rows in one query, plus scoped PHPStan/style/docs/diff checks over 13 files.
The final full API suite includes the new functional cases. Four OAuth outcome log
patterns no longer write raw IP addresses, and UserCreated/Verified INFO logs retain
user_id without email/username. This bounded change is not an exhaustive log purge
or evidence of a bearer-token leak. No DTO or migration changed.

[Product iterations after stabilization](../product/next-iterations.md) specifies
offline tour preparation, guided CSV import, Workload simulation with unknown
capacity and optional last day of month. These are **specified**, not new runtime
features. Existing QR scope selection (1–500), private assistant discussion history
and calendar `date`/`view` browser-history state are **implemented**.

The Demo has an actual preparation exporter, visual guide and optional WebVTT/SRT/
text export contract bound to the montage fingerprint. It has **no new spoken
narration or verified new application capture**. The separate code-drawn Promo has
a completed, validated 4K sequence of 4,616 frames and final musical 4K/1080p encodes.
The first mux lost four frames and was refused; the corrected mux preserves all
frames, with 76.933333 s video/audio/container duration and AAC 48 kHz stereo audio.
The final audio decode passed. Root and the delivery worker viewed decoded
publication/outro stills as readable. Evidence is retained under
`Demo: out/validation-20261002-complete-promo/validation-manifest.json` and
`ffprobe-final-music.json`; four former delivery hashes remain unchanged.
The manifest explicitly identifies a simulated interface drawn in code, an unborn
Git HEAD and SHA snapshots of the working tree; it does not label these as a clean
filmed frontend commit.
There is no claim of a new live-app recording. Real subtitles require
real supplied words, final-film timestamps and listening review; source preparation
cannot supply that evidence.

## Remaining acceptance

The API, full functional Angular, tooling and canonical contract results above are
completed local evidence. The earlier SPA/SSR/localized and CSS results precede the
confirmed French mobile clipping defect and three-button wrapping patch. Post-wrap
SPA 24/24, eight label probes, CSS/ARIA checks, SSR 14/14, French 6/6 and Spanish 2/2
passed, as did the strict production build with the unchanged maximum. Final metadata
manifest and byte-equal extraction checks are also complete.
The earlier full functional suites ran without coverage collection. The verification
scope was expanded: complete frontend and API instrumented coverage both passed
their unchanged 90% line thresholds. PHP Xdebug and the frontend V8 provider were
available; missing drivers were not a blocker. Frontend branches remain diagnostic,
and native API branch coverage was not collected. The bounded mutation result
applies to its configured RefreshToken/Stripe scope.
Cross-repository CI still needs a verified immutable API revision and appropriate
read access. Preserve the actual reports with their source identity when recording
these remaining results.

External acceptance still requires a selected backup destination and deliberate
activation, a real isolated snapshot/restore exercise, the live API/browser stack,
Mercure restart replay and Linux delivery/failure drills. Final Promo soundtrack
delivery passed after the rejected mux was corrected. There is no new verified Demo
application capture. Repository source and focused tests cannot certify those
environments or replace the missing capture.
