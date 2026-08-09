import type { BooleanInput } from '@angular/cdk/coercion';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  type InputSignal,
  type InputSignalWithTransform,
  type OutputEmitterRef,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCalendarCheck,
  lucideCircleCheckBig,
  lucideListChecks,
  lucideSend,
} from '@ng-icons/lucide';
import type { InterventionCommandAction } from '@features/organization/features/interventions/models';
import { HlmButton } from '@shared/ui/button';
import { HlmSpinnerImports } from '@shared/ui/spinner';

/**
 * Component InterventionCommandButton
 * @class InterventionCommandButton
 *
 * @description
 * The phase's forward action as a button, and nothing else. It exists so the
 * action the operator must take has one *implementation* while having one
 * address per viewport: `InterventionActionBox` renders it in the second column
 * from `lg` up, `InterventionCommandBar` renders it in a bottom bar below that,
 * where the column would otherwise stack after the whole content flow.
 *
 * `loading` shows a spinner in place of the glyph rather than beside it, so the
 * button never changes width mid-write.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-intervention-command-button
 *   [action]="commandAction()"
 *   [busy]="store.saving()"
 *   (invoked)="invokeCommandAction()"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-command-button',
  imports: [NgIcon, HlmButton, ...HlmSpinnerImports],
  providers: [
    provideIcons({
      lucideCalendarCheck,
      lucideCircleCheckBig,
      lucideListChecks,
      lucideSend,
    }),
  ],
  templateUrl: './intervention-command-button.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionCommandButton {
  //#region Inputs
  /**
   * Property action
   * @readonly
   * @description The forward action to render, or null when there is nothing to do.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<InterventionCommandAction | null>}
   */
  public readonly action: InputSignal<InterventionCommandAction | null> =
    input<InterventionCommandAction | null>(null);

  /**
   * Property busy
   * @readonly
   * @description Whether a write is already in flight, disabling the action.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly busy: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property block
   * @readonly
   *
   * @description
   * Whether the button fills its container. The bottom bar wants a full-width
   * thumb target; the action box wants the button to size to its label.
   *
   * @access public
   * @since 1.0.0
   * @type {InputSignalWithTransform<boolean, BooleanInput>}
   */
  public readonly block: InputSignalWithTransform<boolean, BooleanInput> = input<
    boolean,
    BooleanInput
  >(false, { transform: booleanAttribute });
  //#endregion

  //#region Outputs
  /**
   * Property invoked
   * @readonly
   * @description The operator activated the forward action.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<void>}
   */
  public readonly invoked: OutputEmitterRef<void> = output<void>();
  //#endregion
}
