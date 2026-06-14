import type { HydraItem } from '@core/models/api';
import type { PublicationStatus } from './publication-status.type';

/**
 * Interface PublicationOutput
 * @interface PublicationOutput
 *
 * @description
 * Publication resource tracking mission publication execution.
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
   * Property mission
   * @readonly
   *
   * @description
   * IRI of the published mission.
   *
   * @type {string}
   */
  readonly mission: string;

  /**
   * Property missionRevision
   * @readonly
   *
   * @description
   * Mission revision targeted by this publication.
   *
   * @type {number}
   */
  readonly missionRevision: number;

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
