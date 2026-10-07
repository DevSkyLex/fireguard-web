import type { CallState } from '@core/request-state';
import type {
  MaintenanceCostOutput,
  MaintenanceCurrencyOutput,
  MaintenanceRateOutput,
} from '@features/organization/features/maintenance-costs/models';
import type { MemberSelectOption } from '@features/organization/models';
import type { MaintenanceCostCommand } from './maintenance-cost-command.type';

/**
 * Interface MaintenanceCostScope
 * @interface MaintenanceCostScope
 *
 * @description
 * A browser display fence containing no credential or financial payload.
 */
export interface MaintenanceCostScope {
  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Owning organization route parameter.
   *
   * @type {string}
   */
  readonly organizationId: string;
  /**
   * Property sessionRevision
   * @readonly
   *
   * @description
   * Exact contract value for sessionRevision.
   *
   * @type {number}
   */
  readonly sessionRevision: number;
  /**
   * Property interventionId
   * @readonly
   *
   * @description
   * Optional financial dossier context supplied by the route query.
   *
   * @type {string | null}
   */
  readonly interventionId: string | null;
}

/**
 * Type MaintenanceCostMutation
 *
 * @description
 * Authorized response of one financial mutation.
 *
 * @type MaintenanceCostMutation
 */
export type MaintenanceCostMutation =
  | MaintenanceCostOutput
  | MaintenanceCurrencyOutput
  | MaintenanceRateOutput;

/**
 * Interface MaintenanceCostState
 * @interface MaintenanceCostState
 *
 * @description
 * Route-owned private projections and explicit independently tracked asynchronous operations.
 */
export interface MaintenanceCostState {
  /**
   * Property scope
   * @readonly
   *
   * @description
   * Private organization and intervention context for this draft.
   *
   * @type {MaintenanceCostScope | null}
   */
  readonly scope: MaintenanceCostScope | null;
  /**
   * Property scopeVersion
   * @readonly
   *
   * @description
   * Exact contract value for scopeVersion.
   *
   * @type {number}
   */
  readonly scopeVersion: number;
  /**
   * Property costCallState
   * @readonly
   *
   * @description
   * Exact contract value for costCallState.
   *
   * @type {CallState<MaintenanceCostOutput>}
   */
  readonly costCallState: CallState<MaintenanceCostOutput>;
  /**
   * Property currencyCallState
   * @readonly
   *
   * @description
   * Exact contract value for currencyCallState.
   *
   * @type {CallState<MaintenanceCurrencyOutput>}
   */
  readonly currencyCallState: CallState<MaintenanceCurrencyOutput>;
  /**
   * Property ratesCallState
   * @readonly
   *
   * @description
   * Exact contract value for ratesCallState.
   *
   * @type {CallState}
   */
  readonly ratesCallState: CallState;
  /**
   * Property membersCallState
   * @readonly
   *
   * @description
   * Exact contract value for membersCallState.
   *
   * @type {CallState<readonly MemberSelectOption[]>}
   */
  readonly membersCallState: CallState<readonly MemberSelectOption[]>;
  /**
   * Property writeCallState
   * @readonly
   *
   * @description
   * Exact contract value for writeCallState.
   *
   * @type {CallState<MaintenanceCostMutation>}
   */
  readonly writeCallState: CallState<MaintenanceCostMutation>;
  /**
   * Property command
   * @readonly
   *
   * @description
   * Exact contract value for command.
   *
   * @type {MaintenanceCostCommand | null}
   */
  readonly command: MaintenanceCostCommand | null;
  /**
   * Property ratePage
   * @readonly
   *
   * @description
   * Exact contract value for ratePage.
   *
   * @type {number}
   */
  readonly ratePage: number;
  /**
   * Property rateTotal
   * @readonly
   *
   * @description
   * Exact contract value for rateTotal.
   *
   * @type {number}
   */
  readonly rateTotal: number;
}
