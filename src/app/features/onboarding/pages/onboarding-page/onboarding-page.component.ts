import {
  Component,
  ChangeDetectionStrategy,
  inject,
  effect,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Events } from '@ngrx/signals/events';
import { OnboardingStore, onboardingStoreEvents } from '@core/stores/onboarding';
import { OnboardingStepper } from '@features/onboarding/steppers/onboarding-stepper';

/**
 * Component OnboardingPage
 * @class OnboardingPage
 *
 * @description
 * Root page for the onboarding wizard. Displays a vertical sidebar
 * with step progress and the main stepper content. Handles navigation
 * on completion and error toasts for failed operations.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-onboarding-page',
  imports: [
    OnboardingStepper,
  ],
  templateUrl: './onboarding-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingPage {
  //#region Properties
  private readonly onboardingStore: OnboardingStore =
    inject<OnboardingStore>(OnboardingStore);

  private readonly messageService: MessageService =
    inject<MessageService>(MessageService);

  private readonly events: Events = inject<Events>(Events);

  private readonly router: Router = inject<Router>(Router);
  //#endregion

  //#region Constructor
  /**
   * @constructor
   *
   * @description
   * Starts the onboarding flow, navigates to home on completion,
   * and subscribes to error events for toast notifications.
   */
  public constructor() {
    this.onboardingStore.start({ reset: false });

    effect(() => {
      if (this.onboardingStore.isCompleted()) {
        this.router.navigate(['/']).catch((error: unknown) => {
          console.error('Navigation failed', error);
        });
      }
    });

    this.events
      .on(onboardingStoreEvents.executeStepFailed)
      .pipe(takeUntilDestroyed())
      .subscribe(({ payload }) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: payload.message,
          life: 5000,
        });
      });

    this.events
      .on(onboardingStoreEvents.skipStepFailed)
      .pipe(takeUntilDestroyed())
      .subscribe(({ payload }) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: payload.message,
          life: 5000,
        });
      });

    this.events
      .on(onboardingStoreEvents.rollbackFailed)
      .pipe(takeUntilDestroyed())
      .subscribe(({ payload }) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: payload.message,
          life: 5000,
        });
      });
  }
  //#endregion

  //#region Methods
  //#endregion
}
