# Collection filters

`CollectionFilterBar` composes a field catalog, active keys, operator values and
projected value editors. Features own query mapping and declare only operators
their API supports. The shared layer never infers additional query capabilities.

`FilterChip` owns segment alignment, responsive height, operator labels, removal
and unavailable-state presentation for every field type. Fixed and selectable
operators share one centered segment; callers must not patch their alignment.
Operator picks emit only when supported, changed and available. Field-specific
labels override the common registry without duplicating it.

The select, multi-select, date and date-range editors own value interaction and
emit changes. Domain-specific option templates remain in their owning feature.
Keep this composition generic instead of adding page-specific filter shells.

Mobile interaction mode follows the shared interaction-capabilities contract on phones and tablets,
independent of width. The field catalog fully closes before emitting its selection,
so the owning page can open a value editor without stacking drawers. Multi-select
and date-range editors stage changes until Apply; Cancel does not emit a value.
Each actual drawer opening snapshots the current input once, including controlled
opening. External input updates do not overwrite a draft in progress. Apply emits
one committed value before explicitly closing; dismissal discards the draft, and
unavailable controls cannot edit or apply it.
Single-choice drawers use Spartan Command for search and keyboard selection.
Desktop retains anchored comboboxes, date pickers and compact chip density at narrow widths.

Validate shared behavior with the collection-filter unit tests and real-browser
checks of fixed/editable operators, narrow screens and keyboard interaction.
