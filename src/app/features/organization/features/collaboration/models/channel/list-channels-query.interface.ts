/**
 * Interface ListChannelsQuery
 * @interface ListChannelsQuery
 *
 * @description
 * Filters for `GET /api/channels`.
 * `isArchived` is presence-based server-side: omit it to get archived and
 * unarchived alike. Never send an empty string — it coerces to `false` and
 * silently narrows the result to unarchived only.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface ListChannelsQuery {
  /**
   * Property organization
   * @readonly
   *
   * @description
   * Organization IRI or bare UUID. Required.
   *
   * @access public
   *
   * @type {string}
   */
  readonly organization: string;

  /**
   * Property isArchived
   * @readonly
   *
   * @description
   * Includes or excludes archived list channels records according to this filter.
   *
   * @access public
   *
   * @type {boolean}
   */
  readonly isArchived?: boolean;

  /**
   * Property page
   * @readonly
   *
   * @description
   * Selects the page of list channels results to request.
   *
   * @access public
   *
   * @type {number}
   */
  readonly page?: number;

  /**
   * Property itemsPerPage
   * @readonly
   *
   * @description
   * Clamped server-side to 1–100, whatever is asked for.
   *
   * @access public
   *
   * @type {number}
   */
  readonly itemsPerPage?: number;
}
