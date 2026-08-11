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
  resolveEquipmentStatusTag,
  type EquipmentStatusTagDescriptor,
  type EquipmentStatusTagKind,
} from '@features/organization/features/equipments/models';
import { HlmBadge } from '@shared/ui/badge';
import { EQUIPMENT_STATUS_TAG_ICONS } from './constants/equipment-status-tag-icons.constants';
import { EQUIPMENT_STATUS_TAG_ICON_CLASS } from './constants/equipment-status-tag-severity.constants';

/**
 * Component EquipmentStatusTag
 * @class EquipmentStatusTag
 *
 * @description
 * A spartan badge rendering one equipment status enum value (lifecycle
 * `status` or `maintenanceDueStatus`) — the single appearance of either
 * anywhere in this feature. Resolves a `kind`/`value` pair through the
 * equipment status registry, so adding an enum member means editing one
 * descriptor map.
 *
 * Named `-status-tag`, not `-tag`: `EquipmentTagOutput` already owns that
 * name for the unrelated labeling-tag resource.
 *
 * Drawn per `DESIGN.md`'s glyph rule: an `outline` badge with a transparent
 * ground and muted text, where only the icon carries the tone. The icon and
 * the label always render, so the value survives without its colour
 * (WCAG 1.4.1). {@link asOption} drops the badge for a plain icon-and-label
 * row inside a select or combobox item.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-equipment-status-tag kind="status" value="operational" />
 * <app-equipment-status-tag kind="maintenanceDueStatus" value="overdue" asOption />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-equipment-status-tag',
  imports: [NgIcon, HlmBadge],
  providers: [provideIcons(EQUIPMENT_STATUS_TAG_ICONS)],
  templateUrl: './equipment-status-tag.component.html',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EquipmentStatusTag {
  //#region Inputs
  /**
   * Property kind
   * @readonly
   * @description Enum family the value belongs to, deciding which descriptor map resolves it.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<EquipmentStatusTagKind>}
   */
  public readonly kind: InputSignal<EquipmentStatusTagKind> =
    input.required<EquipmentStatusTagKind>();

  /**
   * Property value
   * @readonly
   * @description Raw enum value to render, e.g. `"operational"` or `"due_soon"`.
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
   * @type {Signal<EquipmentStatusTagDescriptor>}
   */
  protected readonly descriptor: Signal<EquipmentStatusTagDescriptor> =
    computed<EquipmentStatusTagDescriptor>(() =>
      resolveEquipmentStatusTag(this.kind(), this.value()),
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
    () => EQUIPMENT_STATUS_TAG_ICON_CLASS[this.descriptor().severity],
  );
  //#endregion
}
