# SonarQube

The hosted Community Build uses independent private projects
`fireguard-web-main` and `fireguard-web-develop` at
<https://sonarqube.valentin-fortin.pro/>. Each project analyzes one Git branch
as its main branch. Do not set `sonar.branch.name` or send pull request analyses.
The API follows the same convention with `fireguard-api-main` and
`fireguard-api-develop`; histories and issue triage are independent.

## GitHub configuration

These repository settings were provisioned on 2026-09-22; never commit a token:

| Setting                        | Value                                              |
| ------------------------------ | -------------------------------------------------- |
| Variable `SONAR_HOST_URL`      | `https://sonarqube.valentin-fortin.pro/`           |
| Secret `SONAR_TOKEN_MAIN`      | Project analysis token for `fireguard-web-main`    |
| Secret `SONAR_TOKEN_DEVELOP`   | Project analysis token for `fireguard-web-develop` |
| Variable `SONAR_READY_MAIN`    | `true` after the main baseline is verified         |
| Variable `SONAR_READY_DEVELOP` | `true` after the develop baseline is verified      |

The four project-scoped analysis tokens across the front and API expire on
**2026-12-21**. Rotate each before that date and replace only its matching
GitHub secret. The token is provided only to the analysis job,
selected by an explicit branch mapping. A missing main token never falls back
to the develop token. Both readiness variables are currently `false`: the four
initial scans, their new-code baselines and the first validated gates are still
pending. Publication and deployment remain disabled for both branches without
preventing diagnostic CI runs.

## Analysis and coverage

CI scans pushes and manual runs on `main` and `develop`. It checks out the exact
commit with full Git history, installs dependencies for TypeScript resolution,
and imports the same run's `coverage/fireguard-web/lcov.info` artifact. Missing
reports and analysis failures fail CI. Dependencies, generated Helm sources,
environment files and localization catalogs are outside the analysis scope.
Source and test files are classified separately.

Keep the native **Sonar way** quality profiles and gate on both projects. CI waits
up to 600 seconds for the exact submitted analysis and requires `PASSED`; an
unavailable service or token, failed background task, timeout or red gate blocks
the corresponding branch's delivery. The existing 90% executable-line test
coverage requirement and Codecov upload remain independent checks.

## First analyses and activation

1. The four private projects and their project-scoped analysis tokens have been
   created, and `SONAR_HOST_URL` and the two secrets are configured in each repo.
2. Land the CI configuration on both branches, with readiness unset. The
   `workflow_run` consumers must also exist on the repository's default branch.
3. Run CI manually for each branch. A diagnostic manual CI never automatically
   publishes an image or deploys it. The SonarQube analysis must finish processing;
   a red first gate can still provide a usable baseline for inspecting results.
4. Verify source coverage, resolved paths, exclusions, and absence of TypeScript
   parsing errors. Check the installed SonarJS version supports the project's
   TypeScript 6.0.3; do not downgrade Angular or TypeScript to hide incompatibility.
5. Set each verified analysis as that project's fixed new-code baseline through
   SonarQube's `api/new_code_periods/set` (`type=SPECIFIC_ANALYSIS`, the project's
   main branch name, and the verified analysis ID). Do not use a sliding window or
   change the baseline on every build. An administrator performs this operation.
6. Rerun CI and confirm the gate passes, then set the corresponding readiness
   variable to `true`. Start Docker Image manually to publish the validated commit,
   or let the next successful push trigger normal delivery.

SonarQube tokens are not application credentials. Expired or revoked tokens must
be replaced in the matching GitHub secret; never weaken the gate to work around
an authentication problem.

## Image provenance and rollbacks

The Docker workflow accepts automatic events only from successful push CI runs
on `main`/`develop` in this repository. It verifies the latest eligible CI attempt
for that SHA and requires the exact successful scan and quality-gate steps.
Automatic publication/deployment additionally requires that SHA to still be the
branch tip. GitHub API failures and absent validation evidence fail closed.

Images carry OCI source/revision labels. Deployment resolves the requested tag
to a digest, pulls that immutable image for label inspection, and verifies CI
for its source revision on the selected environment's branch. The VPS receives
only the verified digest. `source_run_id` is supplied by automatic publication;
leave it empty for an intentional manual deployment or rollback.

An older successful commit remains eligible for a manual rollback when its
validation evidence is available. A newer failed attempt for that same commit,
missing evidence, incorrect labels or another repository/branch deny deployment.
Images created before this integration need valid evidence and labels before
they can be used. A develop result never authorizes production.

See [DEPLOYMENT.md](DEPLOYMENT.md) for image inputs and environment settings.
Validate tooling locally with `node --test .github/scripts/*.test.mjs` and
`actionlint` against the modified workflows; application suites run through the
normal CI and are not duplicated by deployment.
