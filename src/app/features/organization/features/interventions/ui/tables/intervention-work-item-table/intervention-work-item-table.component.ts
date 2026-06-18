import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
  viewChild,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MenuItem, PrimeIcons } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule, type CardPassThroughOptions } from 'primeng/card';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { Menu, MenuModule } from 'primeng/menu';
import { SelectModule } from 'primeng/select';
import { SplitButtonModule } from 'primeng/splitbutton';
import { Table, TableModule, type TablePassThroughOptions } from 'primeng/table';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import {
  resolveInterventionTag,
  type InterventionWorkItemOutput,
  type InterventionWorkItemStatus,
  type MemberSelectOption,
  type SelectOption,
} from '@features/organization/features/interventions/models';
import { EmptyState, Tag } from '@shared/components';
import { InterventionMemberOption } from '../../components/intervention-member-option/intervention-member-option.component';
import { InterventionTag } from '../../components/intervention-tag';
import type { WorkItemRow, WorkItemStatusOption } from './models';
import { WORK_ITEM_STATUS_OPTIONS } from './options';

/**
 * Component InterventionWorkItemTable
 * @class InterventionWorkItemTable
 *
 * @description
 * Presentational table rendering the prepared work items of an intervention,
 * aligned with the other organization tables: a carded surface with a header
 * toolbar (count chip, search box, status filter and split-button add), sortable
 * columns, client-side pagination, a checkbox selection column for bulk
 * deletion, an ellipsis row-action menu and a shared empty state. Each row's
 * target and assignee are resolved from the identities embedded on the work item
 * (falling back to the provided option lists for optimistic items). The table
 * owns no persistence: every mutation is emitted to the parent through outputs.
 *
 * @version 2.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-work-item-table',
  imports: [
    ButtonModule,
    CardModule,
    EmptyState,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    InterventionMemberOption,
    InterventionTag,
    MenuModule,
    ReactiveFormsModule,
    SelectModule,
    SplitButtonModule,
    Tag,
    TableModule,
  ],
  templateUrl: './intervention-work-item-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionWorkItemTable {
  //#region Inputs
  /**
   * Input workItems
   * @readonly
   *
   * @description
   * Work item rows displayed by the table.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly InterventionWorkItemOutput[]>}
   */
  public readonly workItems: InputSignal<readonly InterventionWorkItemOutput[]> =
    input.required<readonly InterventionWorkItemOutput[]>();

  /**
   * Input memberOptions
   * @readonly
   *
   * @description
   * Organization member options used to resolve an assignee that is not yet
   * embedded on the work item (optimistic items created offline).
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly MemberSelectOption[]>}
   */
  public readonly memberOptions: InputSignal<readonly MemberSelectOption[]> = input<
    readonly MemberSelectOption[]
  >([]);

  /**
   * Input targetOptions
   * @readonly
   *
   * @description
   * Target options (facilities and equipment) used to resolve a target label
   * that is not yet embedded on the work item.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly SelectOption[]>}
   */
  public readonly targetOptions: InputSignal<readonly SelectOption[]> = input<
    readonly SelectOption[]
  >([]);

  /**
   * Input canManage
   * @readonly
   *
   * @description
   * Whether the add affordance (header split button + empty-state action) is
   * shown. Mirrors the parent's "can plan & still draft" rule.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly canManage: InputSignal<boolean> = input<boolean>(false);

  /**
   * Input canDelete
   * @readonly
   *
   * @description
   * Whether the destructive affordances (selection column, bulk-delete button,
   * row delete action) are shown. Deletion is a connected planning action, so
   * the parent gates this on connectivity in addition to the manage rule.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly canDelete: InputSignal<boolean> = input<boolean>(false);

  /**
   * Input saving
   * @readonly
   *
   * @description
   * Whether a work-item mutation is in flight; disables the toolbar actions.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly saving: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /**
   * Output add
   * @readonly
   *
   * @description
   * Requests the parent to open the add-work-item drawer.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly add: OutputEmitterRef<void> = output<void>();

  /**
   * Output deleteWorkItems
   * @readonly
   *
   * @description
   * Requests deletion of the emitted work items (a single row from the action
   * menu, or the current selection from the bulk action). The parent confirms
   * and performs the actual removal.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {OutputEmitterRef<readonly InterventionWorkItemOutput[]>}
   */
  public readonly deleteWorkItems: OutputEmitterRef<readonly InterventionWorkItemOutput[]> =
    output<readonly InterventionWorkItemOutput[]>();
  //#endregion

  //#region Properties
  /**
   * Property cardPt
   * @readonly
   *
   * @description
   * PrimeNG card pass-through classes matching the organization tables: a
   * bordered, shadowless surface whose body lets the table fill the height.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {CardPassThroughOptions}
   */
  protected readonly cardPt: CardPassThroughOptions = {
    root: {
      class:
        'h-full flex flex-col border border-surface-200 dark:border-surface-800 bg-surface-0 dark:bg-surface-900 shadow-none',
    },
    body: { class: 'p-0 flex flex-col flex-1 min-h-0' },
  };

  /**
   * Property tablePt
   * @readonly
   *
   * @description
   * PrimeNG table pass-through classes: full width, rounded bottom and a
   * right-aligned paginator consistent with the other organization tables.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {TablePassThroughOptions}
   */
  protected readonly tablePt: TablePassThroughOptions = {
    root: { class: 'flex min-h-0 w-full flex-1 flex-col' },
    table: { class: 'w-full text-sm' },
    tableContainer: { class: 'min-h-0 flex-1 overflow-auto' },
    pcPaginator: {
      root: {
        class: 'mt-auto justify-end rounded-b-xl bg-surface-0 dark:bg-surface-900',
      },
    },
  };

  /**
   * Property rows
   * @readonly
   *
   * @description
   * Default page size for the work item table.
   *
   * @access protected
   * @since 1.1.0
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
   * @since 2.0.0
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
   * @since 2.0.0
   *
   * @type {string[]}
   */
  protected readonly globalFilterFields: string[] = [
    'actionLabel',
    'targetLabel',
    'assigneeName',
    'status',
  ];

  /**
   * Property statusOptions
   * @readonly
   *
   * @description
   * Work item status filter options, resolved once from the intervention tag
   * registry so labels, severities and icons stay the single source of truth.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {WorkItemStatusOption[]}
   */
  protected readonly statusOptions: WorkItemStatusOption[] = WORK_ITEM_STATUS_OPTIONS;

  /**
   * Property searchControl
   * @readonly
   *
   * @description
   * Free-text search control driving the table's global filter.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {FormControl<string>}
   */
  protected readonly searchControl: FormControl<string> = new FormControl<string>('', {
    nonNullable: true,
  });

  /**
   * Property statusControl
   * @readonly
   *
   * @description
   * Work item status filter control driving the table's `status` filter.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {FormControl<InterventionWorkItemStatus | null>}
   */
  protected readonly statusControl: FormControl<InterventionWorkItemStatus | null> =
    new FormControl<InterventionWorkItemStatus | null>(null);

  /**
   * Property rowItems
   * @readonly
   *
   * @description
   * Work item rows projected into flat view models with resolved action, target
   * and assignee fields for rendering, sorting and filtering.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<WorkItemRow[]>}
   */
  protected readonly rowItems: Signal<WorkItemRow[]> = computed<WorkItemRow[]>(() =>
    this.workItems().map((workItem: InterventionWorkItemOutput): WorkItemRow => {
      const assignee: MemberSelectOption | null = this.resolveAssignee(workItem);
      return {
        id: workItem.id,
        workItem,
        actionLabel: resolveInterventionTag('workItemAction', workItem.action).label,
        targetLabel: this.resolveTarget(workItem),
        assignee,
        assigneeName: assignee?.displayName ?? '',
        status: workItem.status,
      };
    }),
  );

  /**
   * Property selectedRows
   * @readonly
   *
   * @description
   * Rows currently checked through the selection column, backing the header
   * bulk-delete action.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {WritableSignal<WorkItemRow[]>}
   */
  protected readonly selectedRows: WritableSignal<WorkItemRow[]> = signal<WorkItemRow[]>([]);

  /**
   * Property columnCount
   * @readonly
   *
   * @description
   * Number of rendered columns, used to span the empty-state row. Grows by one
   * for the selection column and one for the action column when deletable.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<number>}
   */
  protected readonly columnCount: Signal<number> = computed<number>(
    () => 4 + (this.canDelete() ? 2 : 0),
  );

  /**
   * Property toolbarActions
   * @readonly
   *
   * @description
   * Split-button menu actions surfaced next to the add action: a bulk delete of
   * the current selection and a selection reset. Both are disabled until at
   * least one row is selected so the dropdown always stays populated.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<MenuItem[]>}
   */
  protected readonly toolbarActions: Signal<MenuItem[]> = computed((): MenuItem[] => {
    const count: number = this.selectedRows().length;

    return [
      {
        label: count > 0 ? `Delete selected (${count})` : 'Delete selected',
        icon: PrimeIcons.TRASH,
        disabled: count === 0,
        command: (): void => this.onDeleteSelected(),
      },
      {
        label: 'Clear selection',
        icon: PrimeIcons.TIMES,
        disabled: count === 0,
        command: (): void => this.onClearSelection(),
      },
    ];
  });

  /**
   * Property table
   * @readonly
   *
   * @description
   * Reference to the PrimeNG table, used to drive its global and status filters
   * from the toolbar controls.
   *
   * @access private
   * @since 2.0.0
   *
   * @type {Signal<Table | undefined>}
   */
  private readonly table: Signal<Table | undefined> = viewChild<Table>('dt');

  /**
   * Property actionMenu
   * @readonly
   *
   * @description
   * Shared popup menu used by work item rows for contextual actions.
   *
   * @access private
   * @since 2.0.0
   *
   * @type {Signal<Menu>}
   */
  private readonly actionMenu: Signal<Menu> = viewChild.required<Menu>('actionMenu');

  /**
   * Property activeWorkItem
   * @readonly
   *
   * @description
   * Work item row currently targeted by the shared action menu.
   *
   * @access private
   * @since 2.0.0
   *
   * @type {WritableSignal<InterventionWorkItemOutput | null>}
   */
  private readonly activeWorkItem: WritableSignal<InterventionWorkItemOutput | null> =
    signal<InterventionWorkItemOutput | null>(null);

  /**
   * Property actionMenuItems
   * @readonly
   *
   * @description
   * Menu items shown for the row currently targeted by the ellipsis menu.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<MenuItem[]>}
   */
  protected readonly actionMenuItems: Signal<MenuItem[]> = computed((): MenuItem[] => {
    const workItem: InterventionWorkItemOutput | null = this.activeWorkItem();
    if (!workItem) return [];

    return [
      {
        label: 'Delete',
        icon: PrimeIcons.TRASH,
        command: (): void => this.deleteWorkItems.emit([workItem]),
      },
    ];
  });
  //#endregion

  //#region Constructor
  /**
   * Constructor
   *
   * @description
   * Wires the search and status controls to the table filters and prunes the
   * selection to the rows that still exist after the parent removes items.
   */
  public constructor() {
    this.searchControl.valueChanges
      .pipe(debounceTime(200), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((value: string): void => this.table()?.filterGlobal(value.trim(), 'contains'));

    this.statusControl.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((value: InterventionWorkItemStatus | null): void =>
        this.table()?.filter(value, 'status', 'equals'),
      );

    effect((): void => {
      const ids: Set<string> = new Set(this.rowItems().map((row: WorkItemRow): string => row.id));
      const pruned: WorkItemRow[] = this.selectedRows().filter((row: WorkItemRow): boolean =>
        ids.has(row.id),
      );
      if (pruned.length !== this.selectedRows().length) {
        this.selectedRows.set(pruned);
      }
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method onActionMenuToggle
   * @method onActionMenuToggle
   *
   * @description
   * Stores the targeted work item row and toggles the shared action menu.
   *
   * @access protected
   * @since 2.0.0
   *
   * @param {MouseEvent} event - Click event from the row action button.
   * @param {WorkItemRow} row - Row targeted by the menu.
   *
   * @returns {void}
   */
  protected onActionMenuToggle(event: MouseEvent, row: WorkItemRow): void {
    this.activeWorkItem.set(row.workItem);
    this.actionMenu().toggle(event);
  }

  /**
   * Method onDeleteSelected
   * @method onDeleteSelected
   *
   * @description
   * Emits the work items behind the current selection for deletion.
   *
   * @access protected
   * @since 2.0.0
   *
   * @returns {void}
   */
  protected onDeleteSelected(): void {
    const selected: readonly WorkItemRow[] = this.selectedRows();
    if (selected.length === 0) return;
    this.deleteWorkItems.emit(
      selected.map((row: WorkItemRow): InterventionWorkItemOutput => row.workItem),
    );
  }

  /**
   * Method onClearSelection
   * @method onClearSelection
   *
   * @description
   * Clears the current checkbox selection.
   *
   * @access protected
   * @since 2.0.0
   *
   * @returns {void}
   */
  protected onClearSelection(): void {
    this.selectedRows.set([]);
  }

  /**
   * Method resolveTarget
   * @method resolveTarget
   *
   * @description
   * Resolves a human-readable target label: the identity embedded by the API
   * first, then the matching target option, the raw value when it is free text,
   * and null for unresolved resource IRIs (not useful to the user).
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

    const option: SelectOption | undefined = this.targetOptions().find(
      (candidate: SelectOption): boolean => candidate.value === target,
    );
    if (option) return option.label;

    return target.startsWith('/api/') ? null : target;
  }

  /**
   * Method resolveAssignee
   * @method resolveAssignee
   *
   * @description
   * Resolves the member option assigned to a work item, preferring the identity
   * embedded by the API and falling back to the member options for optimistic
   * items, or null when the item is unassigned.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {InterventionWorkItemOutput} item - Work item to resolve.
   *
   * @returns {MemberSelectOption | null} Assigned member option, if any.
   */
  private resolveAssignee(item: InterventionWorkItemOutput): MemberSelectOption | null {
    const profile = item.assigneeProfile;
    if (profile) {
      return {
        label: profile.displayName,
        value: profile.member,
        displayName: profile.displayName,
        roleLabel: '',
        avatarUrl: profile.avatarUrl,
        initials: this.deriveInitials(profile.displayName),
      };
    }

    if (!item.assignee) return null;

    return (
      this.memberOptions().find(
        (option: MemberSelectOption): boolean => option.value === item.assignee,
      ) ?? null
    );
  }

  /**
   * Method deriveInitials
   * @method deriveInitials
   *
   * @description
   * Derives up to two uppercase initials from a display name for the avatar
   * fallback shown when the assignee has no avatar image.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {string} displayName - Assignee display name.
   *
   * @returns {string} Up to two uppercase initials, or '?' when none.
   */
  private deriveInitials(displayName: string): string {
    return (
      displayName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part: string): string => part.charAt(0))
        .join('')
        .toUpperCase() || '?'
    );
  }
  //#endregion
}
