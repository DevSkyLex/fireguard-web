import type { OrganizationPermissionName } from '@features/organization/models';

/**
 * Interface OrganizationAdministrationLinkDefinition
 * @interface OrganizationAdministrationLinkDefinition
 * @description Shared contract for permission-gated organization administration destinations.
 * @since 4.0.0
 */
export interface OrganizationAdministrationLinkDefinition {
  /** Stable destination identifier. */
  readonly id: string;
  /** Localized destination label. */
  readonly label: string;
  /** Registered Lucide icon name. */
  readonly icon: string;
  /** Segment appended to the active organization route. */
  readonly path: string;
  /** Canonical destination query parameters. */
  readonly queryParams: Readonly<Record<string, string>> | null;
  /** Required effective member grants. */
  readonly permissions: ReadonlyArray<OrganizationPermissionName>;
  /** Whether all or any required grant opens the destination. */
  readonly match: 'all' | 'any';
}
