import type { BooleanInput } from '@angular/cdk/coercion';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  type InputSignal,
  type InputSignalWithTransform,
  type Signal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  resolveInspectionStatusTag,
  type InspectionStatusTagDescriptor,
  type InspectionStatusTagKind,
} from '@features/organization/features/inspections/models';
import { HlmBadge } from '@shared/ui/badge';
import { INSPECTION_STATUS_TAG_ICONS } from './constants/inspection-status-tag-icons.constants';
import { INSPECTION_STATUS_TAG_ICON_CLASS } from './constants/inspection-status-tag-severity.constants';

/**
 * Component InspectionStatusTag
 * @class InspectionStatusTag
 *
 * @description
 * A spartan badge rendering one inspection enum value — workflow `status`,
 * `result`, or a non-conformity's `severity`/`status` — the single
 * appearance of any of them anywhere in this feature. Resolves a
 * `kind`/`value` pair through the inspection status registry, so adding an
 * enum member means editing one descriptor map.
 *
 * Drawn per `DESIGN.md`'s glyph rule: an `outline` badge with a transparent
 * ground and muted text, where only the icon carries the tone. The icon and
 * the label always render, so the value survives without its colour
 * (WCAG 1.4.1). {@link asOption} drops the badge for a plain icon-and-label
 * row inside a select or combobox item.
 *
 * @version 1.1.0
 *
 * @example
 * ```html
 * <app-inspection-status-tag kind="status" value="draft" />
 * <app-inspection-status-tag kind="result" value="pass" asOption />
 * <app-inspection-status-tag kind="nonConformityStatus" value="waived" />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-inspection-status-tag',
  imports: [NgIcon, HlmBadge],
  providers: [provideIcons(INSPECTION_STATUS_TAG_ICONS)],
  templateUrl: './inspection-status-tag.component.html',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InspectionStatusTag {
  //#region Inputs
  /**
   * Property kind
   * @readonly
   * @description Enum family the value belongs to, deciding which descriptor map resolves it.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<InspectionStatusTagKind>}
   */
  public readonly kind: InputSignal<InspectionStatusTagKind> =
    input.required<InspectionStatusTagKind>();

  /**
   * Property value
   * @readonly
   * @description Raw enum value to render, e.g. `"draft"` or `"pass"`.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly value: InputSignal<string> = input.required<string>();

  /**
   * Property asOption
   * @readonly
   * @description Renders a plain icon-and-label row instead of a badge, for use inside a select or combobox list.
   * @access public
   * @since 1.0.0
   * @type {InputSignalWithTransform<boolean, BooleanInput>}
   */
  public readonly asOption: InputSignalWithTransform<boolean, BooleanInput> = input<
    boolean,
    BooleanInput
  >(false, { transform: booleanAttribute });
  //#endregion

  //#region Properties
  /**
   * Property descriptor
   * @readonly
   * @description Resolved label, severity and icon for the current pair.
   * @access protected
   * @since 1.0.0
   * @type {Signal<InspectionStatusTagDescriptor>}
   */
  protected readonly descriptor: Signal<InspectionStatusTagDescriptor> =
    computed<InspectionStatusTagDescriptor>(() =>
      resolveInspectionStatusTag(this.kind(), this.value()),
    );

  /**
   * Property iconClass
   * @readonly
   * @description The severity's colour, applied to the glyph alone — the badge itself stays neutral.
   * @access protected
   * @since 1.0.0
   * @type {Signal<string>}
   */
  protected readonly iconClass: Signal<string> = computed<string>(
    () => INSPECTION_STATUS_TAG_ICON_CLASS[this.descriptor().severity],
  );
  //#endregion
}
