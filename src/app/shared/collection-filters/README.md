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

Validate shared behavior with the collection-filter unit tests and real-browser
checks of fixed/editable operators, narrow screens and keyboard interaction.
