# VPS deployment

**Reading guide:** [Documentation index](docs/README.md) · [Related guide](docs/operations/current-installation.md).

The Angular SSR frontend is built once and configured when the container starts.
`main` deploys production; `develop` deploys a separate development project.
Configure the VPS directory and Docker identity for each environment; the current
values are recorded in the [installation appendix](docs/operations/current-installation.md).

| GitHub environment | Branch    | Installation values              | Channel   |
| ------------------ | --------- | -------------------------------- | --------- |
| `production`       | `main`    | Configured production variables  | `latest`  |
| `development`      | `develop` | Configured development variables | `develop` |

Each image gets a `sha-<full commit>` tag and OCI labels identifying its repository
and commit. Deployment always resolves the image to a `sha256` digest and verifies
its provenance and the CI result for the corresponding commit.

## Runtime configuration

The SSR server reads these variables at startup:

- `APP_API_URL`
- `APP_MERCURE_HUB_URL`
- `APP_NAME`
- `APP_MAINTENANCE`

The public configuration resolved on the server is passed to the browser through
`TransferState`. The server also exposes it at `/runtime-config.json`: browser
bootstrap loads it before creating services, so a cached PWA shell retains the
configuration of the environment serving it. The service worker favors SSR for
navigation and keeps this public configuration as an offline fallback for 24 hours.

The `src/environments/environment*.ts` files remain fallbacks for local Angular
commands and contain no VPS-specific configuration. A hosted deployment fails at
startup if its runtime endpoint is unavailable or invalid instead of falling back
to another environment's configuration.

## GitHub environments

`production` accepts only `main`. `development` accepts only `develop`. VPS connection
values are stored separately in each environment so a `develop` job cannot read
production secrets.

Required secrets:

- `VPS_HOST`
- `VPS_USER`
- `VPS_SSH_KEY`
- `GHCR_TOKEN` if the workflow token is insufficient
- `BASIC_AUTH_USERS` in `development`, in the htpasswd format accepted by Traefik
- `BASIC_AUTH_CREDENTIALS` in `development`, as `username:password`, only for the public health check

Required variables:

- `VPS_PORT`, `VPS_APP_DIR`, `VPS_APP_PORT`
- `APP_HOST`, `APP_API_URL`, `APP_MERCURE_HUB_URL`, `APP_NAME`, `APP_MAINTENANCE`
- `DOCKER_PROJECT_NAME`, `DOCKER_CONTAINER_NAME`, `TRAEFIK_ROUTER_NAME`
- `GHCR_USERNAME`

The `docker-compose.dev.yml` override applies Basic Auth only to the frontend and
adds `X-Robots-Tag: noindex, nofollow, noarchive`. The API retains its Bearer headers
without Basic Auth middleware.

## Pipeline

1. `CI` checks pull requests and pushes to `main` and `develop`. Pushes and manual runs on these branches analyze their SonarQube project and wait for its quality gate.
2. `Docker Image` publishes the `sha-*` image and updates `latest` or `develop` after a push whose CI and SonarQube checks passed for that commit. Manual CI diagnostics do not publish automatically. A manual publication must find a valid CI run for the requested commit.
3. `Deploy VPS` checks the repository, OCI revision, branch-specific SonarQube result, and digest before accessing the VPS. It selects the GitHub environment from the branch and runs `ansible/deploy.yml` over SSH using pinned controller dependencies. The playbook checks for at least 2.5 GiB of available memory and 10 GiB of free disk space, validates the existing container identity and Compose configuration, then applies the verified image.
4. The container must become healthy. The public check follows redirects, verifies Basic Auth in development, and confirms the presence of `noindex`.

The repository variables `SONAR_READY_MAIN` and `SONAR_READY_DEVELOP` must
explicitly be set to `true` after the initial analyses are validated. See
[SONARQUBE.md](SONARQUBE.md) for secrets and rollout steps. A verification error
blocks delivery; a `develop` result never validates production. GitHub
`production`/`development` protections remain tied to `main`/`develop`.

## Ansible deployment

Ansible runs on the GitHub Actions runner. The VPS keeps its existing application
directories, Docker projects, container names, port and external Traefik network.
Preserve the container identities recorded in the
[installation appendix](docs/operations/current-installation.md). Ansible manages
application delivery; Docker, Traefik and DNS must already be provisioned.

The GitHub environment variables remain the deployment contract. Before writing
files, the playbook rejects an existing container whose Compose project or working
directory differs from that contract. It does not remove a conflicting container.
It copies the image source's Compose files into `VPS_APP_DIR` and renders the existing
`.env` there with mode `0600`, preserving literal dollar signs in Basic Auth hashes
and runtime values. Secret-bearing tasks disable output and diffs.

Registry credentials are isolated in a temporary Docker configuration directory and
removed even if deployment fails. SSH credentials and inventory are also temporary
runner files. Docker Compose waits for container health, followed by the existing
public HTTP checks. As with the previous deployment, replacing the single container
can cause a brief interruption; this is not a zero-downtime deployment.

`CI` includes a real isolated Compose deployment test for production and development.
It verifies runtime configuration, Basic Auth/noindex labels, repeated deployment
without replacing the existing container, and rejection of a conflicting project,
directory or mutable image. The fixture uses a public image and disables Traefik
exposure; it neither uses VPS secrets nor contacts the VPS.

Run this validation locally on a Linux Docker host (including Docker Desktop):

```sh
docker build -t fireguard-web-ansible-tests -f ansible/tests/Dockerfile .
docker run --rm \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v "$PWD:/workspace:ro" \
  -e ANSIBLE_ROLES_PATH=/workspace/ansible/roles \
  fireguard-web-ansible-tests \
  sh -eu -c 'ansible-playbook --syntax-check -i "fireguard_vps," ansible/deploy.yml; ansible-playbook -i "localhost," ansible/tests/deploy.yml'
```

## VPS prerequisites

- Docker Engine and the Docker Compose plugin
- SSH access from GitHub Actions
- Python 3.9 or newer at `/usr/bin/python3` for Ansible modules
- External `traefik_proxy` network
- Traefik with the `websecure` entrypoint and `letsencrypt` resolver
- DNS A records pointing the domains to the VPS

## Rollback

Rerun `Deploy VPS` from the environment's branch with an older image reference,
`ghcr.io/devskylex/fireguard-web:sha-<commit>`. A development rollback affects
only the development environment's configured `VPS_APP_DIR` and Docker project.

Leave `source_run_id` empty for a manual rollback. The image must have provenance
labels, and its commit must have passed CI and SonarQube on the environment's
branch. The workflow checks the latest applicable attempt and deploys the
verified digest; images without validation evidence are rejected.

The workflow checks out its current commit for Ansible tooling and the verified
image's commit separately for Compose files. Rollback therefore also works with
images published before Ansible was added, using their original Compose definition.

## Delivery verification flow

Delivery follows a successful check of the exact source revision, its SonarQube gate and image provenance. Ansible then applies the immutable image using the selected installation identity and health checks.


Arrows show delivery order. A validated development image never authorizes a
production deployment. The workflow defines which events publish/deploy and how
documentation-only changes are classified. Installation values are recorded in the
[appendix](docs/operations/current-installation.md); runtime secrets stay private.
