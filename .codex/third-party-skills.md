# Official skills and FireGuard constraints

The installed third-party skills are `spartan` and `design-taste-frontend`.
Their official payloads stay unmodified. The source, pinned revision, license and integrity
policy live in `.agents/skills.lock.json`; updates follow [maintenance.md](maintenance.md).

Official `spartan` is mandatory for presentation implementation, review and browser validation,
together with the applicable FireGuard skill. `fg-web-spartan` owns FireGuard's component,
form, collection, overlay and design-review guidance. Load only relevant official rule files.

`design-taste-frontend` provides design judgment for the tasks its actual description and
instructions cover, including landing pages, portfolios and redesigns. Its declared exclusions are
dashboards, data tables and multi-step product UI; do not invoke it for those surfaces.
For a FireGuard critique, first establish the user goal and inspect the current artifact;
use Taste only where its scope and the requested judgment fit.

AGENTS.md, ARCHITECTURE.md, DESIGN.md, PRODUCT.md and feature contracts remain authoritative.
Keep installed Nova primitives, the documented typography/palette, semantic tokens, Signal Forms,
SSR and ownership boundaries. Upstream examples do not authorize a stack/font/dependency
change, a parallel design system, edits to installed Helm, or regeneration of the palette.
A deliberate design change needs the user's requested scope, not an upstream default.

Taste is not a replacement for accessibility measurements, browser validation or the project's
test harness. The design reviewer reports visual evidence and uncertainty; the a11y auditor
checks semantics/interaction; the e2e runner verifies behavior in a real browser.
No optional upstream hook is silently activated, no trust setting is changed, and neither skill
overrides the sandbox or the user's model preferences.
