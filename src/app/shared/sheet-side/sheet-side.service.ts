import { DestroyRef, DOCUMENT, afterNextRender, inject, signal, type Signal } from '@angular/core';

/**
 * The breakpoint below which a spartan sheet presents as a bottom drawer
 * instead of a right-hand panel — Tailwind's `sm`, matching every other
 * mobile/desktop split in this codebase.
 */
const SHEET_BOTTOM_BREAKPOINT_QUERY = '(max-width: 639px)';

/**
 * Function sheetSide
 * @function sheetSide
 *
 * @description
 * The side a spartan sheet should open from: `'bottom'` below the `sm`
 * breakpoint so the footer lands in the thumb zone, `'right'` at and above
 * it (`DESIGN.md` "Action Surfaces" rule 2). SSR-safe — the signal starts
 * and stays `'right'` until the browser-only `matchMedia` check inside
 * `afterNextRender` resolves, which never runs during server rendering.
 *
 * Must be called from an injection context — a component's field
 * initializer or constructor — the same constraint `inject()` itself
 * carries, since it reads {@link DOCUMENT} and registers cleanup on
 * {@link DestroyRef}.
 *
 * @access public
 * @since 1.0.0
 *
 * @example
 * ```typescript
 * protected readonly side: Signal<'right' | 'bottom'> = sheetSide();
 * ```
 *
 * @returns {Signal<'right' | 'bottom'>} The side to bind on the hosting `hlm-sheet`.
 */
export function sheetSide(): Signal<'right' | 'bottom'> {
  const side = signal<'right' | 'bottom'>('right');
  const window: (Window & typeof globalThis) | null = inject(DOCUMENT).defaultView;
  const destroyRef: DestroyRef = inject(DestroyRef);

  afterNextRender(() => {
    if (!window || typeof window.matchMedia !== 'function') return;

    const mediaQuery: MediaQueryList = window.matchMedia(SHEET_BOTTOM_BREAKPOINT_QUERY);
    side.set(mediaQuery.matches ? 'bottom' : 'right');

    const handleChange = (event: MediaQueryListEvent): void => {
      side.set(event.matches ? 'bottom' : 'right');
    };
    mediaQuery.addEventListener('change', handleChange);
    destroyRef.onDestroy(() => mediaQuery.removeEventListener('change', handleChange));
  });

  return side.asReadonly();
}
