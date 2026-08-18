import type { HydraItem } from '@core/api/models';

/**
 * Interface MaintenanceCampaignOutput
 * @interface MaintenanceCampaignOutput
 *
 * @description
 * Result of a successful `POST /api/maintenance/campaigns`: the created
 * intervention's bare UUID — **not** an IRI, unlike every other resource
 * reference in this feature — its human-facing number, and how many work
 * items were generated from the matched schedules. `extends HydraItem` only
 * to satisfy `HydraApiService.post`'s generic bound (`ARCHITECTURE.md`
 * §11.3); the action response carries neither `@id` nor `@type`, mirroring
 * `RemoveOrganizationMembersResult`.
 *
 * @since 1.0.0
 */
export interface MaintenanceCampaignOutput extends HydraItem {
  /** Bare UUID of the created intervention. @type {string} */
  readonly interventionId: string;
  /** The intervention's human-facing number. @type {number} */
  readonly number: number;
  /** How many work items were generated. @type {number} */
  readonly workItemsCount: number;
}
