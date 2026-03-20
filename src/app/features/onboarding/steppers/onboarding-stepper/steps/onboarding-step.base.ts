import { Directive, input, type InputSignal } from '@angular/core';
import type { OnboardingStepOutput } from '@core/models/onboarding';

/**
 * Abstract class OnboardingStepBase
 * @abstract
 *
 * @description
 * Shared base for every onboarding wizard step component.
 * Declares the three inputs that the `OnboardingStepper` injects
 * via `NgComponentOutlet`, ensuring a typed contract between the
 * stepper and its step components.
 *
 * The `@Directive()` decorator is required for Angular's compiler to
 * discover and register the inherited signal inputs in the derived
 * component definitions. Without it, `NgComponentOutlet inputs:` would
 * silently fail to bind values to inherited inputs.
 *
 * All inputs are declared `required` — Angular will throw if a step
 * is rendered without them.
 *
 * @since 1.0.0
 */
@Directive()
export abstract class OnboardingStepBase {
  /**
   * Input step
   * @readonly
   *
   * @description
   * The onboarding step descriptor received from the API, containing
   * the step key, status, label, and action metadata.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<OnboardingStepOutput>}
   */
  public readonly step: InputSignal<OnboardingStepOutput> =
    input.required<OnboardingStepOutput>();

  /**
   * Input stepIndex
   * @readonly
   *
   * @description
   * Zero-based position of this step in the onboarding flow,
   * used to render the step counter and progress bar.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<number>}
   */
  public readonly stepIndex: InputSignal<number> =
    input.required<number>();

  /**
   * Input totalSteps
   * @readonly
   *
   * @description
   * Total number of steps in the onboarding flow,
   * used to render the progress bar percentage.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<number>}
   */
  public readonly totalSteps: InputSignal<number> =
    input.required<number>();
}
