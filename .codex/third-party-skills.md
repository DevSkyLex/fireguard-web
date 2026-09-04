# Upstream skills and FireGuard constraints

`spartan`, `impeccable` and `ui-ux-pro-max` are third-party skills, installed under their official names
with their complete scripts, references and data. They are not FireGuard-authored wrappers.
See `.agents/skills.lock.json` for source/version and installation provenance. Update using
the upstream source/installer. The official `spartan` skill is mandatory for presentation work
and is paired with `fg-web-spartan`, which carries the project-specific constraints. The
user-authorized local Impeccable adaptation removes Claude
directory support from hook management, discovery, shortcuts and documentation. Its affected files
and before/after hashes are recorded in the lock. Reapply it on updates; the validator enforces
the directory boundary. Do not make unrelated changes to encode project design rules.

In this repository the user's native Spartan requirement and DESIGN.md are authoritative:
official neutral theme, Nova, Geist, semantic tokens, no parallel design system or unnecessary
custom controls. Use upstream design advice to evaluate composition, hierarchy and interaction.
Do not interpret its examples as permission to replace the stack, add a font/dependency,
persist a generated design-system tree or override the requested visual direction.

For UI UX Pro Max use the Angular stack when supported and query only the relevant domain.
Its database can recommend ReactiveFormsModule; FireGuard's Signal Forms requirement in
AGENTS.md still governs. Check API examples against the installed Angular version.
Resolve script paths against the loaded skill folder, including when Codex starts in a
subdirectory. For Impeccable use its Codex package's paths and operate mode for the product UI.
Its runtime data is local working output; keep it separate from authored source.

The skill payloads are usable without activating optional upstream hooks. Existing FireGuard
hooks remain in the local manifest and require Codex's own hook trust review. This installation
does not silently trust hooks or change global model, sandbox or approval settings.
