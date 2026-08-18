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
  lucideCalendarOff,
  lucideCircleAlert,
  lucideCircleCheck,
  lucideClock,
  lucideTag,
} from '@ng-icons/lucide';
import {
  resolveMaintenanceTag,
  type MaintenanceTagDescriptor,
} from '@features/organization/features/maintenance-schedules/models';
import { HlmBadge } from '@shared/ui/badge';
import { MAINTENANCE_DUE_STATUS_TAG_ICON_CLASS } from './constants/maintenance-due-status-tag-severity.constants';

/**
 * Component MaintenanceDueStatusTag
 * @class MaintenanceDueStatusTag
 *
 * @description
 * A spartan badge rendering one `MaintenanceDueStatus` value — the single
 * appearance of the enum anywhere in this feature. Resolves `value` through
 * `resolveMaintenanceTag`, so adding a due-status member later means editing
 * one descriptor map.
 *
 * Drawn per `DESIGN.md`'s glyph rule: an `outline` badge with a transparent
 * ground and muted text, where only the icon carries the tone. The icon and
 * the label always render, so the value survives without its colour
 * (WCAG 1.4.1). {@link asOption} drops the badge for a plain icon-and-label
 * row inside a select item.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-maintenance-due-status-tag value="overdue" />
 * <app-maintenance-due-status-tag value="due_soon" asOption />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-maintenance-due-status-tag',
  imports: [NgIcon, HlmBadge],
  providers: [
    provideIcons({
      lucideCalendarOff,
      lucideCircleAlert,
      lucideCircleCheck,
      lucideClock,
      lucideTag,
    }),
  ],
  templateUrl: './maintenance-due-status-tag.component.html',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MaintenanceDueStatusTag {
  //#region Inputs
  /**
   * Property value
   * @readonly
   * @description Raw due-status value to render, e.g. `"due_soon"`.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly value: InputSignal<string> = input.required<string>();

  /**
   * Property asOption
   * @readonly
   * @description Renders a plain icon-and-label row instead of a badge, for use inside a select list.
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
   * @type {Signal<MaintenanceTagDescriptor>}
   */
  protected readonly descriptor: Signal<MaintenanceTagDescriptor> =
    computed<MaintenanceTagDescriptor>(() => resolveMaintenanceTag(this.value()));

  /**
   * Property iconClass
   * @readonly
   * @description The severity's colour, applied to the glyph alone — the badge itself stays neutral.
   * @access protected
   * @since 1.0.0
   * @type {Signal<string>}
   */
  protected readonly iconClass: Signal<string> = computed<string>(
    () => MAINTENANCE_DUE_STATUS_TAG_ICON_CLASS[this.descriptor().severity],
  );
  //#endregion
}
