import { DestroyRef, DOCUMENT, afterNextRender, inject, signal, type Signal } from '@angular/core';

/**
 * Constant BELOW_SM
 * @description Below Tailwind's sm boundary, for geometry only; never a device classifier.
 * @access public
 * @since 1.0.0
 * @type {string}
 */
export const BELOW_SM = '(max-width: 639px)';

/**
 * Constant BELOW_MD
 * @description Below Tailwind's md boundary for page geometry.
 * @access public
 * @since 1.0.0
 * @type {string}
 */
export const BELOW_MD = '(max-width: 767px)';

/**
 * Constant BELOW_LG
 * @description Below Tailwind's lg boundary for workspace geometry.
 * @access public
 * @since 1.0.0
 * @type {string}
 */
export const BELOW_LG = '(max-width: 1023px)';

/**
 * Constant AT_LEAST_LG
 * @description At or above Tailwind's lg boundary. The initial false value favors narrow geometry.
 * @access public
 * @since 1.0.0
 * @type {string}
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
 * SSR-safe: starts false and observes the browser only afterNextRender.
 * This helper measures geometry; it must not select an interaction mode.
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
 * protected readonly hasNarrowSpace: Signal<boolean> = mediaQuery(BELOW_SM);
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
