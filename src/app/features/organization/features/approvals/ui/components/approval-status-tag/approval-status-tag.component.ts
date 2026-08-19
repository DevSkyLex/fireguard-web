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
  lucideBan,
  lucideCircleCheck,
  lucideCircleX,
  lucideClock,
  lucideHourglass,
  lucideTag,
} from '@ng-icons/lucide';
import {
  resolveApprovalTag,
  type ApprovalTagDescriptor,
} from '@features/organization/features/approvals/models';
import { HlmBadge } from '@shared/ui/badge';
import { APPROVAL_STATUS_TAG_ICON_CLASS } from './constants/approval-status-tag-severity.constants';

/**
 * Component ApprovalStatusTag
 * @class ApprovalStatusTag
 *
 * @description
 * A spartan badge rendering one `ApprovalStatus` value — the single
 * appearance of the enum anywhere in this feature. Resolves {@link value}
 * through `resolveApprovalTag`, so adding a status member later means
 * editing one descriptor map.
 *
 * Drawn per `DESIGN.md`'s glyph rule: an `outline` badge with a transparent
 * ground and muted text, where only the icon carries the tone. The icon and
 * the label always render, so the value survives without its colour
 * (WCAG 1.4.1).
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-approval-status-tag value="pending" />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-approval-status-tag',
  imports: [NgIcon, HlmBadge],
  providers: [
    provideIcons({
      lucideBan,
      lucideCircleCheck,
      lucideCircleX,
      lucideClock,
      lucideHourglass,
      lucideTag,
    }),
  ],
  templateUrl: './approval-status-tag.component.html',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApprovalStatusTag {
  //#region Inputs
  /**
   * Property value
   * @readonly
   * @description Raw status value to render, e.g. `"pending"`.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly value: InputSignal<string> = input.required<string>();

  /**
   * Property asOption
   * @readonly
   * @description Renders a plain icon-and-label row instead of a badge, for use inside a toggle group or select list.
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
   * @type {Signal<ApprovalTagDescriptor>}
   */
  protected readonly descriptor: Signal<ApprovalTagDescriptor> = computed<ApprovalTagDescriptor>(
    () => resolveApprovalTag(this.value()),
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
    () => APPROVAL_STATUS_TAG_ICON_CLASS[this.descriptor().severity],
  );
  //#endregion
}
