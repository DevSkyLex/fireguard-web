import type {
  InterventionOutput,
  MemberSelectOption,
} from '@features/organization/features/interventions/models';

/**
 * Interface InterventionBoardCardViewModel
 * @interface InterventionBoardCardViewModel
 *
 * @description
 * Presentation view model wrapping one {@link InterventionOutput} for
 * `InterventionBoardCard` — whether its deadline has passed and the
 * resolved responsible option. Kept deliberately separate from
 * `InterventionListItemViewModel` (`ui/pages/interventions-page/models/`):
 * two consumers do not yet justify sharing one shape
 * (`ARCHITECTURE.md` §2.9) and the board card needs neither `siteName` nor
 * the full `people` avatar stack the list row does.
 *
 * @since 1.0.0
 */
export interface InterventionBoardCardViewModel {
  //#region Properties
  /** The intervention this card stands for. */
  readonly intervention: InterventionOutput;

  /** Whether its deadline has passed. */
  readonly isOverdue: boolean;

  /** The resolved responsible member, `null` when unassigned or unresolved. */
  readonly responsible: MemberSelectOption | null;
  //#endregion
}
