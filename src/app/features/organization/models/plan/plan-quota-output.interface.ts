import type { OrganizationQuotaResource } from './organization-quota-resource.model';

/**
 * Interface PlanQuotaOutput
 * @interface PlanQuotaOutput
 *
 * @description
 * One per-resource allowance descriptor of a plan: the raw cap plus a ready-made
 * human sentence (for example "Up to 125 facilities" / "Unlimited inspections")
 * provided by the API so cards render without re-deriving the wording.
 */
export interface PlanQuotaOutput {
  //#region Properties
  /** @type {OrganizationQuotaResource} */
  readonly resource: OrganizationQuotaResource;
  /** @type {string} */
  readonly label: string;
  /** @type {(number | null)} */
  readonly limit: number | null;
  /** @type {string} */
  readonly summary: string;
  //#endregion
}
