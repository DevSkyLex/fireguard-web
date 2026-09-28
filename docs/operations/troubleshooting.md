# Web troubleshooting

Identify the failing boundary before changing configuration or replaying an operation. Use the deployment identity configured for the affected environment.

**Authoritative references:** [Deployment](../../DEPLOYMENT.md) · [Installation](current-installation.md).

## Startup or public configuration

Check the workflow's exact image revision/digest, Ansible configuration validation
and container health. Confirm that public API/Mercure URLs belong to the same
environment. A hosted bootstrap configuration failure must remain visible rather
than silently switching to a local fallback.

## HTTP and TLS

Separate DNS/TLS failure, Traefik routing, development Basic Auth and application
health. Development expects unauthenticated 401, authenticated final 200 and the
noindex header. Use bounded container/health diagnostics; avoid dumping environment
variables, registry credentials or user tokens.

## Realtime or synchronization

Verify an authorized subscription and a subsequent authorized collection read.
On reconnect, reload receipt/read positions. Confirm account/organization scope
before restoring local data. Preserve failed local drafts and surface conflict
review; do not erase IndexedDB as a routine retry step.

## Rollback

Follow the verified older-image procedure in DEPLOYMENT.md. Keep the configured
directory/project/container identities. The playbook rejects conflicts before
writing application files; resolve a conflicting identity deliberately before retry.
