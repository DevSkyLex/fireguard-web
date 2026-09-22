# Components and page composition

Read ARCHITECTURE.md §9–§10 and the owning FEATURE.md before adding a unit.
Place route entries in `ui/pages/<name>-page/`, tables in `ui/tables/`, collection browsing
in `ui/dataviews/`, forms in `ui/forms/`, overlays in their intended `ui/dialogs/` or
`ui/sheets/` surface, and domain widgets in `ui/components/`.
Generic UI earns a `shared/<concept>/` home through responsibility and actual consumers.

Inspect a current sibling exemplar. Use external templates, OnPush, signal inputs/outputs,
explicit access/types and structured declaration documentation. Page folders and files carry
`-page`; selectors follow the folder. Expose only the public barrels architecture requires.

Pages coordinate stores, route state and navigation; presentational units emit their intent.
Published infrastructure ports are available; feature widgets orchestrate only where FEATURE.md
permits it. Preserve the shell's page title/action/tab contracts rather than duplicating headers.

Choose [forms](forms.md), [collections](collections.md) or [overlays](overlays.md) for those
boundaries. Do not extract a generic wrapper merely to hide repeated Spartan markup.
Translate user-facing strings with explicit dotted IDs and preserve consumers when changing APIs.
Validate meaningful behavior and inspect affected desktop/mobile composition where needed.
