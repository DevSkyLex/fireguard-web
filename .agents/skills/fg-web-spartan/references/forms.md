# Signal Forms

Read ARCHITECTURE.md §10.4 and the official Spartan forms rule against the installed APIs.
Forms own a typed `signal()` model, `form()` schema and field state; they emit submit/cancel
intent. Pages/stores own navigation and writes. Do not introduce classic Reactive Forms.

Place private rules in the form's `validators/`; lift shared feature rules to its
`validators/` and only domain-agnostic cross-feature rules to an appropriate shared concept.
Cross-field validation belongs on the schema path and reads siblings through the supported
Signal Forms API. Reuse the domain's normalization rather than trimming/coercing arbitrarily.

Compose native field groups, labels, descriptions and error surfaces. Check installed custom
control support before binding `[formField]`; preserve accessible names and field-specific
errors. Read actual field state instead of mirroring dirty/touched/invalid into parallel signals.

Specify what submit, successful reset, server rejection and cancellation do to the draft.
An overlay host coordinates dismissal; the form exposes its real dirtiness and submit state.
Do not discard edits or close a mutating surface before the owner confirms success.

Test valid/invalid and cross-field boundaries, emitted values and recoverable server errors.
Use browser evidence for keyboard/focus, custom control behavior and error visibility.
