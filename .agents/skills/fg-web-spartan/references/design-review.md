# Read-only visual critique

Start from the user's requested surface and outcome, current DESIGN.md, PRODUCT.md and
owner FEATURE.md. Load official Spartan's relevant rules. Inspect current screenshots or the
actual browser artifact; record scenario, viewport/device, theme and source context.
Static source review cannot establish alignment, contrast or rendered composition.

Review hierarchy, spacing, typography, density, grouping, primary actions, state clarity and
native consistency. Explain each material finding through an observed user consequence.
Separate verified defects, design tradeoffs and unverified questions. Do not infer visual
quality from a successful build or visibility assertion.

Read `design-taste-frontend` only when the brief fits its declared landing/portfolio/redesign
scope. Its exclusions include dashboards, data tables and multi-step product UI. Those use the
FireGuard design contract; no generic style, palette or motion preset overrides the project.
Existing user design choices remain constraints, including documented tradeoffs.

This review makes no edits and launches no mutating checks. Return a short ordered set of
findings with artifact/file evidence, consequence and smallest useful correction.
`fg-web-spartan-ui` implements composition changes; `fg-web-a11y-auditor` assesses semantics
and interaction accessibility; `fg-web-e2e-runner` produces real browser evidence.
Name missing evidence instead of claiming complete visual or accessibility coverage.
