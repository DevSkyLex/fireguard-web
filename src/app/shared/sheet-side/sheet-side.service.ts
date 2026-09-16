import { computed, inject, type Signal } from '@angular/core';
import { INTERACTION_CAPABILITIES_PORT } from '@core/interaction-capabilities';

/**
 * Function sheetSide
 * @function sheetSide
 *
 * @description
 * Opens Spartan sheets from the bottom in mobile interaction mode and from the right
 * for desktop, regardless of width. SSR keeps the central port's deterministic
 * desktop default until browser classification runs after rendering.
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
  const interactionCapabilities = inject(INTERACTION_CAPABILITIES_PORT);

  return computed((): 'right' | 'bottom' =>
    interactionCapabilities.isMobileInteractionMode() ? 'bottom' : 'right',
  );
}
