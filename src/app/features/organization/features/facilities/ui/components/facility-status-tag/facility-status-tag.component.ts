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
  resolveFacilityStatusTag,
  type FacilityStatusTagDescriptor,
} from '@features/organization/features/facilities/models';
import { HlmBadge } from '@shared/ui/badge';
import { FACILITY_STATUS_TAG_ICONS } from './constants/facility-status-tag-icons.constants';
import { FACILITY_STATUS_TAG_ICON_CLASS } from './constants/facility-status-tag-severity.constants';

/**
 * Component FacilityStatusTag
 * @class FacilityStatusTag
 *
 * @description
 * A spartan badge rendering `FacilityOutput.status` — the single appearance
 * of the enum anywhere in this feature. Resolves a raw value through the
 * facility status registry, so adding an enum member means editing one
 * descriptor map rather than a template `switch` (`ARCHITECTURE.md` §10.10).
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
 * <app-facility-status-tag value="active" />
 * <app-facility-status-tag value="archived" asOption />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-facility-status-tag',
  imports: [NgIcon, HlmBadge],
  providers: [provideIcons(FACILITY_STATUS_TAG_ICONS)],
  templateUrl: './facility-status-tag.component.html',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilityStatusTag {
  //#region Inputs
  /**
   * Property value
   * @readonly
   * @description Raw enum value to render, e.g. `"active"` or `"archived"`.
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
   * @description Resolved label, severity and icon for the current value.
   * @access protected
   * @since 1.0.0
   * @type {Signal<FacilityStatusTagDescriptor>}
   */
  protected readonly descriptor: Signal<FacilityStatusTagDescriptor> =
    computed<FacilityStatusTagDescriptor>(() => resolveFacilityStatusTag(this.value()));

  /**
   * Property iconClass
   * @readonly
   * @description The severity's colour, applied to the glyph alone — the badge itself stays neutral.
   * @access protected
   * @since 1.0.0
   * @type {Signal<string>}
   */
  protected readonly iconClass: Signal<string> = computed<string>(
    () => FACILITY_STATUS_TAG_ICON_CLASS[this.descriptor().severity],
  );
  //#endregion
}
