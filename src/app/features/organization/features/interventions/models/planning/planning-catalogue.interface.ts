import type { CallState } from '@core/request-state';
/**
 * Type PlanningCatalogueKind
 * @description Independently paginated preparation catalogues.
 * @since 1.0.0
 */
export type PlanningCatalogueKind = 'sites' | 'members' | 'facilities' | 'equipment' | 'templates';
/**
 * Interface PlanningCatalogueState
 * @interface PlanningCatalogueState
 * @description Server coverage and request state for one catalogue.
 * @since 1.0.0
 */
export interface PlanningCatalogueState {
  readonly search?: string;
  readonly page: number;
  readonly total: number;
  readonly loaded: number;
  readonly callState: CallState;
}
/**
 * Interface PlanningCatalogueRequest
 * @interface PlanningCatalogueRequest
 * @description Requests another page without changing the current selection.
 * @since 1.0.0
 */
export interface PlanningCatalogueRequest {
  readonly kind: PlanningCatalogueKind;
  readonly search?: string;
}
