import type { HydraItem } from '@core/models/api';
import type { MissionPriority } from './mission-priority.type';
import type { MissionStatus } from './mission-status.type';
import type { MissionType } from './mission-type.type';

/**
 * Interface MissionOutput
 * @interface MissionOutput
 *
 * @description
 * Mission resource returned by the API.
 */
export interface MissionOutput extends HydraItem {
  //#region Properties
  /**
   * Property id
   * @readonly
   *
   * @description
   * Unique identifier of the mission.
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property organization
   * @readonly
   *
   * @description
   * IRI of the organization owning the mission.
   *
   * @type {string}
   */
  readonly organization: string;

  /**
   * Property type
   * @readonly
   *
   * @description
   * Mission workflow type. Only site setup missions are supported today.
   *
   * @type {'site_setup'}
   */
  readonly type: MissionType;

  /**
   * Property name
   * @readonly
   *
   * @description
   * Human-readable mission name.
   *
   * @type {string}
   */
  readonly name: string;

  /**
   * Property status
   * @readonly
   *
   * @description
   * Current workflow status of the mission.
   *
   * @type {MissionStatus}
   */
  readonly status: MissionStatus;

  /**
   * Property referencePack
   * @readonly
   *
   * @description
   * IRI of the regulatory reference pack used for readiness checks.
   *
   * @type {string}
   */
  readonly referencePack: string;

  /**
   * Property site
   * @readonly
   *
   * @description
   * Provides the site value.
   *
   * @type {string | null}
   */
  readonly site: string | null;

  /**
   * Property responsible
   * @readonly
   *
   * @description
   * Provides the responsible value.
   *
   * @type {string | null}
   */
  readonly responsible: string | null;

  /**
   * Property participants
   * @readonly
   *
   * @description
   * Provides the participants value.
   *
   * @type {readonly string[]}
   */
  readonly participants: readonly string[];

  /**
   * Property priority
   * @readonly
   *
   * @description
   * Provides the priority value.
   *
   * @type {MissionPriority}
   */
  readonly priority: MissionPriority;

  /**
   * Property plannedStartAt
   * @readonly
   *
   * @description
   * Provides the planned start at value.
   *
   * @type {string | null}
   */
  readonly plannedStartAt: string | null;

  /**
   * Property dueAt
   * @readonly
   *
   * @description
   * Provides the due at value.
   *
   * @type {string | null}
   */
  readonly dueAt: string | null;

  /**
   * Property reviewNote
   * @readonly
   *
   * @description
   * Provides the review note value.
   *
   * @type {string | null}
   */
  readonly reviewNote: string | null;

  /**
   * Property revision
   * @readonly
   *
   * @description
   * Monotonic mission revision used for publication consistency.
   *
   * @type {number}
   */
  readonly revision: number;

  /**
   * Property facilitiesCount
   * @readonly
   *
   * @description
   * Number of facilities attached to the mission.
   *
   * @type {number}
   */
  readonly facilitiesCount: number;

  /**
   * Property equipmentCount
   * @readonly
   *
   * @description
   * Number of equipment items attached to the mission.
   *
   * @type {number}
   */
  readonly equipmentCount: number;

  /**
   * Property inspectionsCount
   * @readonly
   *
   * @description
   * Number of inspections recorded for the mission.
   *
   * @type {number}
   */
  readonly inspectionsCount: number;

  /**
   * Property blockersCount
   * @readonly
   *
   * @description
   * Number of blocker-severity issues preventing publication.
   *
   * @type {number}
   */
  readonly blockersCount: number;

  /**
   * Property workItemsCount
   * @readonly
   *
   * @description
   * Provides the work items count value.
   *
   * @type {number}
   */
  readonly workItemsCount: number;

  /**
   * Property completedWorkItemsCount
   * @readonly
   *
   * @description
   * Provides the completed work items count value.
   *
   * @type {number}
   */
  readonly completedWorkItemsCount: number;

  /**
   * Property proposedChangesCount
   * @readonly
   *
   * @description
   * Provides the proposed changes count value.
   *
   * @type {number}
   */
  readonly proposedChangesCount: number;

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
   * Property updatedAt
   * @readonly
   *
   * @description
   * ISO-8601 last update timestamp.
   *
   * @type {string}
   */
  readonly updatedAt: string;
  //#endregion
}
