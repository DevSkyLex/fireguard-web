import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { OnboardingStore } from '@features/onboarding/state';
import { OnboardingStepRail } from '@features/onboarding/ui/components';

/**
 * Component OnboardingShowcase
 * @class OnboardingShowcase
 *
 * @description
 * The split shell's branded panel, contributed for the `/onboarding` route
 * only: instead of the auth marketing panel, it shows the activation rail so
 * the operator always sees the whole journey, not just the step in front of
 * them. Reached through `withOnboardingShowcase()`, which claims the shell's
 * showcase slot at a higher priority than the layout's own default panel
 * (`ARCHITECTURE.md` §8.2).
 *
 * It injects the store directly rather than taking inputs: unlike a feature
 * table or form, a layout showcase contribution is resolved by the shell's
 * own injector, off the routed component tree, so there is no page above it
 * to pass the record down (`FEATURE.md` "Layout contribution").
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-onboarding-showcase />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-onboarding-showcase',
  imports: [OnboardingStepRail],
  templateUrl: './onboarding-showcase.component.html',
  host: { class: 'flex h-full flex-col justify-center bg-muted px-10 py-12 xl:px-14' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingShowcase {
  //#region Properties
  /**
   * Property store
   * @readonly
   * @description The root-provided onboarding record the rail renders.
   * @access protected
   * @since 1.0.0
   * @type {OnboardingStore}
   */
  protected readonly store: OnboardingStore = inject<OnboardingStore>(OnboardingStore);
  //#endregion
}
