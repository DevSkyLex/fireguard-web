import type { HydraItem } from '@core/api/models';

/**
 * Type MaintenanceExportResourceType
 *
 * @description
 * Owner identifiers supported by the versioned external mapping.
 *
 * @type {MaintenanceExportResourceType}
 */
export type MaintenanceExportResourceType = 'customer' | 'site' | 'equipment';

/**
 * Interface MaintenanceExportReferenceOutput
 * @interface MaintenanceExportReferenceOutput
 *
 * @description
 * Optimistic external mapping changes affect future exports only.
 */
export interface MaintenanceExportReferenceOutput extends HydraItem {
  /**
   * Property id
   *
   * @description
   * Stable mapping identity.
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property resourceType
   *
   * @description
   * Owner type of the mapped resource.
   *
   * @type {MaintenanceExportResourceType}
   */
  readonly resourceType: MaintenanceExportResourceType;

  /**
   * Property resourceId
   *
   * @description
   * Organization-scoped owner identifier.
   *
   * @type {string}
   */
  readonly resourceId: string;

  /**
   * Property system
   *
   * @description
   * External system code.
   *
   * @type {string}
   */
  readonly system: string;

  /**
   * Property reference
   *
   * @description
   * Readable external identifier.
   *
   * @type {string}
   */
  readonly reference: string;

  /**
   * Property revision
   *
   * @description
   * Displayed mapping revision; absence starts at zero.
   *
   * @type {number}
   */
  readonly revision: number;

  /**
   * Property updatedAt
   *
   * @description
   * Latest mapping write instant.
   *
   * @type {string}
   */
  readonly updatedAt: string;
}

/**
 * Interface MaintenanceExportReferenceTarget
 * @interface MaintenanceExportReferenceTarget
 *
 * @description
 * Readable authorized mapping choice; no contacts or arbitrary UUID input are exposed.
 */
export interface MaintenanceExportReferenceTarget {
  /**
   * Property id
   *
   * @description
   * Scoped resource identity.
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property label
   *
   * @description
   * Owner-provided human readable identity.
   *
   * @type {string}
   */
  readonly label: string;
}

/**
 * Interface MaintenanceExportReferencePage
 * @interface MaintenanceExportReferencePage
 *
 * @description
 * Minimal readable directory projection retains the authoritative server count without contacts.
 */
export interface MaintenanceExportReferencePage {
  /**
   * Property member
   *
   * @description
   * Readable owner choices for the current server page.
   *
   * @type {readonly MaintenanceExportReferenceTarget[]}
   */
  readonly member: readonly MaintenanceExportReferenceTarget[];

  /**
   * Property totalItems
   *
   * @description
   * Authoritative owner count for this exact scope.
   *
   * @type {number}
   */
  readonly totalItems: number;
}
