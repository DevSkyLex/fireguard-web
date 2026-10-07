import type { CallState } from '@core/request-state';
import type {
  ReplaceEquipmentInput,
  ReplaceEquipmentOutput,
} from '@features/organization/features/equipments/models';

/**
 * Interface EquipmentReplacementState
 * @interface EquipmentReplacementState
 *
 * @description
 * Candidate query state and the immutable command retained for receipt replay.
 */
export interface EquipmentReplacementState {
  /**
   * Property candidatesCallState
   *
   * @description
   * Independent state of the server candidate query.
   */
  readonly candidatesCallState: CallState;

  /**
   * Property replaceCallState
   *
   * @description
   * Atomic replacement result or recoverable error.
   */
  readonly replaceCallState: CallState<ReplaceEquipmentOutput | null>;

  /**
   * Property commandEquipmentId
   *
   * @description
   * Equipment whose retained operation may be replayed.
   */
  readonly commandEquipmentId: string | null;

  /**
   * Property commandOrganizationId
   *
   * @description
   * Organization whose retained operation may be replayed.
   */
  readonly commandOrganizationId: string | null;

  /**
   * Property command
   *
   * @description
   * Exact submitted operation retained until a definitive response.
   */
  readonly command: ReplaceEquipmentInput | null;

  /**
   * Property totalCandidates
   *
   * @description
   * Server total used for candidate paging.
   */
  readonly totalCandidates: number;

  /**
   * Property page
   *
   * @description
   * Candidate page displayed in the selector.
   */
  readonly page: number;

  /**
   * Property search
   *
   * @description
   * Current server search string.
   */
  readonly search: string;
}
