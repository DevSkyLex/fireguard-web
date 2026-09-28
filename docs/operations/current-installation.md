# Current installation

This appendix records the non-secret installation identity documented in the
repository at baseline `72ef54750d81fa00d566849806b309fd52c6ce28` (reviewed 2026-09-28). It is an
installation record, not evidence of live health or a replacement for GitHub
environment variables. Verify configured values before operational changes.

## Deployment identity

| GitHub environment | Branch    | Domain                                  | VPS directory                           | Docker project               | Channel tag |
| ------------------ | --------- | --------------------------------------- | --------------------------------------- | ---------------------------- | ----------- |
| `production`       | `main`    | `app.fireguard.valentin-fortin.pro`     | `/srv/apps/fireguard/production/front`  | `fireguard-production-front` | `latest`    |
| `development`      | `develop` | `dev.app.fireguard.valentin-fortin.pro` | `/srv/apps/fireguard/development/front` | `fireguard-dev-front`        | `develop`   |

GitHub environment variables and secrets configure deployment; the workflow and
Compose/playbook definitions remain authoritative. Preserve existing directories,
projects, containers and volume identities when changing delivery tooling.

Production uses container/router `fireguard-web`, project `fireguard-production-front`
and `/srv/apps/fireguard/production/front`. Development uses `fireguard-dev-front`
and `/srv/apps/fireguard/development/front`. Both retain the configured application
port (4000 by default) and external `traefik_proxy` network.

## SonarQube installation

- Host: `https://sonarqube.valentin-fortin.pro/`.
- Projects: `fireguard-web-main` and `fireguard-web-develop`, one Community Build project
  per Git branch, with independent analysis histories.
- Matching secrets: `SONAR_TOKEN_MAIN`, `SONAR_TOKEN_DEVELOP`.
- Readiness variables: `SONAR_READY_MAIN`, `SONAR_READY_DEVELOP`.

The prior deployment record dated 2026-09-22 stated a token expiry of 2026-12-21.
Treat that as historical metadata: verify current token expiry in SonarQube and
rotate each matching GitHub secret according to operational policy. No token
value is recorded here. [SONARQUBE.md](../../SONARQUBE.md) defines the gate contract.

## Operational ownership

The operator's private configuration owns credentials, backups, incident contacts,
retention and service objectives. Follow [deployment](../../DEPLOYMENT.md) for
image/rollback validation. Review installation records when those identities change;
ordinary examples in guides use reserved domains and configured variables.
