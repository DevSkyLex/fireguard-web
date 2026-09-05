import type { PublicationStatus } from './publication-status.type';

/**
 * Interface PublicationTracking
 * @interface PublicationTracking
 * @description Minimal account-bound recovery metadata; contains no workspace payload.
 * @since 1.0.0
 */
export interface PublicationTracking {
  /**
   * Property publicationId
   * @readonly
   * @description Accepted server identifier, absent when the response was lost.
   * @since 1.0.0
   * @type {string | null}
   */
  readonly publicationId: string | null;
  /**
   * Property status
   * @readonly
   * @description Last confirmed server state or an unknown request result.
   * @since 1.0.0
   * @type {PublicationStatus | 'unknown'}
   */
  readonly status: PublicationStatus | 'unknown';
  /**
   * Property checkedAt
   * @readonly
   * @description Time of the last observation.
   * @since 1.0.0
   * @type {number}
   */
  readonly checkedAt: number;
}
