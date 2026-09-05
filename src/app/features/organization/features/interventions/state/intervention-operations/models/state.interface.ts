import type { CallState } from '@core/request-state';
import type { InterventionOutboxOperation } from '@features/organization/features/interventions/models';

/**
 * Interface InterventionOperationsState
 * @interface InterventionOperationsState
 * @description Local queue and recovery states for one workspace.
 * @since 1.0.0
 */
export interface InterventionOperationsState {
  /**
   * Property organizationId
   * @readonly
   * @description Active organization.
   * @access public
   * @since 1.0.0
   * @type {string}
   */
  readonly organizationId: string;
  /**
   * Property interventionId
   * @readonly
   * @description Active intervention.
   * @access public
   * @since 1.0.0
   * @type {string}
   */
  readonly interventionId: string;
  /**
   * Property operations
   * @readonly
   * @description Operations saved on this device for the current intervention.
   * @access public
   * @since 1.0.0
   * @type {readonly InterventionOutboxOperation[]}
   */
  readonly operations: readonly InterventionOutboxOperation[];
  /**
   * Property loadCallState
   * @readonly
   * @description Independent state of the queue read.
   * @access public
   * @since 1.0.0
   * @type {CallState}
   */
  readonly loadCallState: CallState;
  /**
   * Property mutations
   * @readonly
   * @description Per-operation recovery results.
   * @access public
   * @since 1.0.0
   * @type {Readonly<Record<string, CallState>>}
   */
  readonly mutations: Readonly<Record<string, CallState>>;
}
