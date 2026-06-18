import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  viewChild,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule, type CardPassThroughOptions } from 'primeng/card';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { Table, TableModule, type TablePassThroughOptions } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import {
  resolveInterventionTag,
  type InterventionWorkItemOutput,
} from '@features/organization/features/interventions/models';
import { EmptyState } from '@shared/components';
import { InterventionTag } from '../../components/intervention-tag';
import type { FieldWorkRow } from './models';

/**
 * Regular expression matching an equipment resource IRI, whose work items can
 * carry an evidence photo.
 */
const EQUIPMENT_TARGET_PATTERN: RegExp = /^\/api\/equipment\/[^/?#]+$/;

/**
 * Component InterventionFieldWorkTable
 * @class InterventionFieldWorkTable
 *
 * @description
 * Presentational table rendering the field work of an in-progress intervention,
 * aligned with the other organization tables (notably
 * {@link InterventionWorkItemTable}): a carded surface with a header toolbar
 * (count chip + search box), sortable columns, client-side pagination, the
 * shared status badge and a shared empty state. Each row exposes the field
 * actions available during execution — attach an evidence photo (equipment
 * targets) and skip an unresolved item — as events; the table owns no
 * persistence, file inputs or drawers, leaving that orchestration to the parent.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-field-work-table',
  imports: [
    ButtonModule,
    CardModule,
    EmptyState,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    InterventionTag,
    ReactiveFormsModule,
    TableModule,
    TagModule,
  ],
  templateUrl: './intervention-field-work-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionFieldWorkTable {
  //#region Inputs
  /**
   * Input workItems
   * @readonly
   *
   * @description
   * Field work items (planned and discovered) displayed by the table.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly InterventionWorkItemOutput[]>}
   */
  public readonly workItems: InputSignal<readonly InterventionWorkItemOutput[]> =
    input.required<readonly InterventionWorkItemOutput[]>();

  /**
   * Input canExecute
   * @readonly
   *
   * @description
   * Whether the current user may perform field actions; gates the row actions.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly canExecute: InputSignal<boolean> = input<boolean>(false);

  /**
   * Input saving
   * @readonly
   *
   * @description
   * Whether a field mutation is in flight; disables the row actions.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly saving: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /**
   * Output attachPhoto
   * @readonly
   *
   * @description
   * Requests the parent to capture and attach an evidence photo for the emitted
   * (equipment) work item.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<InterventionWorkItemOutput>}
   */
  public readonly attachPhoto: OutputEmitterRef<InterventionWorkItemOutput> =
    output<InterventionWorkItemOutput>();

  /**
   * Output skip
   * @readonly
   *
   * @description
   * Requests the parent to open the skip drawer for the emitted work item.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<InterventionWorkItemOutput>}
   */
  public readonly skip: OutputEmitterRef<InterventionWorkItemOutput> =
    output<InterventionWorkItemOutput>();
  //#endregion

  //#region Properties
  /**
   * Property cardPt
   * @readonly
   *
   * @description
   * PrimeNG card pass-through classes matching the organization tables: a
   * bordered, shadowless surface that sizes to its content so a sparse table
   * never leaves an empty scroll body.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {CardPassThroughOptions}
   */
  protected readonly cardPt: CardPassThroughOptions = {
    root: {
      class:
        'flex flex-col border border-surface-200 dark:border-surface-800 bg-surface-0 dark:bg-surface-900 shadow-none',
    },
    body: { class: 'p-0' },
  };

  /**
   * Property tablePt
   * @readonly
   *
   * @description
   * PrimeNG table pass-through classes: full width, horizontally scrollable on
   * narrow viewports, rounded bottom and a right-aligned paginator consistent
   * with the other organization tables.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {TablePassThroughOptions}
   */
  protected readonly tablePt: TablePassThroughOptions = {
    root: { class: 'w-full' },
    table: { class: 'w-full text-sm' },
    tableContainer: { class: 'overflow-x-auto' },
    pcPaginator: {
      root: {
        class: 'justify-end rounded-b-xl bg-surface-0 dark:bg-surface-900',
      },
    },
  };

  /**
   * Property rows
   * @readonly
   *
   * @description
   * Default page size for the field work table.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {number}
   */
  protected readonly rows: number = 10;

  /**
   * Property rowsPerPageOptions
   * @readonly
   *
   * @description
   * Page-size choices offered by the paginator, matching the other tables.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {number[]}
   */
  protected readonly rowsPerPageOptions: number[] = [10, 25, 50];

  /**
   * Property globalFilterFields
   * @readonly
   *
   * @description
   * Row fields scanned by the global search box.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {string[]}
   */
  protected readonly globalFilterFields: string[] = [
    'actionLabel',
    'targetLabel',
    'source',
    'status',
  ];

  /**
   * Property searchControl
   * @readonly
   *
   * @description
   * Free-text search control driving the table's global filter.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FormControl<string>}
   */
  protected readonly searchControl: FormControl<string> = new FormControl<string>('', {
    nonNullable: true,
  });

  /**
   * Property rowItems
   * @readonly
   *
   * @description
   * Field work items projected into flat view models with resolved action and
   * target labels and the flags driving the row actions.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<FieldWorkRow[]>}
   */
  protected readonly rowItems: Signal<FieldWorkRow[]> = computed<FieldWorkRow[]>(() =>
    this.workItems().map((workItem: InterventionWorkItemOutput): FieldWorkRow => {
      const status = workItem.status;
      return {
        id: workItem.id,
        workItem,
        actionLabel: resolveInterventionTag('workItemAction', workItem.action).label,
        targetLabel: this.resolveTarget(workItem),
        source: workItem.source,
        status,
        isEquipment: !!workItem.target && EQUIPMENT_TARGET_PATTERN.test(workItem.target),
        canSkip: status !== 'completed' && status !== 'skipped',
      };
    }),
  );

  /**
   * Property table
   * @readonly
   *
   * @description
   * Reference to the PrimeNG table, used to drive its global filter from the
   * search control.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Signal<Table | undefined>}
   */
  private readonly table: Signal<Table | undefined> = viewChild<Table>('dt');
  //#endregion

  //#region Constructor
  /**
   * Constructor
   *
   * @description
   * Wires the search control to the table's global filter.
   */
  public constructor() {
    this.searchControl.valueChanges
      .pipe(debounceTime(200), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((value: string): void => this.table()?.filterGlobal(value.trim(), 'contains'));
  }
  //#endregion

  //#region Methods
  /**
   * Method onAttachPhoto
   * @method onAttachPhoto
   *
   * @description
   * Emits the underlying work item so the parent can capture an evidence photo.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {FieldWorkRow} row - Row whose photo action was triggered.
   *
   * @returns {void}
   */
  protected onAttachPhoto(row: FieldWorkRow): void {
    this.attachPhoto.emit(row.workItem);
  }

  /**
   * Method onSkip
   * @method onSkip
   *
   * @description
   * Emits the underlying work item so the parent can open the skip drawer.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {FieldWorkRow} row - Row whose skip action was triggered.
   *
   * @returns {void}
   */
  protected onSkip(row: FieldWorkRow): void {
    this.skip.emit(row.workItem);
  }

  /**
   * Method resolveTarget
   * @method resolveTarget
   *
   * @description
   * Resolves a human-readable target label: the identity embedded by the API
   * first, then the raw value when it is free text, and null for unresolved
   * resource IRIs (shown as a site-level work item by the template).
   *
   * @access private
   * @since 1.0.0
   *
   * @param {InterventionWorkItemOutput} item - Work item to resolve.
   *
   * @returns {string | null} Display label, or null when nothing useful to show.
   */
  private resolveTarget(item: InterventionWorkItemOutput): string | null {
    if (item.targetSummary) return item.targetSummary.label;

    const target: string | null = item.target;
    if (!target) return null;

    return target.startsWith('/api/') ? null : target;
  }
  //#endregion
}
