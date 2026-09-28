import {
  ChangeDetectionStrategy,
  Component,
  LOCALE_ID,
  computed,
  inject,
  input,
  output,
  signal,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowRight, lucideCircleAlert, lucideEllipsis, lucideTimer } from '@ng-icons/lucide';
import { INTERACTION_CAPABILITIES_PORT } from '@core/interaction-capabilities';
import type {
  InterventionStatus,
  InterventionBoardCardViewModel,
} from '@features/organization/features/interventions/models';
import { resolveInterventionBoardMoveReason } from '@features/organization/features/interventions/utils';
import { GateReasonDirective } from '@shared/gate-reason';
import {
  DEFAULT_REGIONAL_FORMAT_SETTINGS,
  OrgDatePipe,
  type RegionalFormatSettings,
} from '@shared/regional-format';
import { formatRelativeDays } from '@shared/relative-time';
import { HlmAvatarImports } from '@shared/ui/avatar';
import { HlmButton } from '@shared/ui/button';
import { HlmCardImports } from '@shared/ui/card';
import { HlmDrawerImports } from '@shared/ui/drawer';
import { HlmDropdownMenuImports } from '@shared/ui/dropdown-menu';
import { HlmItemImports } from '@shared/ui/item';
import { HlmProgressImports } from '@shared/ui/progress';
import { HlmSpinnerImports } from '@shared/ui/spinner';
import { InterventionTag } from '../intervention-tag';

/**
 * The window (48 hours) inside which an active deadline counts as "due soon"
 * — mirrors `InterventionsPage`'s own `DUE_SOON_WINDOW_MS`. Not shared: two
 * call sites do not yet justify a `utils/` extraction (`ARCHITECTURE.md` §2.9).
 */
const DUE_SOON_WINDOW_MS: number = 48 * 60 * 60 * 1000;

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
    ...HlmDrawerImports,
    ...HlmItemImports,
    ...HlmCardImports,
    ...HlmProgressImports,
  ],
  providers: [provideIcons({ lucideArrowRight, lucideCircleAlert, lucideEllipsis, lucideTimer })],
  templateUrl: './intervention-board-card.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionBoardCard {
  /**
   * Property mobileActionsVisible
   * @readonly
   * @description Keeps an open touch action drawer mounted until the primitive restores focus on dismissal.
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<boolean>}
   */
  protected readonly mobileActionsVisible: WritableSignal<boolean> = signal(false);

  /**
   * Property isMobileInteractionMode
   * @readonly
   * @description Central interaction mode; viewport width only controls geometry.
   * @access protected
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  protected readonly isMobileInteractionMode: Signal<boolean> = inject(
    INTERACTION_CAPABILITIES_PORT,
  ).isMobileInteractionMode;

  /** The active locale, resolving {@link dueRelativeLabel}. */
  private readonly locale: string = inject(LOCALE_ID);

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

  /**
   * Property isDueSoon
   * @readonly
   *
   * @description
   * Whether the deadline falls inside the 48-hour due-soon window — mirrors
   * `InterventionsPage`'s own row computation, since {@link InterventionBoardCardViewModel}
   * carries {@link InterventionBoardCardViewModel.isOverdue} but not this flag.
   *
   * @access protected
   * @since 6.4.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly isDueSoon: Signal<boolean> = computed((): boolean => {
    const intervention = this.item().intervention;
    const dueTime: number | null = intervention.dueAt
      ? new Date(intervention.dueAt).getTime()
      : null;
    const isTerminal: boolean =
      intervention.status === 'published' || intervention.status === 'abandoned';

    return (
      dueTime !== null &&
      !isTerminal &&
      !this.item().isOverdue &&
      dueTime - Date.now() <= DUE_SOON_WINDOW_MS
    );
  });

  /**
   * Property dueRelativeLabel
   * @readonly
   *
   * @description
   * Day-granular relative label for the deadline ("today", "in 3 days", "2
   * days ago"), or `null` when there is none.
   *
   * @access protected
   * @since 6.4.0
   *
   * @type {Signal<string | null>}
   */
  protected readonly dueRelativeLabel: Signal<string | null> = computed((): string | null => {
    const dueAt: string | null = this.item().intervention.dueAt ?? null;

    return dueAt ? formatRelativeDays(dueAt, new Date().toISOString(), this.locale) : null;
  });

  /**
   * Property progressPercent
   * @readonly
   *
   * @description
   * The card's work-item completion, as a percentage for `hlm-progress`.
   *
   * @access protected
   * @since 6.4.0
   *
   * @type {Signal<number>}
   */
  protected readonly progressPercent: Signal<number> = computed((): number => {
    const intervention = this.item().intervention;
    if (intervention.workItemsCount === 0) return 0;

    return Math.round((intervention.completedWorkItemsCount / intervention.workItemsCount) * 100);
  });

  /**
   * Property progressLabel
   * @readonly
   *
   * @description
   * The accessible name for the card's work-item progress bar.
   *
   * @access protected
   * @since 6.4.0
   *
   * @type {Signal<string>}
   */
  protected readonly progressLabel: Signal<string> = computed((): string => {
    const intervention = this.item().intervention;

    return $localize`:@@intervention.list.workItemsProgress:${intervention.completedWorkItemsCount}:completed: of ${intervention.workItemsCount}:total: work items completed`;
  });

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
   * @returns {boolean} Whether a move command was emitted.
   */
  protected requestMove(target: InterventionStatus): boolean {
    if (!this.canTransition() || this.locked() || this.moveBlockedReason(target) !== null)
      return false;
    this.moveRequested.emit(target);
    return true;
  }

  //#endregion
}
