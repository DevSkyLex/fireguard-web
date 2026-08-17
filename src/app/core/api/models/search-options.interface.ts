/**
 * Interface SearchOptions
 * @interface SearchOptions
 *
 * @description
 * Free-text search term supported by collection and item endpoints exposed
 * by the API, serialized as the `search` query parameter.
 */
export interface SearchOptions {
  //#region Properties
  /**
   * Property search
   * @readonly
   *
   * @description
   * Free-text search term forwarded as-is to the API's `search` parameter.
   * A whitespace-only value is treated as empty and not sent.
   *
   * @type {string}
   */
  readonly search?: string;
  //#endregion
}
