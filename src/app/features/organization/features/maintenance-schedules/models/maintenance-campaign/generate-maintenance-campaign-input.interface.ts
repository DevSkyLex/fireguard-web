/**
 * Interface GenerateMaintenanceCampaignInput
 * @interface GenerateMaintenanceCampaignInput
 *
 * @description
 * Payload for `POST /api/maintenance/campaigns`. Scopes an inspection
 * campaign to every due/overdue schedule matching `organization` plus the
 * optional `facility`/`equipmentType` narrowing, due before `dueBefore`.
 * Synchronous: a matching 201 carries the created intervention right away,
 * no polling.
 *
 * @since 1.0.0
 */
export interface GenerateMaintenanceCampaignInput {
  /** IRI of the organization, required. @type {string} */
  readonly organization: string;
  /** 2-160 characters, required. @type {string} */
  readonly name: string;
  /** IRI of the facility to scope to. @type {string | undefined} */
  readonly facility?: string;
  /** Bare equipment type value to scope to. @type {string | undefined} */
  readonly equipmentType?: string;
  /** ISO-8601 upper bound on the matched schedules' `nextDueAt`, required. @type {string} */
  readonly dueBefore: string;
}
