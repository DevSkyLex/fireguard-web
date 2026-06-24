import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Events } from '@ngrx/signals/events';
import { MessageService } from 'primeng/api';
import { OnboardingStore, onboardingStoreEvents } from '@features/onboarding/state';
import { OnboardingWizard } from '@features/onboarding/ui/components';

/**
 * Component OnboardingPage
 * @class OnboardingPage
 *
 * @description
 * Route-entry orchestrator for the activation wizard. Bootstraps the onboarding
 * record (SSR-aware) and surfaces error toasts for failed mutations. Onboarding
 * is non-blocking, so the page never redirects on completion — the wizard renders
 * a completion screen with an explicit "Go to dashboard" action instead.
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

  private readonly messageService: MessageService = inject<MessageService>(MessageService);

  private readonly events: Events = inject<Events>(Events);
  //#endregion

  //#region Constructor
  /**
   * @constructor
   *
   * @description
   * Bootstraps the onboarding flow and subscribes to mutation-failure events for
   * toast notifications.
   */
  public constructor() {
    void this.onboardingStore.initialize({ reset: false });

    const failureEvents = [
      onboardingStoreEvents.executeStepFailed,
      onboardingStoreEvents.skipStepFailed,
      onboardingStoreEvents.rollbackFailed,
      onboardingStoreEvents.dismissFailed,
    ];

    for (const failureEvent of failureEvents) {
      this.events
        .on(failureEvent)
        .pipe(takeUntilDestroyed())
        .subscribe(({ payload }) => {
          this.messageService.add({
            severity: 'error',
            summary: $localize`:@@common.error:Error`,
            detail: payload.message,
            life: 5000,
          });
        });
    }
  }
  //#endregion

  //#region Methods
  //#endregion
}
