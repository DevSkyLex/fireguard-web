import type { HydraItem } from '@core/api/models';
import type { OrganizationQuotaResource } from './organization-quota-resource.model';
import type { PlanQuotaOutput } from './plan-quota-output.interface';

/**
 * Type PlanLimits
 *
 * @description
 * Per-resource quantity caps keyed by quota resource. A resource absent from the
 * map is unlimited under the plan.
 */
export type PlanLimits = Partial<Record<OrganizationQuotaResource, number>>;

/**
 * Interface PlanOutput
 * @interface PlanOutput
 *
 * @description
 * Subscription plan resource returned by the API.
 */
export interface PlanOutput extends HydraItem {
  //#region Properties
  /** @type {string} */
  readonly id: string;
  /** @type {string} */
  readonly key: string;
  /** @type {string} */
  readonly name: string;
  /** @type {(string | null | undefined)} */
  readonly description?: string | null;
  /** @type {PlanLimits} */
  readonly limits: PlanLimits;
  /** @type {ReadonlyArray<PlanQuotaOutput>} */
  readonly quotas: ReadonlyArray<PlanQuotaOutput>;
  /** @type {boolean} */
  readonly isActive: boolean;
  /** @type {boolean} */
  readonly isDefault: boolean;
  /** @type {number} */
  readonly sortOrder: number;
  /** @type {string} */
  readonly createdAt: string;
  /** @type {string} */
  readonly updatedAt: string;
  //#endregion
}
