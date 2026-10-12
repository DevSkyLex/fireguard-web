import type { InputSignal, OutputEmitterRef } from '@angular/core';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { CallState } from '@core/request-state';
import type { PasswordPolicyOutput } from '@features/auth/models';
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmButton } from '@shared/ui/button';
import { HlmSpinner } from '@shared/ui/spinner';

/**
 * Component PasswordPolicyStatus
 * @class PasswordPolicyStatus
 *
 * @description
 * Presents loading and retry without owning policy requests or password values.
 */
@Component({
  selector: 'app-password-policy-status',
  imports: [HlmButton, HlmSpinner, ...HlmAlertImports],
  templateUrl: './password-policy-status.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PasswordPolicyStatus {
  /**
   * Property state
   * @readonly
   *
   * @description
   * Request outcome displayed by the policy status view.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<CallState<PasswordPolicyOutput>>}
   */
  public readonly state: InputSignal<CallState<PasswordPolicyOutput>> =
    input.required<CallState<PasswordPolicyOutput>>();
  /**
   * Property retried
   * @readonly
   *
   * @description
   * Requests another attempt to load public metadata.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly retried: OutputEmitterRef<void> = output<void>();
}
