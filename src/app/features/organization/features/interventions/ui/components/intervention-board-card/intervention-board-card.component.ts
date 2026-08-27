import { CdkDrag } from '@angular/cdk/drag-drop';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircleAlert, lucideEllipsis } from '@ng-icons/lucide';
import {
  resolveInterventionTag,
  type InterventionOutput,
  type InterventionStatus,
} from '@features/organization/features/interventions/models';
import { isInterventionBoardMoveAllowed } from '@features/organization/features/interventions/utils';
import {
  DEFAULT_REGIONAL_FORMAT_SETTINGS,
  OrgDatePipe,
  type RegionalFormatSettings,
} from '@shared/regional-format';
import { HlmAvatarImports } from '@shared/ui/avatar';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmDropdownMenuImports } from '@shared/ui/dropdown-menu';
import { HlmSpinnerImports } from '@shared/ui/spinner';
import type { InterventionBoardCardViewModel } from '../intervention-board/models';
import { InterventionTag } from '../intervention-tag';

/**
 * Component InterventionBoardCard
 * @class InterventionBoardCard
 *
 * @description
 * One card in `InterventionBoard`'s Kanban board: the `FG-{number}`
 * reference, a link to the detail page, the priority tag, the due date
 * (overdue-styled, icon + colour, never colour alone), the responsible
 * member's avatar and name when resolved, and any labels the intervention
 * carries.
 *
 * The card is the pointer-drag surface (`cdkDrag`, host template), but drag
 * is an enhancement, never the only path: the "Move to…" menu offers the
 * same status moves by click or keyboard, gated by the same
 * {@link isInterventionBoardMoveAllowed} `InterventionBoard`'s own
 * `cdkDropListEnterPredicate` calls, so the two paths can never disagree
 * about what is legal — mirroring
 * `InterventionTable`'s row menu, including its disabled-with-title pattern
 * for the one identity-restricted move (withdrawing a submission).
 *
 * Presentational (`ARCHITECTURE.md` §10.3) — it injects no store and calls no
 * service; {@link moveRequested} is the only write path out, bubbled through
 * `InterventionBoard` to `InterventionsPage`, which decides whether to call
 * `InterventionStore.transition`.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-board-card',
  imports: [
    CdkDrag,
    OrgDatePipe,
    RouterLink,
    NgIcon,
    InterventionTag,
    HlmButton,
    HlmBadge,
    ...HlmSpinnerImports,
    ...HlmAvatarImports,
    ...HlmDropdownMenuImports,
  ],
  providers: [provideIcons({ lucideCircleAlert, lucideEllipsis })],
  templateUrl: './intervention-board-card.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionBoardCard {
  //#region Inputs
  /** The card's own view model. */
  public readonly item: InputSignal<InterventionBoardCardViewModel> =
    input.required<InterventionBoardCardViewModel>();

  /** Path segments the card's title link appends the intervention id to. */
  public readonly detailRouteBase: InputSignal<readonly string[]> =
    input.required<readonly string[]>();

  /**
   * Whether the "Move to…" menu may offer status changes at all — the
   * board-wide permission gate, mirroring `InterventionTable.canTransition`.
   */
  public readonly canTransition: InputSignal<boolean> = input<boolean>(false);

  /**
   * Whether this card's own transition is currently in flight — drag-locked
   * entirely and the menu disabled, since its cached `allowedTransitions`
   * describe the pre-transition state until the server entity lands.
   */
  public readonly locked: InputSignal<boolean> = input<boolean>(false);

  /** The active organization's date pattern and timezone, bound by the parent. The default keeps the component renderable with no context wired. */
  public readonly regionalFormatting: InputSignal<RegionalFormatSettings> =
    input<RegionalFormatSettings>(DEFAULT_REGIONAL_FORMAT_SETTINGS);
  //#endregion

  //#region Outputs
  /** The "Move to…" menu (or a legal drop) asked for a status change. */
  public readonly moveRequested: OutputEmitterRef<InterventionStatus> =
    output<InterventionStatus>();
  //#endregion

  //#region Properties
  /** The reason a gated "Move to…" entry shows on its `title`. */
  protected readonly withdrawOnlyReason: string = $localize`:@@intervention.board.withdrawOnly:Only the responsible can withdraw this submission.`;

  /** The menu trigger's accessible name while the card's own transition is in flight. */
  protected readonly updatingReason: string = $localize`:@@intervention.board.cardUpdating:This card is updating.`;

  /** The menu trigger's accessible name at rest. */
  protected readonly openMenuLabel: string = $localize`:@@intervention.board.cardMenu:Open menu`;

  /**
   * Property moveTargets
   * @readonly
   * @description The status moves the menu offers — the card's own server `allowedTransitions`, or none while {@link canTransition} is false or the card is {@link locked}.
   * @access protected
   * @since 1.0.0
   * @type {Signal<readonly InterventionStatus[]>}
   */
  protected readonly moveTargets: Signal<readonly InterventionStatus[]> = computed(
    (): readonly InterventionStatus[] => {
      if (!this.canTransition() || this.locked()) return [];

      return this.item().intervention.allowedTransitions;
    },
  );
  //#endregion

  //#region Methods
  /**
   * Method statusLabelOf
   * @description Names a status for a menu entry.
   * @access protected
   * @since 1.0.0
   * @param {InterventionStatus} status - The status.
   * @returns {string} Its localized label.
   */
  protected statusLabelOf(status: InterventionStatus): string {
    return resolveInterventionTag('status', status).label;
  }

  /**
   * Method isMoveGated
   * @description Whether a target is legal per {@link isInterventionBoardMoveAllowed} — the same check the page's drop predicate applies.
   * @access protected
   * @since 1.0.0
   * @param {InterventionStatus} target - The offered status target.
   * @returns {boolean} True when the entry must render disabled.
   */
  protected isMoveGated(target: InterventionStatus): boolean {
    return !isInterventionBoardMoveAllowed(this.item().intervention, target);
  }

  /**
   * Method requestMove
   * @description Emits {@link moveRequested} for a legal target only.
   * @access protected
   * @since 1.0.0
   * @param {InterventionStatus} target - The offered status target.
   * @returns {void}
   */
  protected requestMove(target: InterventionStatus): void {
    if (this.isMoveGated(target)) return;
    this.moveRequested.emit(target);
  }

  /**
   * Method dragData
   * @description The card's own intervention, carried by `cdkDrag` as `cdkDragData` for the page's drop predicate and drop handler.
   * @access protected
   * @since 1.0.0
   * @returns {InterventionOutput} The card's intervention.
   */
  protected dragData(): InterventionOutput {
    return this.item().intervention;
  }
  //#endregion
}
