import type { HydraCollection } from '@core/api/models';
import type { CallState } from '@core/request-state';
import type {
  MaintenanceExportOutput,
  MaintenanceExportSourceOutput,
  MaintenanceExportReferenceOutput,
  MaintenanceExportReferencePage,
  MaintenanceExportResourceType,
  CreateMaintenanceExportInput,
  AdjustMaintenanceExportInput,
  ConfirmMaintenanceExportInput,
  WriteMaintenanceExportReferenceInput,
} from '@features/organization/features/maintenance-exports/models';

/**
 * Interface MaintenanceExportScope
 * @interface MaintenanceExportScope
 *
 * @description
 * Private workspace identity includes the authenticated session generation.
 */
export interface MaintenanceExportScope {
  /**
   * Property organizationId
   *
   * @description
   * Active owning organization.
   *
   * @type {string}
   */
  readonly organizationId: string;
  /**
   * Property sessionRevision
   *
   * @description
   * Authenticated session generation captured at acceptance.
   *
   * @type {number}
   */
  readonly sessionRevision: number;
}

/**
 * Type MaintenanceExportCommand
 *
 * @description
 * Exact accepted operations retain the source revision and stable receipt identity.
 *
 * @type {MaintenanceExportCommand}
 */
export type MaintenanceExportCommand =
  | {
      readonly kind: 'create';
      readonly organizationId: string;
      readonly input: CreateMaintenanceExportInput;
    }
  | {
      readonly kind: 'adjust';
      readonly organizationId: string;
      readonly exportId: string;
      readonly revision: number;
      readonly input: AdjustMaintenanceExportInput;
    }
  | {
      readonly kind: 'confirm';
      readonly organizationId: string;
      readonly exportId: string;
      readonly revision: number;
      readonly input: ConfirmMaintenanceExportInput;
    }
  | {
      readonly kind: 'reference';
      readonly organizationId: string;
      readonly resourceType: MaintenanceExportResourceType;
      readonly resourceId: string;
      readonly revision: number;
      readonly input: WriteMaintenanceExportReferenceInput;
    };

/**
 * Interface MaintenanceExportState
 * @interface MaintenanceExportState
 *
 * @description
 * Independent request states keep unavailable reads distinct from confirmed empty pages.
 */
export interface MaintenanceExportState {
  /**
   * Property financialAccess
   *
   * @description
   * Financial grant captured by this private generation, including archive list authority.
   *
   * @type {boolean}
   */
  readonly financialAccess: boolean;
  /**
   * Property scope
   * @readonly
   *
   * @description
   * Organization and session identity whose private results may be displayed.
   *
   * @type {MaintenanceExportScope | null}
   */
  readonly scope: MaintenanceExportScope | null;
  /**
   * Property generation
   * @readonly
   *
   * @description
   * Local scope generation that rejects replies from an obsolete context.
   *
   * @type {number}
   */
  readonly generation: number;
  /**
   * Property page
   * @readonly
   *
   * @description
   * Current authoritative server page, starting at one.
   *
   * @type {number}
   */
  readonly page: number;
  /**
   * Property total
   * @readonly
   *
   * @description
   * Authoritative server count for the selected archive scope.
   *
   * @type {number}
   */
  readonly total: number;
  /**
   * Property listCallState
   * @readonly
   *
   * @description
   * Archive collection request state; failure remains distinct from empty.
   *
   * @type {CallState}
   */
  readonly listCallState: CallState;
  /**
   * Property detailCallState
   * @readonly
   *
   * @description
   * Retained archive detail state, separate from collection loading.
   *
   * @type {CallState<MaintenanceExportOutput>}
   */
  readonly detailCallState: CallState<MaintenanceExportOutput>;
  /**
   * Property sourcesCallState
   * @readonly
   *
   * @description
   * Published dossier selector page with server-owned readiness.
   *
   * @type {CallState<HydraCollection<MaintenanceExportSourceOutput>>}
   */
  readonly sourcesCallState: CallState<HydraCollection<MaintenanceExportSourceOutput>>;
  /**
   * Property referencesCallState
   * @readonly
   *
   * @description
   * Current external mapping page, independent from immutable archives.
   *
   * @type {CallState<HydraCollection<MaintenanceExportReferenceOutput>>}
   */
  readonly referencesCallState: CallState<HydraCollection<MaintenanceExportReferenceOutput>>;
  /**
   * Property mappingCallState
   * @readonly
   *
   * @description
   * Exact current mapping read; successful absence is revision zero.
   *
   * @type {CallState<MaintenanceExportReferenceOutput | null>}
   */
  readonly mappingCallState: CallState<MaintenanceExportReferenceOutput | null>;
  /**
   * Property targetsCallState
   * @readonly
   *
   * @description
   * Readable minimal owner directory choices without contacts.
   *
   * @type {CallState<MaintenanceExportReferencePage>}
   */
  readonly targetsCallState: CallState<MaintenanceExportReferencePage>;
  /**
   * Property writeCallState
   * @readonly
   *
   * @description
   * Accepted command state whose receipt survives transport uncertainty.
   *
   * @type {CallState<MaintenanceExportOutput | MaintenanceExportReferenceOutput>}
   */
  readonly writeCallState: CallState<MaintenanceExportOutput | MaintenanceExportReferenceOutput>;
  /**
   * Property downloadCallState
   * @readonly
   *
   * @description
   * Retained byte-stream state; the browser never regenerates exports.
   *
   * @type {CallState<Blob>}
   */
  readonly downloadCallState: CallState<Blob>;
  /**
   * Property command
   * @readonly
   *
   * @description
   * Frozen operation identity, body and revision retained for an uncertain retry.
   *
   * @type {MaintenanceExportCommand | null}
   */
  readonly command: MaintenanceExportCommand | null;
  /**
   * Property selectedId
   * @readonly
   *
   * @description
   * Archive whose metadata may be retained during a same-target refresh.
   *
   * @type {string | null}
   */
  readonly selectedId: string | null;
}
