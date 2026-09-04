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

/**
 * Constant ORGANIZATION_QUOTA_RESOURCE_DESCRIPTIONS
 * @const ORGANIZATION_QUOTA_RESOURCE_DESCRIPTIONS
 *
 * @description
 * Explains what contributes to each quota so an administrator can act before
 * a limit blocks creation.
 *
 * @since 1.1.0
 *
 * @type {Readonly<Record<OrganizationQuotaResource, string>>}
 */
export const ORGANIZATION_QUOTA_RESOURCE_DESCRIPTIONS: Readonly<
  Record<OrganizationQuotaResource, string>
> = {
  members: $localize`:@@org.settings.usage.membersDescription:Active members count toward this limit; pending invitations count after they join.`,
  facilities: $localize`:@@org.settings.usage.facilitiesDescription:Every site and nested facility in this organization counts toward this limit.`,
  equipment: $localize`:@@org.settings.usage.equipmentDescription:All tracked equipment records count, including items currently under maintenance.`,
  inspections: $localize`:@@org.settings.usage.inspectionsDescription:Every recorded inspection counts toward the plan allowance.`,
};
