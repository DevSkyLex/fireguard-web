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
  type InterventionStatus,
} from '@features/organization/features/interventions/models';
import type { InterventionBoardCardViewModel } from '@features/organization/features/interventions/models';
import { resolveInterventionBoardMoveReason } from '@features/organization/features/interventions/utils';
import { GateReasonDirective } from '@shared/gate-reason';
import {
  DEFAULT_REGIONAL_FORMAT_SETTINGS,
  OrgDatePipe,
  type RegionalFormatSettings,
} from '@shared/regional-format';
import { HlmAvatarImports } from '@shared/ui/avatar';
import { HlmButton } from '@shared/ui/button';
import { HlmCardImports } from '@shared/ui/card';
import { HlmDropdownMenuImports } from '@shared/ui/dropdown-menu';
import { HlmSpinnerImports } from '@shared/ui/spinner';
import { InterventionTag } from '../intervention-tag';

/**
 * Component InterventionBoardCard
 * @class InterventionBoardCard
 *
 * @description
 * Domain-owned card content projected into shared Board: reference, title,
 * deadline and responsible member, with plain labels and non-default priority only. Native card slots keep
 * the action separate from long titles. Board owns pointer dragging; this card
 * supplies the equivalent keyboard/menu path using the same feature policy.
 * It emits a status request and never calls a store or a service.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-board-card',
  imports: [
    GateReasonDirective,
    OrgDatePipe,
    RouterLink,
    NgIcon,
    InterventionTag,
    HlmButton,
    ...HlmSpinnerImports,
    ...HlmAvatarImports,
    ...HlmDropdownMenuImports,
    ...HlmCardImports,
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
   * Property currentMemberIri
   * @readonly
   *
   * @description
   * Active organization member used by the same execution membership policy as pointer drops.
   *
   * @access public
   * @since 1.1.0
   *
   * @type {InputSignal<string | null>}
   */
  public readonly currentMemberIri: InputSignal<string | null> = input<string | null>(null);

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
  /**
   * Property hasDistinctPriority
   * @readonly
   *
   * @description
   * Shows only non-default priority so ordinary cards keep their operational details prominent.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly hasDistinctPriority: Signal<boolean> = computed(
    () => this.item().intervention.priority !== 'normal',
  );

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
   * Method moveBlockedReason
   * @method moveBlockedReason
   *
   * @description
   * Explains the same transition and membership restrictions as the page's drop predicate.
   *
   * @access protected
   * @since 1.1.0
   *
   * @param {InterventionStatus} target - The offered status target.
   * @returns {string | null} The visible reason for disabling the entry, or null.
   */
  protected moveBlockedReason(target: InterventionStatus): string | null {
    return resolveInterventionBoardMoveReason(
      this.item().intervention,
      target,
      this.currentMemberIri(),
    );
  }

  /**
   * Method requestMove
   * @method requestMove
   *
   * @description
   * Emits a move request only after rechecking the current transition and membership policy.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InterventionStatus} target - The offered status target.
   * @returns {void}
   */
  protected requestMove(target: InterventionStatus): void {
    if (!this.canTransition() || this.locked() || this.moveBlockedReason(target) !== null) return;
    this.moveRequested.emit(target);
  }

  //#endregion
}
