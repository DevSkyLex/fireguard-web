import type { HydraItem } from '@core/api/models';

/**
 * Interface MaintenanceExportFile
 * @interface MaintenanceExportFile
 *
 * @description
 * Integrity metadata describes retained bytes rather than a newly computed download.
 */
export interface MaintenanceExportFile {
  /**
   * Property mediaType
   *
   * @description
   * Exact server media type.
   *
   * @type {string}
   */
  readonly mediaType: string;

  /**
   * Property sha256
   *
   * @description
   * Checksum of the persisted file.
   *
   * @type {string}
   */
  readonly sha256: string;

  /**
   * Property size
   *
   * @description
   * Persisted byte count.
   *
   * @type {number}
   */
  readonly size: number;
}

/**
 * Interface MaintenanceExportConfirmation
 * @interface MaintenanceExportConfirmation
 *
 * @description
 * Manual acknowledgement records an actual external import independently from generation.
 */
export interface MaintenanceExportConfirmation {
  /**
   * Property clientOperationId
   *
   * @description
   * Stable confirmation identity.
   *
   * @type {string}
   */
  readonly clientOperationId: string;

  /**
   * Property externalImportReference
   *
   * @description
   * External import acknowledgement supplied by the operator.
   *
   * @type {string}
   */
  readonly externalImportReference: string;

  /**
   * Property confirmedAt
   *
   * @description
   * Server acknowledgement instant.
   *
   * @type {string}
   */
  readonly confirmedAt: string;

  /**
   * Property actorId
   *
   * @description
   * Member who confirmed the import.
   *
   * @type {string}
   */
  readonly actorId: string;
}

/**
 * Interface MaintenanceExportOutput
 * @interface MaintenanceExportOutput
 *
 * @description
 * Immutable versioned export archive; adjustments retain the original archive and publication
 * identity.
 */
export interface MaintenanceExportOutput extends HydraItem {
  /**
   * Property id
   *
   * @description
   * Stable export identity.
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property organizationId
   *
   * @description
   * Owning organization boundary.
   *
   * @type {string}
   */
  readonly organizationId: string;

  /**
   * Property kind
   *
   * @description
   * Original export or linked correction.
   *
   * @type {'initial' | 'adjustment'}
   */
  readonly kind: 'initial' | 'adjustment';

  /**
   * Property schemaVersion
   *
   * @description
   * Version of the persisted row schema.
   *
   * @type {1}
   */
  readonly schemaVersion: 1;

  /**
   * Property system
   *
   * @description
   * Target external system code.
   *
   * @type {string}
   */
  readonly system: string;

  /**
   * Property includeInternalCosts
   *
   * @description
   * Whether this archive requires separate financial read permission.
   *
   * @type {boolean}
   */
  readonly includeInternalCosts: boolean;

  /**
   * Property sourceInterventionIds
   *
   * @description
   * Stable published dossiers included in this export.
   *
   * @type {readonly string[]}
   */
  readonly sourceInterventionIds: readonly string[];

  /**
   * Property originalExportId
   *
   * @description
   * Root export in a correction chain.
   *
   * @type {string | null}
   */
  readonly originalExportId?: string | null;

  /**
   * Property adjustmentOf
   *
   * @description
   * Direct predecessor corrected by this archive.
   *
   * @type {string | null}
   */
  readonly adjustmentOf?: string | null;

  /**
   * Property reason
   *
   * @description
   * Immutable operator reason retained for the linked adjustment.
   *
   * @type {string | null}
   */
  readonly reason?: string | null;

  /**
   * Property createdAt
   *
   * @description
   * Archive creation instant.
   *
   * @type {string}
   */
  readonly createdAt: string;

  /**
   * Property actorId
   *
   * @description
   * Author of the immutable archive.
   *
   * @type {string}
   */
  readonly actorId: string;

  /**
   * Property revision
   *
   * @description
   * Displayed optimistic revision for administrative acknowledgements.
   *
   * @type {number}
   */
  readonly revision: number;

  /**
   * Property state
   *
   * @description
   * Generation and confirmed external import remain distinct.
   *
   * @type {'generated' | 'import_confirmed'}
   */
  readonly state: 'generated' | 'import_confirmed';

  /**
   * Property confirmation
   *
   * @description
   * Explicit import acknowledgement if one exists.
   *
   * @type {MaintenanceExportConfirmation | null}
   */
  readonly confirmation?: MaintenanceExportConfirmation | null;

  /**
   * Property rowCount
   *
   * @description
   * Number of persisted prestation rows.
   *
   * @type {number}
   */
  readonly rowCount: number;

  /**
   * Property files
   *
   * @description
   * Both retained formats share the same archive identity.
   *
   * @type {{ readonly json: MaintenanceExportFile; readonly csv: MaintenanceExportFile }}
   */
  readonly files: { readonly json: MaintenanceExportFile; readonly csv: MaintenanceExportFile };

  /**
   * Property replayed
   *
   * @description
   * Whether the server recovered the original operation receipt.
   *
   * @type {boolean}
   */
  readonly replayed: boolean;

  /**
   * Property costsComplete
   *
   * @description
   * Unknown financial values remain explicitly incomplete when costs are included.
   *
   * @type {boolean | null}
   */
  readonly costsComplete?: boolean | null;

  /**
   * Property incompleteCostCount
   *
   * @description
   * Number of retained prestations with explicitly incomplete costs in a private archive.
   *
   * @type {number | null}
   */
  readonly incompleteCostCount?: number | null;
}
