/**
 * Interface ApiRequestOptions
 * @interface ApiRequestOptions
 *
 * @description
 * Generic request options supported by API service
 * methods, excluding pagination parameters.
 */
export interface ApiRequestOptions {
  //#region Properties
  /**
   * Property params
   * @readonly
   *
   * @description
   * Query-string parameters to append to the
   * outgoing HTTP request.
   *
   * @type {Record<string, string | number | boolean>}
   */
  readonly params?: Record<string, string | number | boolean>;

  /**
   * Property headers
   * @readonly
   *
   * @description
   * Additional HTTP headers to send with the
   * outgoing request.
   *
   * @type {Record<string, string>}
   */
  readonly headers?: Record<string, string>;
  //#endregion
}
