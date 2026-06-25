import { signal } from '@angular/core';
import { AuthShowcase } from '@features/auth/ui/components/auth-showcase';
import type { SplitLayoutShowcaseSlotFeature } from '@layouts/split-layout';

/**
 * Feature withAuthShowcase
 *
 * @description
 * Registers the auth-owned branded marketing panel in the split layout
 * showcase slot. Always active with the lowest priority, so any more specific
 * auth showcase contribution can override it.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @example
 * ```typescript
 * provideSplitLayoutSlots({ showcase: [withAuthShowcase()] })
 * ```
 *
 * @returns {SplitLayoutShowcaseSlotFeature}
 */
export function withAuthShowcase(): SplitLayoutShowcaseSlotFeature {
  return {
    useFactory: () => ({
      id: 'auth',
      priority: 0,
      component: AuthShowcase,
      active: signal(true),
    }),
  };
}
