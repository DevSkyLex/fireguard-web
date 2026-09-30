import type { InterventionChangeStatus } from './intervention-change-status.type';

/**
 * Interface UpdateInterventionChangeInput
 * @interface
 *
 * @description
 * Input used to update a proposed intervention change.
 */
export interface UpdateInterventionChangeInput {
  /**
   * Property patch
   * @readonly
   *
   * @description
   * Contains the fields changed by this update.
   *
   * @access public
   *
   * @type {Readonly<Record<string, unknown>>}
   */
  readonly patch?: Readonly<Record<string, unknown>>;

  /**
   * Property status
   * @readonly
   *
   * @description
   * Reports the current lifecycle status of this update intervention change.
   *
   * @access public
   *
   * @type {Extract<InterventionChangeStatus, 'proposed' | 'rejected'>}
   */
  readonly status?: Extract<InterventionChangeStatus, 'proposed' | 'rejected'>;
}
