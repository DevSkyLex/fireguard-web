import type { PlanQuotaOutput } from './plan-quota-output.interface';

/**
 * Constant ORGANIZATION_QUOTA_RESOURCE
 *
 * @description
 * Canonical organization quota resource keys exposed by the frontend. Each
 * resource maps to a countable entity whose quantity a subscription plan caps.
 * A const object is preferred over a TypeScript enum so consumers get
 * autocomplete and strict typing without extra runtime enum code.
 *
 * @since 1.0.0
 */
export const ORGANIZATION_QUOTA_RESOURCE = {
  MEMBERS: 'members',
  FACILITIES: 'facilities',
  EQUIPMENT: 'equipment',
  INSPECTIONS: 'inspections',
} as const;

/**
 * Type OrganizationQuotaResource
 *
 * @description
 * Backend-owned identifier for a countable quota resource. Known constants remain available
 * without preventing contributed or historical resources from being displayed. The plan quota
 * transport defines the open resource identifier used by quota consumers.
 *
 * @type {string}
 */
export type OrganizationQuotaResource = PlanQuotaOutput['resource'];

/**
 * Constant ORGANIZATION_QUOTA_RESOURCES
 *
 * @description
 * Flat list of all known organization quota resource keys.
 */
export const ORGANIZATION_QUOTA_RESOURCES: ReadonlyArray<OrganizationQuotaResource> = Object.values(
  ORGANIZATION_QUOTA_RESOURCE,
);
