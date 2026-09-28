import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  type InputSignal,
  type Signal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCircleCheck,
  lucideCircleSlash,
  lucideCircleX,
  lucideClock,
  lucideLoader,
  lucideTag,
} from '@ng-icons/lucide';
import {
  resolveAutomationStatusTag,
  type AutomationStatusTagDescriptor,
} from '@features/organization/features/automations/models';
import { HlmBadge } from '@shared/ui/badge';
import { AUTOMATION_STATUS_TAG_ICON_CLASS } from './constants/automation-status-tag-severity.constants';

/**
 * Component AutomationStatusTag
 * @class AutomationStatusTag
 *
 * @description
 * A spartan badge rendering one automation attempt status — the single
 * appearance of the status enum anywhere in this feature. Resolves
 * {@link value} through `resolveAutomationStatusTag`, so adding a status
 * member later means editing one descriptor map instead of every render
 * site.
 *
 * Drawn per `DESIGN.md`'s glyph rule: an `outline` badge with a transparent
 * ground and muted text, where only the icon carries the tone. The icon and
 * the label always render, so the value survives without its colour
 * (WCAG 1.4.1) — `succeeded` and `skipped` no longer share one identical
 * outline badge.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-automation-status-tag value="running" />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-automation-status-tag',
  imports: [NgIcon, HlmBadge],
  providers: [
    provideIcons({
      lucideCircleCheck,
      lucideCircleSlash,
      lucideCircleX,
      lucideClock,
      lucideLoader,
      lucideTag,
    }),
  ],
  templateUrl: './automation-status-tag.component.html',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AutomationStatusTag {
  //#region Inputs
  /**
   * Property value
   * @readonly
   * @description Raw status value to render, e.g. `"running"`.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly value: InputSignal<string> = input.required<string>();
  //#endregion

  //#region Properties
  /**
   * Property descriptor
   * @readonly
   * @description Resolved label, severity and icon for the current value.
   * @access protected
   * @since 1.0.0
   * @type {Signal<AutomationStatusTagDescriptor>}
   */
  protected readonly descriptor: Signal<AutomationStatusTagDescriptor> =
    computed<AutomationStatusTagDescriptor>(() => resolveAutomationStatusTag(this.value()));

  /**
   * Property iconClass
   * @readonly
   * @description The severity's colour, applied to the glyph alone — the badge itself stays neutral.
   * @access protected
   * @since 1.0.0
   * @type {Signal<string>}
   */
  protected readonly iconClass: Signal<string> = computed<string>(
    () => AUTOMATION_STATUS_TAG_ICON_CLASS[this.descriptor().severity],
  );
  //#endregion
}
