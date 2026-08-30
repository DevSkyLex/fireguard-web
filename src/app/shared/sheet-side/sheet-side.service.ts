import { computed, type Signal } from '@angular/core';
import { BELOW_SM, mediaQuery } from '@shared/breakpoint';

/**
 * Function sheetSide
 * @function sheetSide
 *
 * @description
 * The side a spartan sheet should open from: `'bottom'` below the `sm`
 * breakpoint so the footer lands in the thumb zone, `'right'` at and above it
 * (`DESIGN.md` "Action Surfaces" rule 2).
 *
 * A thin reading of `@shared/breakpoint`'s own `sm` query rather than a second
 * `matchMedia` of its own: the query lives in one place so a sheet, a table's
 * card fallback and a filter bar cannot switch at three slightly different
 * widths. The signature is unchanged — eleven sheets bind it.
 *
 * SSR-safe: `'right'` on the server and until the browser-only check resolves.
 *
 * Must be called from an injection context — a component's field initializer
 * or constructor.
 *
 * @access public
 * @since 2.0.0
 *
 * @example
 * ```typescript
 * protected readonly side: Signal<'right' | 'bottom'> = sheetSide();
 * ```
 *
 * @returns {Signal<'right' | 'bottom'>} The side to bind on the hosting `hlm-sheet`.
 */
export function sheetSide(): Signal<'right' | 'bottom'> {
  const compact: Signal<boolean> = mediaQuery(BELOW_SM);

  return computed((): 'right' | 'bottom' => (compact() ? 'bottom' : 'right'));
}
