import type { WorkloadAssessment } from '@features/organization/features/workload/models';
import type { InterventionOutboxPayloadMap } from './intervention-outbox-payload-map.interface';
import type { InterventionOutboxType } from './intervention-outbox-type.type';

/**
 * Interface InterventionOutboxOperationFor
 * @interface InterventionOutboxOperationFor
 *
 * @description
 * Typed queued operation with optional conflict evidence, backward compatible with existing local
 * entries.
 *
 * @since 1.0.0
 *
 * @template Type - Queued operation kind.
 */
export interface InterventionOutboxOperationFor<Type extends InterventionOutboxType> {
  /**
   * Property workloadAssessment
   * @readonly
   *
   * @description
   * Daily overload requiring explicit human agreement.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {WorkloadAssessment | null}
   */
  readonly workloadAssessment?: WorkloadAssessment | null;

  /**
   * Property serverValues
   * @readonly
   *
   * @description
   * Latest authorized server values for explicit revision review; never merged automatically.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {Readonly<Record<string, string | number | boolean | null>> | null}
   */
  readonly serverValues?: Readonly<Record<string, string | number | boolean | null>> | null;

  /**
   * Property id
   * @readonly
   *
   * @description
   * Uniquely identifies this intervention outbox operation for.
   *
   * @access public
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property interventionId
   * @readonly
   *
   * @description
   * Identifies the intervention associated with this record.
   *
   * @access public
   *
   * @type {string}
   */
  readonly interventionId: string;

  /**
   * Property type
   * @readonly
   *
   * @description
   * Classifies this intervention outbox operation for for feature-specific handling.
   *
   * @access public
   *
   * @type {Type}
   */
  readonly type: Type;

  /**
   * Property payload
   * @readonly
   *
   * @description
   * Stores the operation-specific input selected by the queued operation type.
   *
   * @access public
   *
   * @type {InterventionOutboxPayloadMap[Type]}
   */
  readonly payload: InterventionOutboxPayloadMap[Type];

  /**
   * Property createdAt
   * @readonly
   *
   * @description
   * Records when this intervention outbox operation for was created.
   *
   * @access public
   *
   * @type {string}
   */
  readonly createdAt: string;

  /**
   * Property status
   * @readonly
   *
   * @description
   * Reports the current lifecycle status of this intervention outbox operation for.
   *
   * @access public
   *
   * @type {'pending' | 'conflict' | 'failed'}
   */
  readonly status?: 'pending' | 'conflict' | 'failed';

  /**
   * Property error
   * @readonly
   *
   * @description
   * Stores the latest failure message when replay fails; null means no failure is recorded.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly error?: string | null;

  /**
   * Property baseRevision
   * @readonly
   *
   * @description
   * Revision used by the local edit before its first conflict recovery.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {number | null | undefined}
   */
  readonly baseRevision?: number | null;

  /**
   * Property serverRevision
   * @readonly
   *
   * @description
   * Revision confirmed by the most recent conflict read; null when that read failed.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {number | null | undefined}
   */
  readonly serverRevision?: number | null;
}
