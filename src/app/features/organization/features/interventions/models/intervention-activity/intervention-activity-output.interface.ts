import type { HydraItem } from '@core/api/models';
import type { InterventionActivityEvent } from './intervention-activity-event.type';
import type { InterventionActivityKind } from './intervention-activity-kind.type';
import type { InterventionStatusChangePayload } from './intervention-status-change-payload.interface';

/**
 * Interface InterventionActivityOutput
 * @interface InterventionActivityOutput
 *
 * @description
 * One entry of the intervention activity timeline (comment or system event),
 * returned by the API sorted `createdAt` ascending.
 */
export interface InterventionActivityOutput extends HydraItem {
  //#region Properties
  /**
   * Property id
   * @readonly
   *
   * @description
   * Unique identifier of the activity entry.
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property intervention
   * @readonly
   *
   * @description
   * IRI of the intervention this activity belongs to.
   *
   * @type {string}
   */
  readonly intervention: string;

  /**
   * Property kind
   * @readonly
   *
   * @description
   * Whether the entry is a user-authored comment or a system entry.
   *
   * @type {InterventionActivityKind}
   */
  readonly kind: InterventionActivityKind;

  /**
   * Property event
   * @readonly
   *
   * @description
   * Specific event this activity records.
   *
   * @type {InterventionActivityEvent}
   */
  readonly event: InterventionActivityEvent;

  /**
   * Property actor
   * @readonly
   *
   * @description
   * IRI of the member who authored the entry, or `null` for system-generated
   * entries with no attributable actor.
   *
   * @type {string | null}
   */
  readonly actor: string | null;

  /**
   * Property body
   * @readonly
   *
   * @description
   * Comment text, or `null` for system entries without free text.
   *
   * @type {string | null}
   */
  readonly body: string | null;

  /**
   * Property payload
   * @readonly
   *
   * @description
   * Structured event data. `{ from; to }` for `status_changed`; a loose
   * record for other system events; `null` for plain comments.
   *
   * @type {InterventionStatusChangePayload | Record<string, unknown> | null}
   */
  readonly payload: InterventionStatusChangePayload | Record<string, unknown> | null;

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
  //#endregion
}
