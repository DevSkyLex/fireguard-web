import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { OnboardingStore } from '@features/onboarding/state';
import { OnboardingWizard } from '@features/onboarding/ui/components';

/**
 * Component OnboardingPage
 * @class OnboardingPage
 *
 * @description
 * Route-entry orchestrator for the activation wizard. Bootstraps the onboarding
 * record (SSR-aware). Mutation-failure toasts are produced centrally from the
 * onboarding store's feedback events. Onboarding is non-blocking, so the page
 * never redirects on completion — the wizard renders a completion screen with an
 * explicit "Go to dashboard" action instead.
 *
 * @version 2.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-onboarding-page',
  imports: [OnboardingWizard],
  templateUrl: './onboarding-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingPage {
  //#region Properties
  private readonly onboardingStore: OnboardingStore = inject<OnboardingStore>(OnboardingStore);
  //#endregion

  //#region Constructor
  /**
   * @constructor
   *
   * @description
   * Bootstraps the onboarding flow. Mutation-failure toasts are produced
   * centrally from the onboarding store's feedback events.
   */
  public constructor() {
    void this.onboardingStore.initialize({ reset: false });
  }
  //#endregion
}
