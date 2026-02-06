/**
 * Interface HydraSearchMapping
 * @interface HydraSearchMapping
 *
 * @description
 * Mapping definition for Hydra search templates.
 * Defines available filter/search parameters.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface HydraSearchMapping {
  /**
   * Property @type
   * @readonly
   *
   * @description
   * Mapping type, typically 'IriTemplateMapping'.
   *
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly '@type': string;

  /**
   * Property variable
   * @readonly
   *
   * @description
   * Variable name used in the URL template (e.g., 'page', 'email').
   *
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly variable: string;

  /**
   * Property property
   * @readonly
   *
   * @description
   * Entity property this variable maps to.
   * Null for special variables like 'page' or 'itemsPerPage'.
   *
   * @since 1.0.0
   *
   * @type {string | null}
   */
  readonly property: string | null;

  /**
   * Property required
   * @readonly
   *
   * @description
   * Whether this parameter is required for the search request.
   *
   * @since 1.0.0
   *
   * @type {boolean}
   */
  readonly required: boolean;
}

/**
 * Interface HydraSearch
 * @interface HydraSearch
 *
 * @description
 * Search template for Hydra collections.
 * Defines how to construct search/filter URLs.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @example
 * ```typescript
 * const search: HydraSearch = {
 *   '@type': 'IriTemplate',
 *   template: '/api/users{?page,email,name}',
 *   variableRepresentation: 'BasicRepresentation',
 *   mapping: [
 *     { '@type': 'IriTemplateMapping', variable: 'page', property: null, required: false },
 *     { '@type': 'IriTemplateMapping', variable: 'email', property: 'email', required: false }
 *   ]
 * };
 * ```
 */
export interface HydraSearch {
  /**
   * Property @type
   * @readonly
   *
   * @description
   * Search type, typically 'IriTemplate'.
   *
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly '@type': string;

  /**
   * Property template
   * @readonly
   *
   * @description
   * URI template string following RFC 6570 for constructing search URLs.
   *
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly template: string;

  /**
   * Property variableRepresentation
   * @readonly
   *
   * @description
   * Variable representation method, typically 'BasicRepresentation'.
   *
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly variableRepresentation: string;

  /**
   * Property mapping
   * @readonly
   *
   * @description
   * List of variable mappings defining available search parameters.
   *
   * @since 1.0.0
   *
   * @type {readonly HydraSearchMapping[]}
   */
  readonly mapping: readonly HydraSearchMapping[];
}
