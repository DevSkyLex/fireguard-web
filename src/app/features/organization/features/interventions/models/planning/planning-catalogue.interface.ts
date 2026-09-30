import type { CallState } from '@core/request-state';

/**
 * Type PlanningCatalogueKind
 *
 * @description
 * Independently paginated preparation catalogues.
 *
 * @since 1.0.0
 *
 * @type
 */
export type PlanningCatalogueKind = 'sites' | 'members' | 'facilities' | 'equipment' | 'templates';

/**
 * Interface PlanningCatalogueState
 * @interface PlanningCatalogueState
 *
 * @description
 * Server coverage and request state for one catalogue.
 *
 * @since 1.0.0
 */
export interface PlanningCatalogueState {
  /**
   * Property search
   * @readonly
   *
   * @description
   * Contains the text used to filter the linked-resource list.
   *
   * @access public
   *
   * @type {string}
   */
  readonly search?: string;

  /**
   * Property page
   * @readonly
   *
   * @description
   * Selects the page of planning catalogue results to request.
   *
   * @access public
   *
   * @type {number}
   */
  readonly page: number;

  /**
   * Property total
   * @readonly
   *
   * @description
   * Reports the total number of records matching this query.
   *
   * @access public
   *
   * @type {number}
   */
  readonly total: number;

  /**
   * Property loaded
   * @readonly
   *
   * @description
   * Reports how many records are currently loaded.
   *
   * @access public
   *
   * @type {number}
   */
  readonly loaded: number;

  /**
   * Property callState
   * @readonly
   *
   * @description
   * Tracks the request lifecycle for planning catalogues.
   *
   * @access public
   *
   * @type {CallState}
   */
  readonly callState: CallState;
}

/**
 * Interface PlanningCatalogueRequest
 * @interface PlanningCatalogueRequest
 *
 * @description
 * Requests another page without changing the current selection.
 *
 * @since 1.0.0
 */
export interface PlanningCatalogueRequest {
  /**
   * Property kind
   * @readonly
   *
   * @description
   * Distinguishes the planning catalogue request variant represented by this value.
   *
   * @access public
   *
   * @type {PlanningCatalogueKind}
   */
  readonly kind: PlanningCatalogueKind;

  /**
   * Property search
   * @readonly
   *
   * @description
   * Contains the text used to filter the linked-resource list.
   *
   * @access public
   *
   * @type {string}
   */
  readonly search?: string;
}
