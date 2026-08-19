import type { CallState } from '@core/request-state';

/**
 * Interface AuditEventsState
 * @interface AuditEventsState
 *
 * @description
 * Auxiliary state for {@link AuditEventsStore}. Entity state
 * (`eventEntities`, `eventEntityMap`, `eventIds`) is initialised by
 * `withEntities` and lives outside this interface.
 *
 * @since 1.0.0
 */
export interface AuditEventsState {
  /** @type {CallState<null>} */
  readonly listCallState: CallState<null>;

  /** @type {number} */
  readonly totalEvents: number;
}
