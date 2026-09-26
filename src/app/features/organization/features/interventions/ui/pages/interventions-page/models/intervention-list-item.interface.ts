import type {
  InterventionOutput,
  MemberAvatar,
} from '@features/organization/features/interventions/models';
import type { MemberSelectOption } from '@features/organization/models';

/**
 * Interface InterventionListItemViewModel
 * @interface InterventionListItemViewModel
 *
 * @description
 * Presentation view model wrapping one {@link InterventionOutput} for the list
 * row and board card templates: whether the intervention is overdue or due
 * soon, the resolved site display name, responsible member and avatar-stack
 * people. Every other rendered field reads straight off the wrapped
 * `intervention`.
 *
 * @since 6.0.0
 */
export interface InterventionListItemViewModel {
  //#region Properties
  /** The intervention this row stands for. */
  readonly intervention: InterventionOutput;

  /** Whether its deadline has passed. */
  readonly isOverdue: boolean;

  /** Whether its deadline falls inside the due-soon window. */
  readonly isDueSoon: boolean;

  /** Display name of the site it concerns, when one is resolved. */
  readonly siteName: string | null;

  /** Resolved responsible member, or `null` when the assignment is unknown. */
  readonly responsible: MemberSelectOption | null;

  /** People shown in the avatar stack. */
  readonly people: readonly MemberAvatar[];
  //#endregion
}
