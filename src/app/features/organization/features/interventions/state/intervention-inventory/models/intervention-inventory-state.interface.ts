import type { CallState } from '@core/request-state';
import type {
  InterventionInventoryScope,
  InterventionInventorySnapshot,
} from '@features/organization/features/interventions/models';
import type {
  DeclareInventoryConsumptionInput,
  InventoryConsumptionIntent,
} from '@features/organization/features/inventory/models';

/**
 * Interface InterventionInventoryState
 * @interface InterventionInventoryState
 *
 * @description
 * Account-owned device and server facts have independent persistence states.
 */
export interface InterventionInventoryState {
  /**
   * Property scope
   * @readonly
   *
   * @description
   * Account, session and workspace authorized for the current inventory view.
   *
   * @type {InterventionInventoryScope | null}
   */
  readonly scope: InterventionInventoryScope | null;

  /**
   * Property snapshot
   * @readonly
   *
   * @description
   * Durable catalog and server facts; individual receipts never imply a complete catalog.
   *
   * @type {InterventionInventorySnapshot | null}
   */
  readonly snapshot: InterventionInventorySnapshot | null;

  /**
   * Property readCallState
   * @readonly
   *
   * @description
   * Request state for authorized snapshot restoration and complete server preparation.
   *
   * @type {CallState}
   */
  readonly readCallState: CallState;

  /**
   * Property queueCallState
   * @readonly
   *
   * @description
   * Request state for the durable write of a stable physical declaration.
   *
   * @type {CallState}
   */
  readonly queueCallState: CallState;

  /**
   * Property localIntents
   * @readonly
   *
   * @description
   * Unacknowledged local declarations remain distinct from server stock confirmation.
   *
   * @type {readonly InventoryConsumptionIntent[]}
   */
  readonly localIntents: readonly InventoryConsumptionIntent[];

  /**
   * Property acceptedOperationId
   * @readonly
   *
   * @description
   * Matching operation whose device write completed, allowing its form input to clear.
   *
   * @type {string | null}
   */
  readonly acceptedOperationId: string | null;

  /**
   * Property unpersistedInput
   * @readonly
   *
   * @description
   * Submitted physical fact retained in memory while durable persistence remains unresolved.
   *
   * @type {DeclareInventoryConsumptionInput | null}
   */
  readonly unpersistedInput: DeclareInventoryConsumptionInput | null;

  /**
   * Property fromDevice
   * @readonly
   *
   * @description
   * Indicates restored device data rather than a completed current server preparation.
   *
   * @type {boolean}
   */
  readonly fromDevice: boolean;
}
