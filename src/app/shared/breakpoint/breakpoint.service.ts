import { DestroyRef, DOCUMENT, afterNextRender, inject, signal, type Signal } from '@angular/core';

/**
 * The three viewport widths this application actually branches on, as media
 * queries. They mirror Tailwind's own `sm`/`md`/`lg` so a TypeScript decision
 * and a utility class never disagree about where a layout changes.
 *
 * `sm` is the load-bearing one: it is the mobile/desktop split, the
 * sheet-to-drawer switch and the touch-target switch all at once.
 */
export const BELOW_SM = '(max-width: 639px)';

/** Below Tailwind's `md` — the breakpoint page padding steps at. */
export const BELOW_MD = '(max-width: 767px)';

/** Below Tailwind's `lg` — where the detail workspace loses its action column. */
export const BELOW_LG = '(max-width: 1023px)';

/**
 * At or above Tailwind's `lg`, the same boundary read from the other side.
 *
 * Both directions exist because the signal is `false` until the browser
 * answers, and a call site has to be able to choose *which* branch that
 * pre-hydration `false` lands on. A surface that must render its narrow form
 * on the server picks the `AT_LEAST_*` query; one that must render its wide
 * form picks the `BELOW_*` one. Reading the boundary from the wrong side is
 * how a phone gets a flash of desktop layout.
 */
export const AT_LEAST_LG = '(min-width: 1024px)';

/**
 * Function mediaQuery
 * @function mediaQuery
 *
 * @description
 * A signal reporting whether a media query currently matches, kept live by the
 * browser's own `change` event.
 *
 * SSR-safe by construction: the signal starts `false` and only ever changes
 * inside `afterNextRender`, which never runs on the server. That default is a
 * deliberate bias — a server render assumes the *desktop* branch, matching how
 * `sheetSide()` has always behaved, so hydration on a phone corrects downward
 * rather than flashing a desktop layout onto a narrow screen.
 *
 * Must be called from an injection context — a field initializer or a
 * constructor — since it reads {@link DOCUMENT} and registers cleanup on
 * {@link DestroyRef}.
 *
 * @access public
 * @since 1.0.0
 *
 * @example
 * ```typescript
 * protected readonly isCompact: Signal<boolean> = mediaQuery(BELOW_SM);
 * ```
 *
 * @param {string} query - The media query to observe.
 * @returns {Signal<boolean>} Whether the query matches, live.
 */
export function mediaQuery(query: string): Signal<boolean> {
  const matches = signal<boolean>(false);
  const window: (Window & typeof globalThis) | null = inject(DOCUMENT).defaultView;
  const destroyRef: DestroyRef = inject(DestroyRef);

  afterNextRender(() => {
    if (!window || typeof window.matchMedia !== 'function') return;

    const mediaQueryList: MediaQueryList = window.matchMedia(query);
    matches.set(mediaQueryList.matches);

    const handleChange = (event: MediaQueryListEvent): void => matches.set(event.matches);
    mediaQueryList.addEventListener('change', handleChange);
    destroyRef.onDestroy(() => mediaQueryList.removeEventListener('change', handleChange));
  });

  return matches.asReadonly();
}

/**
 * Function isCompact
 * @function isCompact
 *
 * @description
 * Whether the viewport is below `sm` — the one width the application treats as
 * "this is a phone". Prefer this over re-writing the query at a call site: the
 * value of naming it is that every surface switches at the same place.
 *
 * @access public
 * @since 1.0.0
 *
 * @returns {Signal<boolean>} Whether the viewport is narrower than `sm`.
 */
export function isCompact(): Signal<boolean> {
  return mediaQuery(BELOW_SM);
}
