import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
} from '@angular/core';
import { GateReasonDirective } from '@shared/gate-reason';
import { HlmButton } from '@shared/ui/button';

/**
 * Component OnboardingStepFooter
 * @class OnboardingStepFooter
 *
 * @description
 * The one action row every wizard step ends with: the step's named primary
 * action on the right (`type="submit"`, so it belongs to the form that
 * renders it) and, only when the backend lets the step be skipped, a ghost
 * "Skip for now" on the left. Never a third control — the batch steps'
 * "Add another" lives with the fields it adds to, not here.
 *
 * Below `lg` the row sticks to the bottom of the viewport on the page ground,
 * so the primary action stays in the thumb zone while a long step scrolls.
 * A closed gate names its reason through `appGateReason`, per `PRODUCT.md`
 * principle 2.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-onboarding-step-footer label="Continue" pendingLabel="Saving…" [pending]="pending()" [skippable]="skippable()" submitTestId="onboarding-x-submit" (skipped)="skipped.emit()" />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-onboarding-step-footer',
  imports: [HlmButton, GateReasonDirective],
  templateUrl: './onboarding-step-footer.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingStepFooter {
  //#region Inputs
  /**
   * Property label
   * @readonly
   * @description The primary action's resting label — a verb naming what the step does, never "Continue".
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly label: InputSignal<string> = input.required<string>();

  /**
   * Property pendingLabel
   * @readonly
   * @description The primary action's label while the step is being persisted.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly pendingLabel: InputSignal<string> = input.required<string>();

  /**
   * Property submitTestId
   * @readonly
   * @description The primary action's `data-testid`, owned by the step so page objects keep their per-step hooks.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly submitTestId: InputSignal<string> = input.required<string>();

  /**
   * Property pending
   * @readonly
   * @description Whether the step is being persisted, which locks both controls.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property skippable
   * @readonly
   * @description Whether the backend currently lets this step be skipped — the only case the skip control renders.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly skippable: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property gateReason
   * @readonly
   * @description Why the primary action is closed, or `null` when it is open. A reason disables the control and is rendered beside it.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string | null>}
   */
  public readonly gateReason: InputSignal<string | null> = input<string | null>(null);
  //#endregion

  //#region Outputs
  /**
   * Property skipped
   * @readonly
   * @description Emits when the operator skips the step.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<void>}
   */
  public readonly skipped: OutputEmitterRef<void> = output<void>();
  //#endregion
}
