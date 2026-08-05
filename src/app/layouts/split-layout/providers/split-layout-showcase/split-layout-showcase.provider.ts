import { signal } from '@angular/core';
import type { ExclusiveSlotFeature } from '@shared/layout-slot';
import { SplitLayoutShowcase } from '../../components';

/**
 * Function withSplitLayoutShowcase
 * @function withSplitLayoutShowcase
 *
 * @description
 * Contributes the shell's own branded panel to its showcase slot. It is the
 * layout's default chrome rather than a feature's: the panel names the product,
 * not a workflow, so no feature owns it.
 *
 * It still goes through the slot instead of being rendered inline, because the
 * slot is mono-active: a route that wants a different panel — a campaign page,
 * an invitation preview — claims the slot and replaces this one without
 * touching the layout (`ARCHITECTURE.md` §8.2).
 *
 * @access public
 * @since 1.0.0
 *
 * @returns {ExclusiveSlotFeature} The contribution factory, run by the layout's injector.
 *
 * @example
 * ```typescript
 * provideSplitLayoutSlots({ showcase: [withSplitLayoutShowcase()] })
 * ```
 */
export function withSplitLayoutShowcase(): ExclusiveSlotFeature {
  return {
    useFactory: () => ({
      id: 'split-layout-showcase',
      // The lowest priority any contribution uses: this is the fallback, and
      // anything a route contributes deliberately should outrank it.
      priority: 0,
      component: SplitLayoutShowcase,
      active: signal(true),
    }),
  };
}
