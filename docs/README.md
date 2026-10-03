# Documentation

Start with the [repository README](../README.md). This index separates normative
contracts from explanations and environment-specific operational information.

## Authoritative references

- [Architecture](../ARCHITECTURE.md): dependencies, ownership and construction rules.
- [Deployment](../DEPLOYMENT.md): delivery and runtime configuration contract.
- [Coverage](../COVERAGE.md): complete-suite acceptance and its limitations.
- [SonarQube](../SONARQUBE.md): analysis identity and deployment readiness.
- [Design](../DESIGN.md) and [Product](../PRODUCT.md): presentation and product constraints.

## Guides and operations

- [Code comments and JSDoc](guides/code-comments.md)

- [System overview](architecture/system-overview.md)
- [Patterns and examples](architecture/patterns-and-examples.md)
- [Local development](guides/local-development.md)
- [Organization and access](guides/organization-and-access.md)
- [Testing](guides/testing.md)
- [Current installation](operations/current-installation.md)
- [Implementation follow up October 2026](operations/review-implementation-2026-10.md)
- [SSR and hydration](guides/ssr-and-hydration.md)
- [Collaboration](guides/collaboration.md)
- [Interventions and offline](guides/interventions-and-offline.md)
- [Product iterations after stabilization](product/next-iterations.md)
- [Facilities and spatial views](guides/facilities-and-spatial-views.md)
- [Troubleshooting](operations/troubleshooting.md)

## Owner contracts

- [account](../src/app/features/account/FEATURE.md)
- [auth](../src/app/features/auth/FEATURE.md)
- [error](../src/app/features/error/FEATURE.md)
- [maintenance](../src/app/features/maintenance/FEATURE.md)
- [onboarding](../src/app/features/onboarding/FEATURE.md)
- [organization](../src/app/features/organization/FEATURE.md)
- [approvals](../src/app/features/organization/features/approvals/FEATURE.md)
- [audit](../src/app/features/organization/features/audit/FEATURE.md)
- [automations](../src/app/features/organization/features/automations/FEATURE.md)
- [calendar](../src/app/features/organization/features/calendar/FEATURE.md)
- [checklists](../src/app/features/organization/features/checklists/FEATURE.md)
- [collaboration](../src/app/features/organization/features/collaboration/FEATURE.md)
- [equipments](../src/app/features/organization/features/equipments/FEATURE.md)
- [facilities](../src/app/features/organization/features/facilities/FEATURE.md)
- [imports](../src/app/features/organization/features/imports/FEATURE.md)
- [inspections](../src/app/features/organization/features/inspections/FEATURE.md)
- [interventions](../src/app/features/organization/features/interventions/FEATURE.md)
- [maintenance-schedules](../src/app/features/organization/features/maintenance-schedules/FEATURE.md)
- [webhooks](../src/app/features/organization/features/webhooks/FEATURE.md)
- [workload](../src/app/features/organization/features/workload/FEATURE.md)

## Documentation conventions

Write in English. State what a document governs and link to its authoritative
owner. Preserve public names, security requirements and contextual invariants.
Use `example.com`, `<organization-id>`, `<module>` and configured variables for
illustrations; keep real installation values in the installation appendix.

Keep dependency versions in manifests, command inventories in the Makefile or
package scripts, and HTTP schemas in the generated OpenAPI contract. Label
historical observations with their date and scope. A historical successful run
does not establish current health. Keep examples and implementation inventories
separate from the owning feature/module contract.

Preserve linked headings when moving an explanation: leave a short rule and a
link at the original heading. Place Mermaid blocks in the document owning the
relationship. Explain arrow direction and include a prose equivalent. Rendered
SVGs are review artifacts; the Markdown block remains the diagram source.

## Validate documentation

From `.github/documentation` run:

Dependencies are isolated and locked in [the tooling manifest](../.github/documentation/package.json),
including the [official Mermaid CLI release](https://github.com/mermaid-js/mermaid-cli/releases/tag/11.17.0).

```sh
npm ci
npm test
npm run check
```

The isolated Node.js 22 tools check project Markdown in the root, `src/`, `tests/e2e/`
and `docs/`. Agent instructions, installed skills and dependency trees are outside
this scope. Local targets, images, references and Markdown fragments are checked;
code examples and comments are omitted. External URLs require editorial review.
All Mermaid blocks are rendered. A broken link, unknown heading or invalid diagram
fails the check; tests verify those failure gates using actual fixtures.

`npm run check -- --output-dir <directory>` retains source diagrams, SVGs and
JSON results in the chosen directory; otherwise an OS temporary directory is used.
CI retains its `documentation-diagrams` artifact for seven days. Review diagram
labels and layout as well as parser success. This check complements the existing
application tests, architecture, coverage and deployment gates.

Current npm versions may require explicit approval of Puppeteer's installation
script. If browser installation is pending, run its official installer from this
directory with `node node_modules/puppeteer/install.mjs`, then rerun the checks.
