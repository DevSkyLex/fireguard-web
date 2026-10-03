# Live API browser integration

This separate smoke uses the real Angular application, HTTPS API, PostgreSQL auth/main
databases, durable Messenger transports and Mercure hub. It imports no API mock, does not
install request routes, and uses browser `fetch` for writes so CORS, cookie handling and
multipart encoding are exercised by Chromium. The normal Playwright suite cannot prove
these boundaries.

The scenario signs in through the UI, reloads to rotate a Secure HttpOnly refresh cookie,
creates an organization and a site, prepares facility/equipment/inspection drafts in an
intervention, uploads and downloads inspection evidence, then submits and requests publication.
It waits for the real worker to finish, checks that every draft is published, checks the
durable notification, requires that same notification ID on the private Mercure stream,
and opens the resulting Angular facility detail page.

Run from the web repository after provisioning the isolated stack:

```text
npx playwright test --config=tests/e2e/live-api/playwright.config.ts
```

Check just this boundary with `npx tsc -p tests/e2e/live-api/tsconfig.json --noEmit`.
`playwright test --config=tests/e2e/live-api/playwright.config.ts --list` checks discovery
without opening a browser or claiming infrastructure coverage.

Required process settings (do not save passwords in repository files):

| Setting                             | Meaning                                                                   |
| ----------------------------------- | ------------------------------------------------------------------------- |
| `FG_LIVE_RUN_ID`                    | Unique lowercase letters/digits/underscore identifier, 4–64 characters    |
| `FG_LIVE_WEB_URL`                   | Trusted HTTPS app origin                                                  |
| `FG_LIVE_API_URL`                   | Trusted HTTPS API origin, different from the app origin                   |
| `FG_LIVE_MERCURE_URL`               | Trusted HTTPS Mercure subscriber endpoint                                 |
| `FG_LIVE_EMAIL`, `FG_LIVE_PASSWORD` | Active seeded test account, with onboarding already completed             |
| `FG_LIVE_READINESS_FILE`            | Nonsecret evidence JSON produced by successful real infrastructure probes |

Provision both disposable databases once for the run, migrate them using their explicit
auth/main configurations and seed the fixture baseline into those databases. Configure the
API, workers and web runtime with those exact URLs/database names. Run in a production-like
environment with durable transports: `APP_ENV=test` overrides Messenger transports to
`in-memory://` and cannot prove worker publication. Never point this smoke at development or
production data. Destroy only this run's stack/databases after collecting the report. The
scenario intentionally leaves records in its disposable database so failures are inspectable.

The readiness file must contain version `1`, the matching `runId`, `isolated: true`, an ISO
`checkedAt` within ten minutes, exact normalized `webUrl`, `apiUrl`, `mercureUrl`, separate
`databases.auth` and `databases.main` names containing `_test_`, `_e2e_` or `_live_` and this run
ID, plus successful probe entries with `command` and numeric `exitCode: 0`:

| Probe key         | Actual check before recording success                                                                   |
| ----------------- | ------------------------------------------------------------------------------------------------------- |
| `auth-migrations` | `doctrine:migrations:up-to-date --configuration=config/migrations/auth.yaml` against this run's auth DB |
| `main-migrations` | Same command with `config/migrations/main.yaml` against this run's main DB                              |
| `auth-worker`     | `php bin/worker-health.php` inside the auth consumer container                                          |
| `main-worker`     | Same heartbeat check inside the main outbox consumer container                                          |
| `worker-queues`   | `php -d memory_limit=1G bin/console app:workers:queues` against both run databases                      |

Do not manufacture this evidence from configuration or populate zero exit codes before
running the probes. The collector `collect-readiness.mjs` executes a nonsecret JSON probe plan,
verifies actual database identity through read-only SQL commands and writes the evidence only
after every command succeeds. Its plan contains URL/run metadata, the expected database names,
two `databaseCommands` arrays that print `SELECT current_database()` alone, and one command
array per probe in `probes`. Commands are argument arrays (executable first), never shell
strings. Invoke it as `node tests/e2e/live-api/collect-readiness.mjs <plan.json> <evidence.json>`.

TLS must be trusted by the host and browser. Web/API origins must share the same registrable
site for SameSite=Strict cookies while remaining distinct origins for CORS. Configure the web
public runtime API/hub URLs, API allowed CORS origin, Mercure subscriber CORS and its subscriber
JWT key together. Do not disable origin validation or TLS verification to make the smoke pass.

The sanitized response ledger, readiness artifact and JUnit report identify the real run.
Tracing/video remain disabled because login/refresh requests contain credentials. A listed
or typechecked scenario is not a passing integration run. If the Docker daemon or stack is
unavailable, report this suite as **not run**; hermetic SPA or SSR-stub results do not replace it.
