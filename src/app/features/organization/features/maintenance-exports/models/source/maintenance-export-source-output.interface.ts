import type { HydraItem } from '@core/api/models';

/**
 * Interface MaintenanceExportSourceOutput
 * @interface MaintenanceExportSourceOutput
 *
 * @description
 * Published dossier selector uses server readiness, historical scope and bounded pagination.
 */
export interface MaintenanceExportSourceOutput extends HydraItem {
  /**
   * Property id
   *
   * @description
   * Published intervention identity.
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property number
   *
   * @description
   * Readable dossier number.
   *
   * @type {string}
   */
  readonly number: number;

  /**
   * Property name
   *
   * @description
   * Readable dossier title.
   *
   * @type {string}
   */
  readonly name: string;

  /**
   * Property type
   *
   * @description
   * Server intervention type.
   *
   * @type {string}
   */
  readonly type: string;

  /**
   * Property publishedAt
   *
   * @description
   * Actual publication instant.
   *
   * @type {string}
   */
  readonly publishedAt: string;

  /**
   * Property publicationId
   *
   * @description
   * Immutable publication identity.
   *
   * @type {string | null}
   */
  readonly publicationId?: string | null;

  /**
   * Property site
   *
   * @description
   * Site identity retained by the dossier.
   *
   * @type {{ readonly id: string; readonly name: string } | null}
   */
  readonly site?: { readonly id: string; readonly name: string } | null;

  /**
   * Property customer
   *
   * @description
   * Minimal internal customer identity without contacts.
   *
   * @type {{ readonly id: string; readonly name: string } | null}
   */
  readonly customer?: { readonly id: string; readonly name: string } | null;

  /**
   * Property snapshotState
   *
   * @description
   * Server classification of retained publication evidence.
   *
   * @type {string}
   */
  readonly snapshotState: string;

  /**
   * Property identityComplete
   *
   * @description
   * Whether the retained identity is complete.
   *
   * @type {boolean}
   */
  readonly identityComplete: boolean;

  /**
   * Property ready
   *
   * @description
   * Server decision whether this dossier may be exported.
   *
   * @type {boolean}
   */
  readonly ready: boolean;

  /**
   * Property blockedReason
   *
   * @description
   * Explicit blocker for legacy publications without a retained snapshot.
   *
   * @type {'snapshot_missing' | 'no_validated_work' | null}
   */
  readonly blockedReason?: 'snapshot_missing' | 'no_validated_work' | null;
}
