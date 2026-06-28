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
import {
  resolveInterventionTag,
  type InterventionBoardBucket,
  type InterventionBoardColumnId,
  type InterventionOutput,
} from '@features/organization/features/interventions/models';
import { InterventionTag } from '@features/organization/features/interventions/ui/components/intervention-tag';
import {
  canTransition,
  dropTargetForColumn,
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
 * action menu), gates drops through the workflow transition policy, and forwards
 * card open, advance and create intents to the parent page. It injects no store
 * and performs no transport.
 *
 * @version 2.0.0
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
   * Drop predicate handed to the generic board: a card may enter a lane only when
   * its current status may legally transition into that lane's drop target.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {(card: KanbanCard, toColumnId: string) => boolean}
   */
  protected readonly canDrop = (card: KanbanCard, toColumnId: string): boolean => {
    const target = dropTargetForColumn(toColumnId as InterventionBoardColumnId);

    return target !== null && canTransition((card.data as InterventionOutput).status, target);
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
    if (target !== null && canTransition(intervention.status, target)) {
      this.advance.emit({ intervention, toStatus: target });
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
   * Method buildMenu
   * @method buildMenu
   *
   * @description
   * Builds the per-card action menu. Simple forward transitions advance the card
   * in place; review, publish and abandon open the detail workspace where the
   * proper note/blocker UI lives.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InterventionOutput} intervention - Card to build the menu for.
   *
   * @returns {MenuItem[]} Menu model.
   */
  protected buildMenu(intervention: InterventionOutput): MenuItem[] {
    const open: MenuItem = {
      label: $localize`:@@interventionBoard.action.open:Open`,
      icon: 'pi pi-arrow-up-right',
      command: (): void => this.view.emit(intervention),
    };
    const abandon: MenuItem = {
      label: $localize`:@@interventionBoard.action.abandon:Abandon…`,
      icon: 'pi pi-ban',
      command: (): void => this.view.emit(intervention),
    };
    const publish: MenuItem = {
      label: $localize`:@@interventionBoard.action.publish:Publish…`,
      icon: 'pi pi-check-circle',
      command: (): void => this.view.emit(intervention),
    };

    switch (intervention.status) {
      case 'draft':
        return [
          {
            label: $localize`:@@interventionBoard.action.plan:Move to planned`,
            icon: 'pi pi-calendar',
            command: (): void => this.advance.emit({ intervention, toStatus: 'planned' }),
          },
          open,
          abandon,
        ];
      case 'planned':
        return [
          {
            label: $localize`:@@interventionBoard.action.start:Start work`,
            icon: 'pi pi-play',
            command: (): void => this.advance.emit({ intervention, toStatus: 'in_progress' }),
          },
          open,
          abandon,
        ];
      case 'in_progress':
        return [
          {
            label: $localize`:@@interventionBoard.action.submit:Submit for review`,
            icon: 'pi pi-send',
            command: (): void => this.advance.emit({ intervention, toStatus: 'submitted' }),
          },
          open,
          abandon,
        ];
      case 'submitted':
        return [
          publish,
          {
            label: $localize`:@@interventionBoard.action.requestChanges:Request changes…`,
            icon: 'pi pi-reply',
            command: (): void => this.view.emit(intervention),
          },
          open,
        ];
      case 'changes_requested':
        return [
          {
            label: $localize`:@@interventionBoard.action.resume:Resume work`,
            icon: 'pi pi-play',
            command: (): void => this.advance.emit({ intervention, toStatus: 'in_progress' }),
          },
          publish,
          open,
          abandon,
        ];
      default:
        return [open];
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
