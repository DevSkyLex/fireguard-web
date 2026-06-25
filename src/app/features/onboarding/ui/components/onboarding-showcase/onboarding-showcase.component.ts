import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';
import { ONBOARDING_STEP_PRESENTATION } from '@features/onboarding/constants';
import type {
  OnboardingStepKey,
  OnboardingStepOutput,
  OnboardingStepPresentation,
} from '@features/onboarding/models';
import { OnboardingStore } from '@features/onboarding/state';

/**
 * Type ShowcaseStepStatus
 * @typedef ShowcaseStepStatus
 *
 * @description
 * Visual state of a step in the showcase rail: `done` (completed or skipped),
 * `current` (the next step to execute), or `todo` (not yet reached).
 *
 * @since 1.0.0
 */
type ShowcaseStepStatus = 'done' | 'current' | 'todo';

/**
 * Component OnboardingShowcase
 * @class OnboardingShowcase
 *
 * @description
 * Onboarding-owned panel rendered in the split layout showcase slot while the
 * activation wizard is open. It mirrors the auth showcase's dark hero styling but
 * replaces the marketing metrics with a **live step rail**: the ordered onboarding
 * steps, each marked done / current / to-do from {@link OnboardingStore}, so the
 * user always sees where they are and what comes next.
 *
 * It is feature-owned content contributed to the layout through
 * `withOnboardingShowcase()`; the layout renders it generically without knowing
 * what it shows. Reactivity comes entirely from the root store signals.
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
  imports: [],
  templateUrl: './onboarding-showcase.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingShowcase {
  //#region Properties
  /**
   * Property store
   * @readonly
   *
   * @description
   * Root onboarding store driving the step rail. Owned by the same feature as this
   * component, so direct injection is allowed.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {OnboardingStore}
   */
  private readonly store: OnboardingStore = inject<OnboardingStore>(OnboardingStore);

  /**
   * Property presentation
   * @readonly
   *
   * @description
   * Shared, localized icon/label/sublabel registry for every onboarding step key.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Record<OnboardingStepKey, OnboardingStepPresentation>}
   */
  protected readonly presentation: Record<OnboardingStepKey, OnboardingStepPresentation> =
    ONBOARDING_STEP_PRESENTATION;

  /**
   * Property steps
   * @readonly
   *
   * @description
   * Ordered onboarding steps rendered in the rail.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly OnboardingStepOutput[]>}
   */
  protected readonly steps: Signal<readonly OnboardingStepOutput[]> = this.store.steps;

  /**
   * Property progressPercent
   * @readonly
   *
   * @description
   * Overall activation progress as a 0–100 percentage, derived from the store's
   * `{ done, total }` progress (a step counts as done when completed or skipped).
   * Drives the slim progress bar above the rail.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {Signal<number>}
   */
  protected readonly progressPercent: Signal<number> = computed<number>(() => {
    const { done, total } = this.store.progress();
    return total > 0 ? Math.round((done / total) * 100) : 0;
  });
  //#endregion

  //#region Methods
  /**
   * Method statusOf
   *
   * @description
   * Resolves the visual rail status of a step: `done` when it is completed or
   * skipped, `current` when it is the next step to execute, otherwise `todo`.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {OnboardingStepOutput} step - The step to classify.
   * @returns {ShowcaseStepStatus} The visual status for the rail.
   */
  protected statusOf(step: OnboardingStepOutput): ShowcaseStepStatus {
    if (step.status === 'completed' || step.status === 'skipped') return 'done';
    return step.key === this.store.nextStep() ? 'current' : 'todo';
  }
  //#endregion
}
