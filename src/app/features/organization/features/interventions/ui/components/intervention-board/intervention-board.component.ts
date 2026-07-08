import { DatePipe } from '@angular/common';
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
import type { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { ProgressBarModule } from 'primeng/progressbar';
import type { StoreError } from '@core/request-state';
import {
  resolveInterventionTag,
  type InterventionBoardBucket,
  type InterventionBoardColumnId,
  type InterventionOutput,
  type InterventionStatus,
} from '@features/organization/features/interventions/models';
import { InterventionTag } from '@features/organization/features/interventions/ui/components/intervention-tag';
import {
  canTransitionIntervention,
  capabilityForTransition,
  resolveAllowedTransitions,
  dropTargetForColumn,
  type InterventionTransitionCapability,
} from '@features/organization/features/interventions/utils';
import {
  EmptyState,
  Kanban,
  type KanbanCard,
  type KanbanColumn,
  type KanbanDropEvent,
} from '@shared/components';
import type { InterventionBoardAdvanceEvent } from './models';

/**
 * Type InterventionBoardColumnPresentation
 *
 * @description
 * Lane header presentation: localized label, icon and the Tailwind accent-color
 * class driving the lane's separator bar. Local to the component because it is
 * pure presentation with no consumer outside the board.
 */
interface InterventionBoardColumnPresentation {
  readonly label: string;
  readonly icon: string;
  readonly accentClass: string;
}

/**
 * Constant COLUMN_PRESENTATION
 * @const COLUMN_PRESENTATION
 *
 * @description
 * Static header presentation per lane. Each lane carries its own accent-color
 * separator: a neutral start for draft, blue for planned, the brand primary for
 * the active in-progress stage, violet for review and emerald for published.
 *
 * @since 1.0.0
 *
 * @type {Record<InterventionBoardColumnId, InterventionBoardColumnPresentation>}
 */
const COLUMN_PRESENTATION: Record<InterventionBoardColumnId, InterventionBoardColumnPresentation> =
  {
    draft: {
      label: $localize`:@@interventionBoard.column.draft:Draft`,
      icon: 'pi pi-pencil',
      accentClass: 'bg-surface-300 dark:bg-surface-600',
    },
    planned: {
      label: $localize`:@@interventionBoard.column.planned:Planned`,
      icon: 'pi pi-calendar',
      accentClass: 'bg-blue-500 dark:bg-blue-400',
    },
    in_progress: {
      label: $localize`:@@interventionBoard.column.inProgress:In progress`,
      icon: 'pi pi-hourglass',
      accentClass: 'bg-primary-500 dark:bg-primary-400',
    },
    review: {
      label: $localize`:@@interventionBoard.column.review:In review`,
      icon: 'pi pi-eye',
      accentClass: 'bg-violet-500 dark:bg-violet-400',
    },
    published: {
      label: $localize`:@@interventionBoard.column.published:Published`,
      icon: 'pi pi-check-circle',
      accentClass: 'bg-emerald-500 dark:bg-emerald-400',
    },
  };

/**
 * Component InterventionBoard
 * @class InterventionBoard
 *
 * @description
 * Intervention-aware pipeline board: a thin wrapper composing the generic shared
 * {@link Kanban}. It maps intervention lanes onto kanban columns, projects the
 * intervention card (priority, site, due/blocker chips, progress and a per-card
 * action menu), gates drops through the per-card workflow transition policy
 * (`allowedTransitions`) intersected with the current user's RBAC capabilities,
 * and forwards card open, advance, abandon, retry and create intents to the
 * parent page. It injects no store and performs no transport.
 *
 * @version 3.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-board',
  imports: [
    ButtonModule,
    DatePipe,
    EmptyState,
    InterventionTag,
    Kanban,
    MenuModule,
    ProgressBarModule,
  ],
  templateUrl: './intervention-board.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionBoard {
  //#region Inputs
  /**
   * Property columns
   * @readonly
   *
   * @description
   * Intervention lanes to render, in display order.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly InterventionBoardBucket[]>}
   */
  public readonly columns: InputSignal<readonly InterventionBoardBucket[]> =
    input.required<readonly InterventionBoardBucket[]>();

  /**
   * Property loading
   * @readonly
   *
   * @description
   * Whether the board is loading.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input.required<boolean>();

  /**
   * Property empty
   * @readonly
   *
   * @description
   * Whether the organization has no interventions to board.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly empty: InputSignal<boolean> = input.required<boolean>();

  /**
   * Property error
   * @readonly
   *
   * @description
   * Normalized load error, or `null` when the last board load succeeded. When
   * set, the board renders a dedicated error surface with a retry action instead
   * of the lanes or the empty state.
   *
   * @access public
   * @since 3.0.0
   *
   * @type {InputSignal<StoreError | null>}
   */
  public readonly error: InputSignal<StoreError | null> = input<StoreError | null>(null);

  /**
   * Property canPlan
   * @readonly
   *
   * @description
   * Whether the current user may plan interventions (`INTERVENTIONS_PLAN`).
   * Gates every transition whose required capability is `plan`.
   *
   * @access public
   * @since 3.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly canPlan: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property canExecute
   * @readonly
   *
   * @description
   * Whether the current user may execute interventions (`INTERVENTIONS_EXECUTE`).
   * Gates every transition whose required capability is `execute`.
   *
   * @access public
   * @since 3.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly canExecute: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property canReview
   * @readonly
   *
   * @description
   * Whether the current user may review interventions (`INTERVENTIONS_REVIEW`).
   * Gates every transition whose required capability is `review`.
   *
   * @access public
   * @since 3.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly canReview: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property canPublish
   * @readonly
   *
   * @description
   * Whether the current user may publish interventions (`INTERVENTIONS_PUBLISH`).
   * Gates the card menu's "Publish…" shortcut (publication is a separate flow,
   * not a status transition).
   *
   * @access public
   * @since 3.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly canPublish: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /**
   * Property view
   * @readonly
   *
   * @description
   * Emits an intervention to open in the detail workspace.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<InterventionOutput>}
   */
  public readonly view: OutputEmitterRef<InterventionOutput> = output<InterventionOutput>();

  /**
   * Property advance
   * @readonly
   *
   * @description
   * Emits a legal workflow advance (drag or action menu) for the parent store.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<InterventionBoardAdvanceEvent>}
   */
  public readonly advance: OutputEmitterRef<InterventionBoardAdvanceEvent> =
    output<InterventionBoardAdvanceEvent>();

  /**
   * Property createRequested
   * @readonly
   *
   * @description
   * Emits when the user asks to create an intervention from the empty state.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly createRequested: OutputEmitterRef<void> = output<void>();

  /**
   * Property abandon
   * @readonly
   *
   * @description
   * Emits the intervention the user asked to abandon from the card menu, so the
   * parent page can confirm the destructive action before moving it to
   * `abandoned`.
   *
   * @access public
   * @since 3.0.0
   *
   * @type {OutputEmitterRef<InterventionOutput>}
   */
  public readonly abandon: OutputEmitterRef<InterventionOutput> = output<InterventionOutput>();

  /**
   * Property retryRequested
   * @readonly
   *
   * @description
   * Emits when the user retries a failed board load from the error surface.
   *
   * @access public
   * @since 3.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly retryRequested: OutputEmitterRef<void> = output<void>();

  /**
   * Property loadMore
   * @readonly
   *
   * @description
   * Emits the lane whose next bounded page the user asked to reveal from the
   * lane footer, for the parent store's incremental "load more".
   *
   * @access public
   * @since 3.1.0
   *
   * @type {OutputEmitterRef<InterventionBoardColumnId>}
   */
  public readonly loadMore: OutputEmitterRef<InterventionBoardColumnId> =
    output<InterventionBoardColumnId>();
  //#endregion

  //#region Properties
  /**
   * Property emptyColumnLabel
   * @readonly
   *
   * @description
   * Localized placeholder shown in an empty lane, handed to the generic board.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {string}
   */
  protected readonly emptyColumnLabel: string = $localize`:@@interventionBoard.column.empty:Drop a card here`;

  /**
   * Property kanbanColumns
   * @readonly
   *
   * @description
   * Intervention buckets mapped onto generic kanban columns, carrying the
   * intervention back through each card's opaque `data`.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly KanbanColumn[]>}
   */
  protected readonly kanbanColumns: Signal<readonly KanbanColumn[]> = computed<
    readonly KanbanColumn[]
  >(() =>
    this.columns().map((bucket: InterventionBoardBucket): KanbanColumn => {
      const presentation: InterventionBoardColumnPresentation = COLUMN_PRESENTATION[bucket.id];

      return {
        id: bucket.id,
        label: presentation.label,
        icon: presentation.icon,
        accentClass: presentation.accentClass,
        count: bucket.total,
        cards: bucket.items.map(
          (intervention: InterventionOutput): KanbanCard => ({
            id: intervention.id,
            data: intervention,
          }),
        ),
      };
    }),
  );

  /**
   * Property canDrop
   * @readonly
   *
   * @description
   * Drop predicate handed to the generic board: a card may enter a lane when it
   * is a same-lane reorder, or when its current status may legally transition
   * into that lane's drop target (per the card's `allowedTransitions`) AND the
   * current user holds the RBAC capability that transition requires.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {(card: KanbanCard, toColumnId: string) => boolean}
   */
  protected readonly canDrop = (card: KanbanCard, toColumnId: string): boolean => {
    const intervention = card.data as InterventionOutput;
    const target = dropTargetForColumn(toColumnId as InterventionBoardColumnId);
    if (target === null) return false;
    if (intervention.status === target) return true;

    return (
      canTransitionIntervention(intervention, target) &&
      this.isPermitted(intervention.status, target)
    );
  };
  //#endregion

  //#region Methods
  /**
   * Method onDropped
   * @method onDropped
   *
   * @description
   * Maps a generic kanban drop onto a workflow advance for the parent store.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {KanbanDropEvent} event - Generic drop event.
   *
   * @returns {void}
   */
  protected onDropped(event: KanbanDropEvent): void {
    const intervention = event.card.data as InterventionOutput;
    const target = dropTargetForColumn(event.toColumnId as InterventionBoardColumnId);
    if (
      target !== null &&
      intervention.status !== target &&
      canTransitionIntervention(intervention, target) &&
      this.isPermitted(intervention.status, target)
    ) {
      this.advance.emit({ intervention, toStatus: target });
    }
  }

  /**
   * Method isPermitted
   * @method isPermitted
   *
   * @description
   * Whether the current user holds the RBAC capability a `from → to` transition
   * requires, mirroring the backend permission mapping. Same-status moves are a
   * no-op reorder and are always permitted.
   *
   * @access private
   * @since 3.0.0
   *
   * @param {InterventionStatus} from - Source status.
   * @param {InterventionStatus} to - Target status.
   *
   * @returns {boolean} True when the move is authorized for the current user.
   */
  private isPermitted(from: InterventionStatus, to: InterventionStatus): boolean {
    if (from === to) return true;

    const capability: InterventionTransitionCapability = capabilityForTransition(from, to);
    switch (capability) {
      case 'plan':
        return this.canPlan();
      case 'review':
        return this.canReview();
      default:
        return this.canExecute();
    }
  }

  /**
   * Method intervention
   * @method intervention
   *
   * @description
   * Reads the intervention back from a kanban card's opaque payload for the card
   * template.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {KanbanCard} card - Card to unwrap.
   *
   * @returns {InterventionOutput} Wrapped intervention.
   */
  protected intervention(card: KanbanCard): InterventionOutput {
    return card.data as InterventionOutput;
  }

  /**
   * Method laneRemaining
   * @method laneRemaining
   *
   * @description
   * Number of un-loaded cards left in a lane: the server total minus the cards
   * currently rendered. Zero (or less) means the lane is fully loaded and the
   * footer "Load more" affordance is hidden.
   *
   * @access protected
   * @since 3.1.0
   *
   * @param {KanbanColumn} column - Lane to inspect.
   *
   * @returns {number} Count of cards not yet revealed for the lane.
   */
  protected laneRemaining(column: KanbanColumn): number {
    return (column.count ?? column.cards.length) - column.cards.length;
  }

  /**
   * Method laneLoadingMore
   * @method laneLoadingMore
   *
   * @description
   * Whether an incremental "load more" fetch is currently in flight for the lane,
   * read from the matching bucket so the footer can show its busy state.
   *
   * @access protected
   * @since 3.1.0
   *
   * @param {string} columnId - Lane identifier.
   *
   * @returns {boolean} True while the lane's next page is loading.
   */
  protected laneLoadingMore(columnId: string): boolean {
    return this.columns().find((bucket) => bucket.id === columnId)?.loadingMore ?? false;
  }

  /**
   * Method onLoadMore
   * @method onLoadMore
   *
   * @description
   * Emits the lane's typed identifier for the parent store's incremental load.
   * Lane ids always originate from the board's own {@link columns}, so narrowing
   * the generic kanban `column.id` to {@link InterventionBoardColumnId} is safe.
   *
   * @access protected
   * @since 3.1.0
   *
   * @param {KanbanColumn} column - Lane whose next page is requested.
   *
   * @returns {void}
   */
  protected onLoadMore(column: KanbanColumn): void {
    this.loadMore.emit(column.id as InterventionBoardColumnId);
  }

  /**
   * Method buildMenu
   * @method buildMenu
   *
   * @description
   * Builds the per-card action menu by deriving it from the card's workflow-legal
   * `allowedTransitions`, intersected with the current user's RBAC capabilities —
   * a disallowed move is never offered. Forward transitions advance the card in
   * place; "Request changes…" opens the detail workspace (it needs the review
   * note UI). Publication is not a status transition, so a "Publish…" shortcut is
   * appended for review-phase cards when the user may publish. "Open" is always
   * available, and a destructive "Abandon…" is grouped last behind a separator.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InterventionOutput} intervention - Card to build the menu for.
   *
   * @returns {MenuItem[]} Menu model.
   */
  protected buildMenu(intervention: InterventionOutput): MenuItem[] {
    const from: InterventionStatus = intervention.status;
    const allowed: readonly InterventionStatus[] = resolveAllowedTransitions(intervention);

    const items: MenuItem[] = allowed
      .filter((to: InterventionStatus): boolean => to !== 'abandoned' && this.isPermitted(from, to))
      .map((to: InterventionStatus): MenuItem => this.menuItemForTransition(intervention, to));

    if ((from === 'submitted' || from === 'changes_requested') && this.canPublish()) {
      items.push({
        label: $localize`:@@interventionBoard.action.publish:Publish…`,
        icon: 'pi pi-check-circle',
        command: (): void => this.view.emit(intervention),
      });
    }

    items.push({
      label: $localize`:@@interventionBoard.action.open:Open`,
      icon: 'pi pi-arrow-up-right',
      command: (): void => this.view.emit(intervention),
    });

    if (allowed.includes('abandoned') && this.isPermitted(from, 'abandoned')) {
      items.push({ separator: true });
      items.push({
        label: $localize`:@@interventionBoard.action.abandon:Abandon…`,
        icon: 'pi pi-ban',
        styleClass: 'text-red-600 dark:text-red-400',
        command: (): void => this.abandon.emit(intervention),
      });
    }

    return items;
  }

  /**
   * Method menuItemForTransition
   * @method menuItemForTransition
   *
   * @description
   * Maps a single legal target status onto its card-menu action. Forward
   * transitions advance the card in place; `changes_requested` opens the detail
   * workspace where the review note is captured. The `in_progress` label adapts
   * to the source ("Resume work" after changes were requested, "Start work"
   * otherwise).
   *
   * @access private
   * @since 3.0.0
   *
   * @param {InterventionOutput} intervention - Card the action belongs to.
   * @param {InterventionStatus} to - Legal target status.
   *
   * @returns {MenuItem} Menu action for the transition.
   */
  private menuItemForTransition(
    intervention: InterventionOutput,
    to: InterventionStatus,
  ): MenuItem {
    switch (to) {
      case 'planned':
        return {
          label: $localize`:@@interventionBoard.action.plan:Move to planned`,
          icon: 'pi pi-calendar',
          command: (): void => this.advance.emit({ intervention, toStatus: 'planned' }),
        };
      case 'in_progress':
        return {
          label:
            intervention.status === 'changes_requested'
              ? $localize`:@@interventionBoard.action.resume:Resume work`
              : $localize`:@@interventionBoard.action.start:Start work`,
          icon: 'pi pi-play',
          command: (): void => this.advance.emit({ intervention, toStatus: 'in_progress' }),
        };
      case 'submitted':
        return {
          label: $localize`:@@interventionBoard.action.submit:Submit for review`,
          icon: 'pi pi-send',
          command: (): void => this.advance.emit({ intervention, toStatus: 'submitted' }),
        };
      case 'changes_requested':
        return {
          label: $localize`:@@interventionBoard.action.requestChanges:Request changes…`,
          icon: 'pi pi-reply',
          command: (): void => this.view.emit(intervention),
        };
      default:
        return {
          label: $localize`:@@interventionBoard.action.open:Open`,
          icon: 'pi pi-arrow-up-right',
          command: (): void => this.view.emit(intervention),
        };
    }
  }

  /**
   * Method typeIcon
   * @method typeIcon
   *
   * @description
   * Resolves the objective-type icon used as the card avatar.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InterventionOutput} intervention - Card to resolve.
   *
   * @returns {string} PrimeIcon class string.
   */
  protected typeIcon(intervention: InterventionOutput): string {
    return resolveInterventionTag('type', intervention.type).icon;
  }

  /**
   * Method progress
   * @method progress
   *
   * @description
   * Work-item completion percentage for the card progress bar.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InterventionOutput} intervention - Card to resolve.
   *
   * @returns {number} Completion percentage in the 0–100 range.
   */
  protected progress(intervention: InterventionOutput): number {
    return intervention.workItemsCount
      ? (intervention.completedWorkItemsCount / intervention.workItemsCount) * 100
      : 0;
  }

  /**
   * Method isOverdue
   * @method isOverdue
   *
   * @description
   * Whether the card's due date has passed while the intervention is still open.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InterventionOutput} intervention - Card to resolve.
   *
   * @returns {boolean} True when the due date is in the past and still open.
   */
  protected isOverdue(intervention: InterventionOutput): boolean {
    if (!intervention.dueAt) return false;
    if (intervention.status === 'published' || intervention.status === 'abandoned') return false;

    return new Date(intervention.dueAt).getTime() < Date.now();
  }
  //#endregion
}
