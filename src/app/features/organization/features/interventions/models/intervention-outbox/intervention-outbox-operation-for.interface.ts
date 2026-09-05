import type { InterventionOutboxPayloadMap } from './intervention-outbox-payload-map.interface';
import type { InterventionOutboxType } from './intervention-outbox-type.type';

/**
 * Interface InterventionOutboxOperationFor
 * @interface InterventionOutboxOperationFor
 * @description Typed queued operation with optional conflict evidence, backward compatible with existing local entries.
 * @template Type - Queued operation kind.
 * @since 1.0.0
 */
export interface InterventionOutboxOperationFor<Type extends InterventionOutboxType> {
  readonly id: string;
  readonly interventionId: string;
  readonly type: Type;
  readonly payload: InterventionOutboxPayloadMap[Type];
  readonly createdAt: string;
  readonly status?: 'pending' | 'conflict' | 'failed';
  readonly error?: string | null;
  /**
   * Property baseRevision
   * @readonly
   * @description Revision used by the local edit before its first conflict recovery.
   * @access public
   * @since 1.0.0
   * @type {number | null | undefined}
   */
  readonly baseRevision?: number | null;
  /**
   * Property serverRevision
   * @readonly
   * @description Revision confirmed by the most recent conflict read; null when that read failed.
   * @access public
   * @since 1.0.0
   * @type {number | null | undefined}
   */
  readonly serverRevision?: number | null;
}
