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
   * Query-string parameters to append to the outgoing HTTP request. A value
   * that is a readonly array is sent as a repeated `key[]=` param — one
   * entry per array member, the wire shape the backend's `multiValue()`
   * query parsers (e.g. `status[]=a&status[]=b`) expect for an `isAnyOf`
   * narrowing — while a plain scalar still sends the single `key=` form.
   *
   * @type {Record<string, string | number | boolean | readonly (string | number | boolean)[]>}
   */
  readonly params?: Record<
    string,
    string | number | boolean | readonly (string | number | boolean)[]
  >;

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
