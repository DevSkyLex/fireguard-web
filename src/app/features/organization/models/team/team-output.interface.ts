import type { HydraItem } from '@core/api/models';

/**
 * Interface TeamOutput
 * @interface TeamOutput
 *
 * @description
 * Organization team resource (`GET /organizations/{organizationId}/teams`) —
 * a named group of members. Only the fields the intervention team-assignment
 * picker needs are consumed today, but the interface mirrors the backend
 * DTO in full.
 */
export interface TeamOutput extends HydraItem {
  //#region Properties
  /** @type {string} */
  readonly id: string;
  /** @type {string} */
  readonly organizationId: string;
  /** @type {string} */
  readonly name: string;
  /** @type {string} */
  readonly description: string;
  /** Active members currently in the team. */
  readonly memberCount: number;
  /** @type {string} */
  readonly createdAt: string;
  /** @type {string} */
  readonly updatedAt: string;
  //#endregion
}
