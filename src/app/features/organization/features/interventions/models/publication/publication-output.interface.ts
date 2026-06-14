import type { HydraItem } from '@core/models/api';
import type { PublicationStatus } from './publication-status.type';

/**
 * Interface PublicationOutput
 * @interface PublicationOutput
 *
 * @description
 * Publication resource tracking intervention publication execution.
 */
export interface PublicationOutput extends HydraItem {
  //#region Properties
  /**
   * Property id
   * @readonly
   *
   * @description
   * Unique identifier of the publication.
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property intervention
   * @readonly
   *
   * @description
   * IRI of the published intervention.
   *
   * @type {string}
   */
  readonly intervention: string;

  /**
   * Property interventionRevision
   * @readonly
   *
   * @description
   * Intervention revision targeted by this publication.
   *
   * @type {number}
   */
  readonly interventionRevision: number;

  /**
   * Property status
   * @readonly
   *
   * @description
   * Current lifecycle status of the asynchronous publication.
   *
   * @type {PublicationStatus}
   */
  readonly status: PublicationStatus;

  /**
   * Property error
   * @readonly
   *
   * @description
   * Failure reason when the publication failed, `null` otherwise.
   *
   * @type {string | null}
   */
  readonly error: string | null;

  /**
   * Property createdAt
   * @readonly
   *
   * @description
   * ISO-8601 creation timestamp.
   *
   * @type {string}
   */
  readonly createdAt: string;

  /**
   * Property completedAt
   * @readonly
   *
   * @description
   * ISO-8601 completion timestamp, or `null` while still running.
   *
   * @type {string | null}
   */
  readonly completedAt: string | null;
  //#endregion
}
