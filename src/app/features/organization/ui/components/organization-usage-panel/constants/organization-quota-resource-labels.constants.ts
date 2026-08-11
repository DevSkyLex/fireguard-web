import type { OrganizationQuotaResource } from '@features/organization/models';

/**
 * Constant ORGANIZATION_QUOTA_RESOURCE_LABELS
 * @const ORGANIZATION_QUOTA_RESOURCE_LABELS
 *
 * @description
 * Localized human label for each capped resource, used to name a meter row.
 * `OrganizationQuotaItemOutput` carries no label of its own — unlike a plan's
 * `PlanQuotaOutput`, which the API builds with a ready-made sentence — so this
 * panel names its own rows.
 *
 * @since 1.0.0
 *
 * @type {Readonly<Record<OrganizationQuotaResource, string>>}
 */
export const ORGANIZATION_QUOTA_RESOURCE_LABELS: Readonly<
  Record<OrganizationQuotaResource, string>
> = {
  members: $localize`:@@org.settings.usage.members:Members`,
  facilities: $localize`:@@org.settings.usage.facilities:Facilities`,
  equipment: $localize`:@@org.settings.usage.equipment:Equipment`,
  inspections: $localize`:@@org.settings.usage.inspections:Inspections`,
};
