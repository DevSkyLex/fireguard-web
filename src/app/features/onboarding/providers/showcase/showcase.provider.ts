import { signal } from '@angular/core';
import { OnboardingShowcase } from '@features/onboarding/ui/components/onboarding-showcase';
import type { SplitLayoutShowcaseSlotFeature } from '@layouts/split-layout';

/**
 * Feature withOnboardingShowcase
 *
 * @description
 * Registers the onboarding-owned step rail in the split layout showcase slot.
 * Used by the top-level `/onboarding` route so the left panel shows live
 * activation progress while the wizard runs. Always active; the layout renders
 * it generically via the showcase outlet without importing the component.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @example
 * ```typescript
 * provideSplitLayoutSlots({ showcase: [withOnboardingShowcase()] })
 * ```
 *
 * @returns {SplitLayoutShowcaseSlotFeature}
 */
export function withOnboardingShowcase(): SplitLayoutShowcaseSlotFeature {
  return {
    useFactory: () => ({
      id: 'onboarding',
      priority: 0,
      component: OnboardingShowcase,
      active: signal(true),
    }),
  };
}
