import type { CdkDrag, CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { CdkDropList as CdkDropListDirective } from '@angular/cdk/drag-drop';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  input,
  output,
  signal,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import {
  resolveInterventionTag,
  type InterventionOutput,
  type InterventionStatus,
} from '@features/organization/features/interventions/models';
import { isInterventionBoardMoveAllowed } from '@features/organization/features/interventions/utils';
import { HlmBadge } from '@shared/ui/badge';
import type { InterventionTransitionRequest } from '../../tables/intervention-table';
import { InterventionBoardCard } from '../intervention-board-card';
import { INTERVENTION_BOARD_COLUMNS } from './constants';
import type { InterventionBoardCardViewModel } from './models';

/**
 * Component InterventionBoard
 * @class InterventionBoard
 *
 * @description
 * The Kanban view over the interventions `InterventionsPage` also renders as
 * a table — one column per {@link InterventionStatus}, in workflow order
 * (`INTERVENTION_BOARD_COLUMNS`), labelled through the same
 * `models/intervention-tag/` registry the list and detail pages use.
 *
 * Presentational (`ARCHITECTURE.md` §10.3): it injects no store and calls no
 * service. {@link items} arrives already shaped as
 * {@link InterventionBoardCardViewModel}s — the page resolves the
 * responsible avatar and the overdue flag, exactly as it resolves
 * `InterventionListItemViewModel` for the table — and this component only
 * groups them by status. {@link moveRequested} is the only write path out;
 * the page decides whether to call `InterventionStore.transition`.
 *
 * **Drag-drop legality.** {@link isInterventionBoardMoveAllowed} — the
 * card's server `allowedTransitions` plus the `canWithdraw` gate for
 * submitted → in_progress — governs both `cdkDropListEnterPredicate` and the
 * card's own "Move to…" menu, so the pointer-drag path and the click/keyboard
 * path can never disagree. A card whose id is in {@link transitioningIds} is
 * drag-locked and its menu disabled entirely, since its cached
 * `allowedTransitions`/`revision` are stale mid-flight.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-board',
  imports: [CdkDropListDirective, InterventionBoardCard, HlmBadge],
  templateUrl: './intervention-board.component.html',
  host: { class: 'flex min-h-0 flex-1 flex-col' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionBoard {
  //#region Inputs
  /** Every loaded intervention, already shaped as a board card view model. */
  public readonly items: InputSignal<readonly InterventionBoardCardViewModel[]> =
    input.required<readonly InterventionBoardCardViewModel[]>();

  /** Whether the "Move to…" menu and drag surface may offer status changes at all. */
  public readonly canTransition: InputSignal<boolean> = input<boolean>(false);

  /** Ids of the cards whose own transition is currently in flight — drag-locked and menu-disabled. */
  public readonly transitioningIds: InputSignal<readonly string[]> = input<readonly string[]>([]);

  /** Path segments a card's title link appends the intervention id to. */
  public readonly detailRouteBase: InputSignal<readonly string[]> =
    input.required<readonly string[]>();
  //#endregion

  //#region Outputs
  /** A legal drop or "Move to…" pick — the page decides whether to call `InterventionStore.transition`. */
  public readonly moveRequested: OutputEmitterRef<InterventionTransitionRequest> =
    output<InterventionTransitionRequest>();
  //#endregion

  //#region Properties
  /** Hosts the DOM lookup {@link requestMove} needs to restore focus after a cross-column move. */
  private readonly elementRef: ElementRef<HTMLElement> = inject(ElementRef);

  /** Anchors the {@link requestMove} post-render focus restoration outside the injection context. */
  private readonly injector: Injector = inject(Injector);

  /** The board's fixed column order. */
  protected readonly columns: readonly InterventionStatus[] = INTERVENTION_BOARD_COLUMNS;

  /**
   * `cdkDropList` ids, one per column, for `cdkDropListConnectedTo` — typed
   * as a mutable array because that input's own type is, even though nothing
   * here mutates it.
   */
  protected readonly dropListIds: string[] = INTERVENTION_BOARD_COLUMNS.map(
    (status: InterventionStatus): string => this.dropListId(status),
  );

  /** Every loaded intervention, grouped by status in {@link columns} order. */
  protected readonly board: Signal<
    ReadonlyMap<InterventionStatus, readonly InterventionBoardCardViewModel[]>
  > = computed((): ReadonlyMap<InterventionStatus, readonly InterventionBoardCardViewModel[]> => {
    const grouped = new Map<InterventionStatus, InterventionBoardCardViewModel[]>();
    for (const status of this.columns) grouped.set(status, []);
    for (const item of this.items()) grouped.get(item.intervention.status)?.push(item);

    return grouped;
  });

  /** The `aria-live="polite"` announcement text — reflects the last requested move. */
  protected readonly liveMessage: WritableSignal<string> = signal<string>('');
  //#endregion

  //#region Methods
  /** The `cdkDropList` id for a status column. */
  protected dropListId(status: InterventionStatus): string {
    return `intervention-board-column-${status}`;
  }

  /** Names a status for a column header. */
  protected statusLabelOf(status: InterventionStatus): string {
    return resolveInterventionTag('status', status).label;
  }

  /**
   * Method columnCountLabelOf
   * @description The count badge's accessible name — a bare number reached out of context (a rotor list, element navigation) needs its column named.
   * @access protected
   * @since 1.0.0
   * @param {InterventionStatus} status - The column's status.
   * @returns {string} The localized label.
   */
  protected columnCountLabelOf(status: InterventionStatus): string {
    const count: number = (this.board().get(status) ?? []).length;
    const statusLabel: string = this.statusLabelOf(status);

    return $localize`:@@intervention.board.columnCount:${count}:count: interventions in ${statusLabel}:status:`;
  }

  /**
   * Method canDrop
   * @description Whether a dragged card may enter a given column — the drag-surface half of the legality check the card's own "Move to…" menu also applies.
   * @access protected
   * @since 1.0.0
   * @param {CdkDrag<InterventionOutput>} drag - The card being dragged.
   * @param {CdkDropList<InterventionStatus>} drop - The column being entered.
   * @returns {boolean} True when the drop is legal.
   */
  protected canDrop = (
    drag: CdkDrag<InterventionOutput>,
    drop: CdkDropList<InterventionStatus>,
  ): boolean => {
    const intervention: InterventionOutput = drag.data;
    if (!this.canTransition() || this.transitioningIds().includes(intervention.id)) return false;

    return isInterventionBoardMoveAllowed(intervention, drop.data);
  };

  /**
   * Method onDropped
   * @method onDropped
   *
   * @description
   * A card was dropped onto a column. A drop back onto its own column is a
   * no-op; a legal cross-column drop is handed to {@link requestMove}.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {CdkDragDrop<InterventionStatus>} event - The CDK drop event.
   *
   * @returns {void}
   */
  protected onDropped(event: CdkDragDrop<InterventionStatus, InterventionStatus>): void {
    if (event.previousContainer === event.container) return;

    const intervention: InterventionOutput = event.item.data as InterventionOutput;
    const target: InterventionStatus = event.container.data;
    this.requestMove(intervention, target);
  }

  /**
   * Method requestMove
   * @description The single entry point both the drop handler and each card's "Move to…" menu call — re-validates legality defensively, emits {@link moveRequested}, announces the move, and restores keyboard focus onto the moved card's title link: re-parenting the card into another column's `@for` makes Angular destroy and recreate its DOM node, so a plain focus-restore would land on a detached element and drop focus to `<body>`.
   * @access protected
   * @since 1.0.0
   * @param {InterventionOutput} intervention - The card's intervention.
   * @param {InterventionStatus} target - The requested status.
   * @returns {void}
   */
  protected requestMove(intervention: InterventionOutput, target: InterventionStatus): void {
    if (!isInterventionBoardMoveAllowed(intervention, target)) return;

    this.moveRequested.emit({ intervention, status: target });
    this.liveMessage.set(
      $localize`:@@intervention.board.moved:Moved ${intervention.name}:name: to ${this.statusLabelOf(target)}:status:.`,
    );
    afterNextRender(
      (): void => {
        this.elementRef.nativeElement
          .querySelector<HTMLAnchorElement>(
            `[data-intervention-id="${intervention.id}"] a[data-testid="intervention-board-card-title"]`,
          )
          ?.focus();
      },
      { injector: this.injector },
    );
  }
  //#endregion
}
