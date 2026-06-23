/**
 * Interface PaginationOptions
 * @interface PaginationOptions
 *
 * @description
 * Pagination parameters supported by collection
 * endpoints exposed by the API.
 */
export interface PaginationOptions {
  //#region Properties
  /**
   * Property page
   * @readonly
   *
   * @description
   * One-based page index requested from the API.
   *
   * @type {number}
   */
  readonly page?: number;

  /**
   * Property itemsPerPage
   * @readonly
   *
   * @description
   * Number of items requested per page.
   *
   * @type {number}
   */
  readonly itemsPerPage?: number;
  //#endregion
}
