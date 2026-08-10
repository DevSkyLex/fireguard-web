import type {
  InterventionOutput,
  MemberAvatar,
} from '@features/organization/features/interventions/models';

/**
 * Interface InterventionListItemViewModel
 * @interface InterventionListItemViewModel
 *
 * @description
 * Presentation view model wrapping one {@link InterventionOutput} for the list
 * row and board card templates: whether the intervention is overdue or due
 * soon, the resolved site display name and the resolved avatar-stack people.
 * Every other rendered field reads straight off the wrapped `intervention`.
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

  /** People shown in the avatar stack. */
  readonly people: readonly MemberAvatar[];
  //#endregion
}
