import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  type InputSignal,
  type Signal,
} from '@angular/core';
import {
  resolveInterventionTag,
  type InterventionTagDescriptor,
  type InterventionTagKind,
} from '@features/organization/features/interventions/models';
import { Tag } from '@shared/components';

/**
 * Component InterventionOption
 * @class InterventionOption
 *
 * @description
 * Thin intervention-domain wrapper over the shared {@link Tag} component in
 * its `inline` variant, for use inside a `p-select` option template: a
 * severity-coloured icon followed by a neutral label, with no badge shell.
 * Reuses the same descriptor that drives {@link InterventionTag}, so a value
 * keeps one label, one colour and one icon whether it renders as a select
 * option or a badge.
 *
 * @example
 * ```html
 * <ng-template #item let-option>
 *   <app-intervention-option kind="priority" [value]="option.value" />
 * </ng-template>
 * ```
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-option',
  imports: [Tag],
  templateUrl: './intervention-option.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionOption {
  //#region Inputs
  /**
   * Input kind
   * @readonly
   *
   * @description
   * Enum family the value belongs to.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<InterventionTagKind>}
   */
  public readonly kind: InputSignal<InterventionTagKind> = input.required<InterventionTagKind>();

  /**
   * Input value
   * @readonly
   *
   * @description
   * Raw enum value to render.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly value: InputSignal<string> = input.required<string>();
  //#endregion

  //#region Properties
  /**
   * Property descriptor
   * @readonly
   *
   * @description
   * Resolved presentation descriptor for the current kind/value pair,
   * forwarded to the shared {@link Tag} in its inline variant.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<InterventionTagDescriptor>}
   */
  protected readonly descriptor: Signal<InterventionTagDescriptor> =
    computed<InterventionTagDescriptor>(() => resolveInterventionTag(this.kind(), this.value()));
  //#endregion
}
