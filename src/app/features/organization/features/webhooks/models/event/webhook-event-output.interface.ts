import type { HydraItem } from '@core/api/models';

/**
 * Interface WebhookEventOutput
 * @interface WebhookEventOutput
 * @description Server-owned event catalog entry.
 * @since 1.0.0
 */
export interface WebhookEventOutput extends HydraItem {
  /**
   * Property value
   * @description Subscribed event value.
   * @access public
   * @since 1.0.0
   * @type {string}
   */
  value: string;
  /**
   * Property label
   * @description Public descriptive label.
   * @access public
   * @since 1.0.0
   * @type {string}
   */
  label: string;
}
