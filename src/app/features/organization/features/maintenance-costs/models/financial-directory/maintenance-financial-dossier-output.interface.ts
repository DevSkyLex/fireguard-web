import type { HydraItem } from '@core/api/models';
import type {
  MaintenanceFinancialEquipmentIdentity,
  MaintenanceFinancialIdentity,
} from './maintenance-financial-identity.interface';

/**
 * Interface MaintenanceFinancialDossierOutput
 * @interface MaintenanceFinancialDossierOutput
 *
 * @description
 * Minimal paginated dossier directory available with dedicated financial read permission alone.
 */
export interface MaintenanceFinancialDossierOutput extends HydraItem {
  /**
   * Property id
   * @readonly
   *
   * @description
   * Scoped intervention identifier for the private financial dossier route.
   *
   * @access public
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property number
   * @readonly
   *
   * @description
   * Human-readable work reference.
   *
   * @access public
   *
   * @type {string}
   */
  readonly number: number;

  /**
   * Property name
   * @readonly
   *
   * @description
   * Authorized minimal work label.
   *
   * @access public
   *
   * @type {string}
   */
  readonly name: string;

  /**
   * Property type
   * @readonly
   *
   * @description
   * Server-owned work type code retained in the transport contract.
   *
   * @access public
   *
   * @type {string}
   */
  readonly type: string;

  /**
   * Property status
   * @readonly
   *
   * @description
   * Server-owned work state retained without granting operational edit capabilities.
   *
   * @access public
   *
   * @type {string}
   */
  readonly status: string;

  /**
   * Property publishedAt
   * @readonly
   *
   * @description
   * Optional publication instant; historical missing snapshots remain distinct.
   *
   * @access public
   *
   * @type {string | null | undefined}
   */
  readonly publishedAt?: string | null;

  /**
   * Property site
   * @readonly
   *
   * @description
   * Optional minimum site identity captured or resolved by the owning server.
   *
   * @access public
   *
   * @type {MaintenanceFinancialIdentity | null | undefined}
   */
  readonly site?: MaintenanceFinancialIdentity | null;

  /**
   * Property customer
   * @readonly
   *
   * @description
   * Optional internal customer identity; an operator can have no customer record.
   *
   * @access public
   *
   * @type {MaintenanceFinancialIdentity | null | undefined}
   */
  readonly customer?: MaintenanceFinancialIdentity | null;

  /**
   * Property snapshotState
   * @readonly
   *
   * @description
   * Distinguishes immutable publication context, missing historical snapshot and live work.
   *
   * @access public
   *
   * @type {'available' | 'snapshot_missing' | 'live'}
   */
  readonly snapshotState: 'available' | 'snapshot_missing' | 'live';

  /**
   * Property identityComplete
   * @readonly
   *
   * @description
   * Indicates whether the server could resolve the complete scoped identity.
   *
   * @access public
   *
   * @type {boolean}
   */
  readonly identityComplete: boolean;

  /**
   * Property equipment
   * @readonly
   *
   * @description
   * Minimal explicit equipment identities; whole-work costs are never duplicated over this list.
   *
   * @access public
   *
   * @type {readonly MaintenanceFinancialEquipmentIdentity[]}
   */
  readonly equipment: readonly MaintenanceFinancialEquipmentIdentity[];
}
