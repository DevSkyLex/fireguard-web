import type { OrganizationQuotaResource } from '@features/organization/models';

/**
 * Constant QUOTA_NEAR_LIMIT_RATIO
 *
 * @description
 * Usage ratio (used / limit) at or above which a capped resource is considered
 * to be approaching its plan limit and surfaced as a `near` quota status. Shared
 * by the usage meters and any proactive limit-awareness UI so the warning
 * threshold stays consistent across the feature.
 *
 * @since 1.0.0
 */
export const QUOTA_NEAR_LIMIT_RATIO = 0.8;

/**
 * Constant ORGANIZATION_QUOTA_RESOURCE_LABELS
 *
 * @description
 * Human-readable labels for each capped resource, used by the usage meters, the
 * usage panel and the quota upgrade prompt. The quota usage payload carries only
 * the resource key, so the label is resolved client-side here (the per-plan
 * cards use the server-phrased `PlanQuotaOutput.summary` instead).
 *
 * @since 1.0.0
 */
export const ORGANIZATION_QUOTA_RESOURCE_LABELS: Record<OrganizationQuotaResource, string> = {
  members: 'Members',
  facilities: 'Facilities',
  equipment: 'Equipment',
  inspections: 'Inspections',
};

/**
 * Constant QUOTA_LIMIT_REACHED_TOOLTIP
 *
 * @description
 * Tooltip shown on a creation action that is disabled because the organization
 * has reached its plan limit for the resource. Shared by every create entry
 * point so the wording stays consistent.
 *
 * @since 1.0.0
 */
export const QUOTA_LIMIT_REACHED_TOOLTIP = 'Plan limit reached — upgrade to add more';
