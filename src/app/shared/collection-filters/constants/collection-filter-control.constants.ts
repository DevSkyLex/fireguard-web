/**
 * Constant COLLECTION_FILTER_VALUE_CLASS
 * @const COLLECTION_FILTER_VALUE_CLASS
 *
 * @description
 * The filled value pastille every value control draws its current value in —
 * `app-collection-filter-select`, `app-collection-filter-multi-select`,
 * `app-collection-filter-date` and `app-collection-filter-date-range` all
 * rendered this string mot pour mot before this extraction, on the element
 * carrying `data-testid="collection-filter-value"`. Kept as one constant so
 * a filter bar reads as one row whichever field type each chip carries.
 *
 * The four controls' *trigger* chrome was evaluated for the same extraction
 * and deliberately left out of this file: it turned out to be two distinct
 * strings rather than one shared by all four (`app-collection-filter-select`
 * / `app-collection-filter-multi-select` render through `hlm-combobox-trigger`
 * and need its host/button `class` merge fix; `app-collection-filter-date` /
 * `app-collection-filter-date-range` render a plain `<button hlmBtn>` and
 * need an explicit `focus-visible` ring instead), and binding the
 * combobox-trigger variant through `[class]` drops the class from
 * `hlm-combobox-trigger`'s own host entirely — Angular routes a *bound*
 * `class` fully into a component's `@Input('class')` alias, unlike the
 * literal attribute today, which the compiler also keeps on the host. Each
 * component's own class doc carries the full account.
 *
 * @since 10.6.0
 *
 * @type {string}
 */
export const COLLECTION_FILTER_VALUE_CLASS: string =
  'flex min-h-5 max-w-24 shrink items-center gap-1 overflow-hidden rounded-sm bg-muted px-1.5 py-0.5 text-xs leading-4 text-foreground sm:max-w-32';
