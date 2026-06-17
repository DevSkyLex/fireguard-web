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
 * Component InterventionTag
 * @class InterventionTag
 *
 * @description
 * Thin intervention-domain wrapper over the shared {@link Tag} component.
 * Resolves a `kind`/`value` pair into a descriptor via the intervention
 * registry and renders it as the neutral table/panel badge, so the value
 * looks identical wherever it appears and never relies on colour alone.
 *
 * @example
 * ```html
 * <app-intervention-tag kind="priority" value="urgent" />
 * ```
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-tag',
  imports: [Tag],
  templateUrl: './intervention-tag.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionTag {
  //#region Inputs
  /**
   * Property kind
   * @readonly
   *
   * @description
   * Enum family the value belongs to (e.g. `"priority"`, `"status"`).
   * Determines which resolution map is used by {@link resolveInterventionTag}.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<InterventionTagKind>}
   */
  public readonly kind: InputSignal<InterventionTagKind> = input.required<InterventionTagKind>();

  /**
   * Property value
   * @readonly
   *
   * @description
   * Raw enum value to render (e.g. `"urgent"`, `"in_progress"`).
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
   * Resolved presentation descriptor (label, severity, icon) for the
   * current `kind`/`value` pair, forwarded to the shared {@link Tag}.
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
