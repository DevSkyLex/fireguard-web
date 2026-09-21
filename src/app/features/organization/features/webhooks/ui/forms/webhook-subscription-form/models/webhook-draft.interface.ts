/**
 * Interface WebhookDraft
 * @interface WebhookDraft
 * @description Local Signal Forms model, including server catalog checkbox values.
 * @since 1.0.0
 */
export interface WebhookDraft {
  /** Property url
   * @description HTTPS destination.
   * @access public
   * @since 1.0.0
   * @type {string}
   */
  url: string;
  /** Property description
   * @description Operator description.
   * @access public
   * @since 1.0.0
   * @type {string}
   */
  description: string;
  /** Property isActive
   * @description Whether new events may be queued.
   * @access public
   * @since 1.0.0
   * @type {boolean}
   */
  isActive: boolean;
  /** Property events
   * @description Catalog items and their draft selection.
   * @access public
   * @since 1.0.0
   * @type {Array<{ value: string; label: string; checked: boolean }>}
   */
  events: Array<{ value: string; label: string; checked: boolean }>;
}
