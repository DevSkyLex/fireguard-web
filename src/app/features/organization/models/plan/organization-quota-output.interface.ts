import type { HydraItem } from '@core/models/api';
import type { OrganizationQuotaResource } from './organization-quota-resource.model';

/**
 * Interface OrganizationQuotaItemOutput
 * @interface OrganizationQuotaItemOutput
 *
 * @description
 * Usage and plan limit for a single capped resource. A `null` limit means the
 * resource is unlimited under the current plan.
 */
export interface OrganizationQuotaItemOutput {
  /** @type {OrganizationQuotaResource} */
  readonly resource: OrganizationQuotaResource;
  /** @type {number} */
  readonly used: number;
  /** @type {(number | null)} */
  readonly limit: number | null;
}

/**
 * Interface OrganizationQuotaOutput
 * @interface OrganizationQuotaOutput
 *
 * @description
 * Per-resource quota usage for an organization, used to render the usage meters
 * in the organization context sidebar.
 */
export interface OrganizationQuotaOutput extends HydraItem {
  /** @type {string} */
  readonly organizationId: string;
  /** @type {ReadonlyArray<OrganizationQuotaItemOutput>} */
  readonly items: ReadonlyArray<OrganizationQuotaItemOutput>;
}
