import type { HydraItem } from '@core/api/models';
import type { InterventionPriority } from './intervention-priority.type';
import type { InterventionStatus } from './intervention-status.type';
import type { InterventionType } from './intervention-type.type';

/**
 * Interface InterventionOutput
 * @interface InterventionOutput
 *
 * @description
 * Intervention resource returned by the API.
 */
export interface InterventionOutput extends HydraItem {
  //#region Properties
  /**
   * Property id
   * @readonly
   *
   * @description
   * Unique identifier of the intervention.
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property organization
   * @readonly
   *
   * @description
   * IRI of the organization owning the intervention.
   *
   * @type {string}
   */
  readonly organization: string;

  /**
   * Property type
   * @readonly
   *
   * @description
   * Intervention workflow type. Only site setup interventions are supported today.
   *
   * @type {'site_setup'}
   */
  readonly type: InterventionType;

  /**
   * Property name
   * @readonly
   *
   * @description
   * Human-readable intervention name.
   *
   * @type {string}
   */
  readonly name: string;

  /**
   * Property status
   * @readonly
   *
   * @description
   * Current workflow status of the intervention.
   *
   * @type {InterventionStatus}
   */
  readonly status: InterventionStatus;

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
   * @type {InterventionPriority}
   */
  readonly priority: InterventionPriority;

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
   * Monotonic intervention revision used for publication consistency.
   *
   * @type {number}
   */
  readonly revision: number;

  /**
   * Property facilitiesCount
   * @readonly
   *
   * @description
   * Number of facilities attached to the intervention.
   *
   * @type {number}
   */
  readonly facilitiesCount: number;

  /**
   * Property equipmentCount
   * @readonly
   *
   * @description
   * Number of equipment items attached to the intervention.
   *
   * @type {number}
   */
  readonly equipmentCount: number;

  /**
   * Property inspectionsCount
   * @readonly
   *
   * @description
   * Number of inspections recorded for the intervention.
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
