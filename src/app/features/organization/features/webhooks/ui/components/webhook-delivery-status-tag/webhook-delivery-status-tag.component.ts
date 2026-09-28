import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  type InputSignal,
  type Signal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircleCheck, lucideCircleX, lucideClock, lucideTag } from '@ng-icons/lucide';
import {
  resolveWebhookDeliveryStatusTag,
  type WebhookDeliveryStatusTagDescriptor,
} from '@features/organization/features/webhooks/models';
import { HlmBadge } from '@shared/ui/badge';
import { WEBHOOK_DELIVERY_STATUS_TAG_ICON_CLASS } from './constants/webhook-delivery-status-tag-severity.constants';

/**
 * Component WebhookDeliveryStatusTag
 * @class WebhookDeliveryStatusTag
 *
 * @description
 * A spartan badge rendering one delivery's status — the single appearance
 * of the status enum anywhere in this feature. Resolves {@link value}
 * through `resolveWebhookDeliveryStatusTag`, so adding a status member
 * later means editing one descriptor map instead of every render site.
 *
 * Drawn per `DESIGN.md`'s glyph rule: an `outline` badge with a transparent
 * ground and muted text, where only the icon carries the tone. The icon and
 * the label always render, so the value survives without its colour
 * (WCAG 1.4.1) — `delivered` and `failed` no longer share one identical
 * outline badge.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-webhook-delivery-status-tag value="failed" />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-webhook-delivery-status-tag',
  imports: [NgIcon, HlmBadge],
  providers: [provideIcons({ lucideCircleCheck, lucideCircleX, lucideClock, lucideTag })],
  templateUrl: './webhook-delivery-status-tag.component.html',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WebhookDeliveryStatusTag {
  //#region Inputs
  /**
   * Property value
   * @readonly
   * @description Raw status value to render, e.g. `"failed"`.
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
   * @type {Signal<WebhookDeliveryStatusTagDescriptor>}
   */
  protected readonly descriptor: Signal<WebhookDeliveryStatusTagDescriptor> =
    computed<WebhookDeliveryStatusTagDescriptor>(() =>
      resolveWebhookDeliveryStatusTag(this.value()),
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
    () => WEBHOOK_DELIVERY_STATUS_TAG_ICON_CLASS[this.descriptor().severity],
  );
  //#endregion
}
