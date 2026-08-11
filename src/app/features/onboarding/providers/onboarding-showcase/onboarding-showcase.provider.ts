import { signal } from '@angular/core';
import { OnboardingShowcase } from '@features/onboarding/ui/components';
import type { ExclusiveSlotFeature } from '@shared/layout-slot';

/**
 * Function withOnboardingShowcase
 * @function withOnboardingShowcase
 *
 * @description
 * Claims the split shell's showcase slot for the activation rail instead of
 * the layout's own marketing panel — the panel names a workflow, so this
 * feature owns it (`ARCHITECTURE.md` §8.2). Priority `1` outranks the
 * layout's default contribution (priority `0`), so declaring both on the
 * `/onboarding` route resolves to this one without the layout needing to
 * know onboarding exists.
 *
 * @access public
 * @since 1.0.0
 *
 * @returns {ExclusiveSlotFeature} The contribution factory, run by the layout's injector.
 *
 * @example
 * ```typescript
 * provideSplitLayoutSlots({ showcase: [withSplitLayoutShowcase(), withOnboardingShowcase()] })
 * ```
 */
export function withOnboardingShowcase(): ExclusiveSlotFeature {
  return {
    useFactory: () => ({
      id: 'onboarding-showcase',
      priority: 1,
      component: OnboardingShowcase,
      active: signal(true),
    }),
  };
}
