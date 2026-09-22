# Signal Forms and validators

Read ARCHITECTURE.md §10.4 and `fg-web-spartan/references/forms.md`.
Forms own typed Signal Forms state and submit/cancel outputs, not navigation or direct API calls.
Reusable rules are validators, placed at the lowest shared scope; do not hide them in utils.

Use field state rather than mirrored validity/loading flags. Preserve the domain's normalization,
cross-field rules, server-error presentation and reset/dirtiness contract.
Test meaningful valid/invalid/submission boundaries; visual focus and native control interaction
require the browser checks selected for the changed behavior.
