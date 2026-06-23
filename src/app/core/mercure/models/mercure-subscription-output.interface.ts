import type { HydraItem } from '@core/api/models';

/**
 * Interface MercureSubscriptionOutput
 * @interface MercureSubscriptionOutput
 *
 * @description
 * Mercure subscription payload returned by the API
 * to authorize realtime updates for a topic.
 */
export interface MercureSubscriptionOutput extends HydraItem {
  //#region Properties
  /**
   * Property token
   * @readonly
   *
   * @description
   * JWT token used to authenticate against the
   * Mercure hub.
   *
   * @type {string}
   */
  readonly token: string;

  /**
   * Property topic
   * @readonly
   *
   * @description
   * Mercure topic URL to subscribe to.
   *
   * @type {string}
   */
  readonly topic: string;
  //#endregion
}
