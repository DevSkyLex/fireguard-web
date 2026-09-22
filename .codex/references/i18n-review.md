# Localization review

Use this read-only reference for a bounded review of source messages and the corresponding
`src/locale/messages*.xlf` units. ARCHITECTURE.md §9.10 owns ID conventions; angular.json
owns configured source/target locales. Do not change or regenerate catalogs during an audit.

Trace the selected message's explicit dotted ID, source text, placeholder names/types, meaning
and target units. Report duplicate IDs with conflicting sources, missing or obsolete translations,
changed placeholders, broken ICU/plural structures and inconsistent domain terminology with
the actual affected unit. A renamed ID requires checking its consumers and translations together.

Distinguish an intentional untranslated/provisional unit from an incorrectly claimed complete
translation. Do not certify linguistic quality from key coverage or silently invent translations.
Preserve interpolation, links and accessibility labels when proposing a correction.

For layout-dependent long labels, locale-specific formatting or translated navigation, identify
a bounded browser case for `fg-web-e2e`; static XLF inspection cannot prove layout.
Use [validation selection](validation.md) for the localized suite and note its limited coverage.
Return file/line or XLF unit ID, consequence, evidence, minimal correction and unverified cases.
