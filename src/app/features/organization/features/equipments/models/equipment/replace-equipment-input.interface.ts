import type { CreateEquipmentInput } from './create-equipment-input.interface';

/**
 * Type ReplacementEquipmentInput
 *
 * @description
 * Identity of a new successor. Organization and location ownership are inherited atomically.
 *
 * @type {ReplacementEquipmentInput}
 */
export type ReplacementEquipmentInput = Omit<
  CreateEquipmentInput,
  'clientId' | 'organization' | 'intervention' | 'facility'
>;

/**
 * Type ReplaceEquipmentInput
 *
 * @description
 * Stable replacement command naming either an existing successor or a new identity.
 *
 * @type {ReplaceEquipmentInput}
 */
export type ReplaceEquipmentInput = {
  /**
   * Property clientOperationId
   *
   * @description
   * Stable UUID retained across retries of the same replacement.
   */
  readonly clientOperationId: string;
} & (
  | { readonly successorEquipmentId: string; readonly successor?: never }
  | { readonly successorEquipmentId?: null; readonly successor: ReplacementEquipmentInput }
);

/**
 * Interface ReplaceEquipmentOutput
 * @interface ReplaceEquipmentOutput
 *
 * @description
 * Receipt of an atomic replacement, including receipt replay information.
 */
export interface ReplaceEquipmentOutput {
  /**
   * Property predecessorEquipmentId
   *
   * @description
   * Retired historical equipment identity.
   */
  readonly predecessorEquipmentId: string;

  /**
   * Property successorEquipmentId
   *
   * @description
   * Installed successor equipment identity.
   */
  readonly successorEquipmentId: string;

  /**
   * Property clientOperationId
   *
   * @description
   * Stable operation UUID acknowledged by the server.
   */
  readonly clientOperationId: string;

  /**
   * Property replayed
   *
   * @description
   * Whether this response reuses an existing receipt.
   */
  readonly replayed: boolean;
}
