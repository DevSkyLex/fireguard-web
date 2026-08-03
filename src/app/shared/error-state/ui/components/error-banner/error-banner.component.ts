import {
  ChangeDetectionStrategy,
  Component,
  input,
  type InputSignal,
  output,
  type OutputEmitterRef,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';

/**
 * Component ErrorBanner
 * @class ErrorBanner
 *
 * @description
 * Shared inline list-failure banner, the second shape of the error-state
 * concept alongside {@link ErrorState}'s centred block. Renders a
 * `p-message severity="error"` row with a warning icon, the failure message,
 * and an optional Retry action, for "this surface could not load" above
 * content that keeps its place — a table or dataview toolbar — instead of
 * replacing the whole surface with a full block.
 *
 * @example ```html
 * <app-error-banner
 *   [message]="loadErrorMessage"
 *   [retrying]="store.isLoading()"
 *   (retried)="reload()"
 * />
 * ```
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-error-banner',
  imports: [MessageModule, ButtonModule],
  templateUrl: './error-banner.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErrorBanner {
  //#region Properties
  /**
   * Property message
   * @readonly
   *
   * @description
   * The failure message shown beside the warning icon.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly message: InputSignal<string> = input.required<string>();

  /**
   * Property retryable
   * @readonly
   *
   * @description
   * Whether the Retry action renders. Set to `false` when the failure has no
   * meaningful recovery step.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly retryable: InputSignal<boolean> = input<boolean>(true);

  /**
   * Property retrying
   * @readonly
   *
   * @description
   * Whether a retry is in flight, reflected as the Retry button's loading state.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly retrying: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property retryLabel
   * @readonly
   *
   * @description
   * Localized label of the Retry action.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {string}
   */
  protected readonly retryLabel: string = $localize`:@@shared.errorState.retry:Retry`;
  //#endregion

  //#region Outputs
  /**
   * Output retried
   * @readonly
   *
   * @description
   * Emits when the Retry action is pressed.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly retried: OutputEmitterRef<void> = output<void>();
  //#endregion
}
