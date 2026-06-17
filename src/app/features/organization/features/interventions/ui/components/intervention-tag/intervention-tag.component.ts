import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  type InputSignal,
  type Signal,
} from '@angular/core';
import {
  interventionSeverityIconClass,
  resolveInterventionTag,
  type InterventionTagDescriptor,
  type InterventionTagKind,
} from '@features/organization/features/interventions/models';

/**
 * Component InterventionTag
 * @class InterventionTag
 *
 * @description
 * Single source of truth for rendering an intervention status/enum value as the
 * organization table badge: a neutral pill whose icon and label carry the
 * severity colour. Resolves a shared label + severity + icon descriptor so the
 * same value looks identical in tables, panels and form selects, and never
 * relies on colour alone to convey meaning.
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
   * current `kind`/`value` pair.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<InterventionTagDescriptor>}
   */
  protected readonly descriptor: Signal<InterventionTagDescriptor> = computed<InterventionTagDescriptor>(() =>
    resolveInterventionTag(this.kind(), this.value()),
  );

  /**
   * Property iconClass
   * @readonly
   *
   * @description
   * Compiled Tailwind class string positioning the icon and applying the
   * severity colour via {@link interventionSeverityIconClass}.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly iconClass: Signal<string> = computed<string>(
    () =>
      `${this.descriptor().icon} inline-flex items-center text-[0.7rem] leading-none ${interventionSeverityIconClass(this.descriptor().severity)}`,
  );
  //#endregion
}
