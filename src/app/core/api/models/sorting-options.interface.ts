import type { SortDirection } from './sort-direction.type';

/**
 * Interface SortingOptions
 * @interface SortingOptions
 *
 * @description
 * Single-field ordering supported by collection endpoints exposed by the
 * API. Only one field is modeled because the backend's SortingExtractor
 * reads the first valid `order[<field>]` entry and ignores the rest — this
 * shape cannot express multi-column sort, and should not be stretched to.
 */
export interface SortingOptions {
  //#region Properties
  /**
   * Property sort
   * @readonly
   *
   * @description
   * Field and direction serialized as the bracketed `order[<field>]=<direction>`
   * query parameter the API expects.
   *
   * @type {{ readonly field: string; readonly direction: SortDirection }}
   */
  readonly sort?: {
    readonly field: string;
    readonly direction: SortDirection;
  };
  //#endregion
}
