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

/**
 * Interface InterventionListGroup
 * @interface InterventionListGroup
 *
 * @description
 * One section of the list render.
 *
 * `isStatus` exists because a status section renders its heading through the
 * feature's tag registry — colour, icon and label together — while a section
 * keyed on a site or a deadline window is plain text. The template must know
 * which without branching on the id.
 *
 * @since 6.0.0
 */
export interface InterventionListGroup {
  //#region Properties
  /** Stable section key, also the fold-state key. */
  readonly id: string;

  /** Heading, already localized. Ignored when {@link isStatus} is true. */
  readonly label: string;

  /** Whether the heading should render as a status tag. */
  readonly isStatus: boolean;

  /** Rows in this section. */
  readonly items: readonly InterventionListItemViewModel[];
  //#endregion
}
