import type { MaintenanceExportResourceType } from '@features/organization/features/maintenance-exports/models';

/**
 * Interface MaintenanceExportReferenceDirectoryQuery
 * @interface MaintenanceExportReferenceDirectoryQuery
 *
 * @description
 * Server-paginated owner choices for one external-reference resource type.
 */
export interface MaintenanceExportReferenceDirectoryQuery {
  /**
   * Property resourceType
   *
   * @description
   * Directory owner selected for mapping.
   *
   * @type {MaintenanceExportResourceType}
   */
  readonly resourceType: MaintenanceExportResourceType;

  /**
   * Property page
   *
   * @description
   * One-based owner page.
   *
   * @type {number}
   */
  readonly page: number;

  /**
   * Property search
   *
   * @description
   * Optional owner directory search.
   *
   * @type {string}
   */
  readonly search?: string;

  /**
   * Property archived
   *
   * @description
   * Customer status selector; omission browses active customers.
   *
   * @type {boolean}
   */
  readonly archived?: boolean;
}
