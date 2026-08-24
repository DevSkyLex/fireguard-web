import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
  type ElementRef,
  type InputSignal,
  type Signal,
  type TemplateRef,
  type WritableSignal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircleAlert, lucideCircleDot, lucideListChecks, lucidePlus } from '@ng-icons/lucide';
import { PageActionsService, registerPageActions } from '@core/page-actions';
import type { CallState } from '@core/request-state';
import { OrganizationPermissionService } from '@features/organization/access';
import type {
  ChecklistOutput,
  ChecklistStatus,
  CreateChecklistInput,
  UpdateChecklistInput,
} from '@features/organization/features/checklists/models';
import {
  ChecklistStore,
  type ChecklistStoreType,
} from '@features/organization/features/checklists/state';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import {
  CollectionFilterBar,
  CollectionFilterToggle,
  initialCollectionFilterBarVisibility,
  type CollectionFilterField,
} from '@shared/collection-filters';
import { CollectionPagination } from '@shared/collection-pagination';
import { CollectionSearchBox, CollectionToolbar } from '@shared/collection-toolbar';
import { EmptyState } from '@shared/empty-state';
import { ErrorState } from '@shared/error-state';
import { HlmButton } from '@shared/ui/button';
import { HlmToggleGroupImports } from '@shared/ui/toggle-group';
import { ChecklistStatusTag } from '../../components/checklist-status-tag';
import { ChecklistArchiveDialog } from '../../dialogs/checklist-archive-dialog';
import { ChecklistCreateDialog } from '../../dialogs/checklist-create-dialog';
import { ChecklistEditDialog } from '../../dialogs/checklist-edit-dialog';
import { ChecklistTable } from '../../tables/checklist-table';

/** The page sizes offered under the table — the server default first. */
const PAGE_SIZES: readonly [number, number, number] = [30, 60, 100];

/** Every status chip offered in the filter row. */
const STATUS_VALUES: readonly ChecklistStatus[] = ['active', 'archived'];

/**
 * Component ChecklistsPage
 * @class ChecklistsPage
 *
 * @description
 * Route entry page for the organization's checklist templates: a search box
 * and an editable "Status" filter chip (`app-collection-filter-bar`,
 * `@shared/collection-filters`) above `ChecklistTable`, a "New checklist"
 * header action, and the create/edit/archive dialogs the row menu and
 * header button open. Owns the query the table renders (search, status
 * filter, paging) and every write the table and dialogs only ask for
 * (`ARCHITECTURE.md` §10.3/§10.5) — the table and the three dialogs inject
 * no store and call no service themselves.
 *
 * The status chip renders `app-checklist-status-tag` in place of the raw
 * enum value — the same registry `ChecklistTable`'s Status column already
 * resolves through (`ARCHITECTURE.md` §10.10), so the same status never
 * reads two ways on one screen. "New checklist" registers on the shell
 * header through `PageActionsService`, the idiom `FacilitiesPage` and
 * `EquipmentsPage` use, rather than sitting inside the toolbar.
 *
 * Search has no debounce yet: every keystroke reissues the list request.
 * Acceptable at the checklist template library's expected scale; a future
 * pass can add the same debounced, URL-synced round-trip `FacilitiesPage`
 * uses if that changes.
 *
 * Picking "Status" from the "+ Filter" menu moves real focus onto its first
 * toggle button once rendered ({@link focusStatusToggle}) — the fixed-choice
 * chip's equivalent of the `state`/`stateChanged` open-on-pick contract the
 * bar's other, popover-backed value controls use.
 *
 * @version 2.2.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-checklists-page',
  imports: [
    NgIcon,
    ChecklistArchiveDialog,
    ChecklistCreateDialog,
    ChecklistEditDialog,
    ChecklistStatusTag,
    ChecklistTable,
    CollectionFilterBar,
    CollectionFilterToggle,
    CollectionPagination,
    CollectionSearchBox,
    CollectionToolbar,
    EmptyState,
    ErrorState,
    HlmButton,
    ...HlmToggleGroupImports,
  ],
  providers: [
    ChecklistStore,
    provideIcons({ lucideCircleAlert, lucideCircleDot, lucideListChecks, lucidePlus }),
  ],
  templateUrl: './checklists-page.component.html',
  host: { class: 'flex min-h-0 flex-1 flex-col' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChecklistsPage {
  //#region Inputs
  /**
   * Property organizationId
   * @readonly
   * @description The workspace whose checklists are listed, bound from the route.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input.required<string>();
  //#endregion

  //#region Properties
  /** The list dataset, provided by this route. */
  protected readonly store: ChecklistStoreType = inject<ChecklistStoreType>(ChecklistStore);

  /** Organization permission checks gating the write actions. */
  private readonly permissions: OrganizationPermissionService = inject(
    OrganizationPermissionService,
  );

  /** Every status chip offered. */
  protected readonly statusValues: readonly ChecklistStatus[] = STATUS_VALUES;

  /** The active status narrowing, or `null` for every status. */
  protected readonly status: WritableSignal<ChecklistStatus | null> =
    signal<ChecklistStatus | null>(null);

  /** The draft search term. */
  protected readonly searchTerm: WritableSignal<string> = signal<string>('');

  /** The page window, one-based. */
  protected readonly page: WritableSignal<number> = signal<number>(1);

  /** How many rows a page holds. */
  protected readonly pageSize: WritableSignal<number> = signal<number>(PAGE_SIZES[0]);

  /** The rows the current page renders. */
  protected readonly items: Signal<readonly ChecklistOutput[]> = computed(() =>
    this.store.checklists(),
  );

  /**
   * Property pageCount
   * @readonly
   * @description How many pages the current total spans, at least one.
   * @access protected
   * @since 1.0.0
   * @type {Signal<number>}
   */
  protected readonly pageCount: Signal<number> = computed<number>(() =>
    Math.max(1, Math.ceil(this.store.totalChecklists() / this.pageSize())),
  );

  /** Whether the active member may create, edit and archive checklists. */
  protected readonly canWrite: Signal<boolean> = computed<boolean>(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.INSPECTION_WRITE),
  );

  /** The filter bar's field catalog — a single "Status" chip. */
  protected readonly filterFields: readonly CollectionFilterField[] = [
    {
      key: 'status',
      fieldLabel: $localize`:@@checklists.list.filterStatus:Status`,
      icon: 'lucideCircleDot',
      operators: ['equals'],
    },
  ];

  /**
   * Property activeFilterKeys
   * @readonly
   * @description The `status` field, when {@link status} is set — the bar's `activeKeys` input.
   * @access protected
   * @since 2.1.0
   * @type {Signal<readonly string[]>}
   */
  protected readonly activeFilterKeys: Signal<readonly string[]> = computed<readonly string[]>(
    () => (this.status() !== null ? ['status'] : []),
  );

  /** Which field the filter bar currently renders mid-pick, before a status is chosen — `null` when none is. */
  protected readonly openFilterKey: WritableSignal<'status' | null> = signal<'status' | null>(null);

  /**
   * Property filtersVisible
   * @readonly
   * @description Whether `app-collection-filter-bar` is currently mounted below the toolbar — presentation-only. Seeded by `initialCollectionFilterBarVisibility` (`@shared/collection-filters`), then purely driven by `app-collection-filter-toggle`.
   * @access protected
   * @since 2.1.0
   * @type {WritableSignal<boolean>}
   */
  protected readonly filtersVisible: WritableSignal<boolean> = initialCollectionFilterBarVisibility(
    computed<boolean>(() => this.activeFilterKeys().length > 0),
  );

  /** The "Status" chip's toggle group, projected into the filter bar. */
  private readonly statusChipTemplate = viewChild<TemplateRef<unknown>>('statusChip');

  /**
   * Property statusToggleItem
   * @readonly
   * @description The "Status" chip's first toggle button, so {@link focusStatusToggle} can move real focus to it once the chip mounts. `undefined` until then.
   * @access private
   * @since 2.2.0
   * @type {Signal<ElementRef<HTMLButtonElement> | undefined>}
   */
  private readonly statusToggleItem: Signal<ElementRef<HTMLButtonElement> | undefined> =
    viewChild<ElementRef<HTMLButtonElement>>('statusToggleItem');

  /**
   * Property injector
   * @readonly
   * @description This page's own injector, passed to the `afterNextRender` call in {@link focusStatusToggle} — required since that call happens from an event handler, outside a reactive/DI context.
   * @access private
   * @since 2.2.0
   * @type {Injector}
   */
  private readonly injector: Injector = inject(Injector);

  /**
   * Property chipTemplates
   * @readonly
   * @description The `status` field's value-control `TemplateRef`, for `app-collection-filter-bar`'s `templates` input.
   * @access protected
   * @since 2.1.0
   * @type {Signal<Readonly<Record<string, TemplateRef<unknown> | undefined>>>}
   */
  protected readonly chipTemplates: Signal<
    Readonly<Record<string, TemplateRef<unknown> | undefined>>
  > = computed(() => ({ status: this.statusChipTemplate() }));

  /** Whether the create dialog is open. */
  protected readonly createDialogVisible: WritableSignal<boolean> = signal<boolean>(false);

  /** The checklist currently open in the edit dialog, or `null` when it is closed. */
  protected readonly editingChecklist: WritableSignal<ChecklistOutput | null> =
    signal<ChecklistOutput | null>(null);

  /** The checklist currently open in the archive confirmation, or `null` when it is closed. */
  protected readonly archivingChecklist: WritableSignal<ChecklistOutput | null> =
    signal<ChecklistOutput | null>(null);

  /** Registers {@link pageActions} on the shell header. */
  private readonly pageActionsService: PageActionsService = inject(PageActionsService);

  /** The "New checklist" button, registered on the shell header instead of the toolbar. */
  private readonly pageActions: Signal<TemplateRef<unknown> | undefined> =
    viewChild<TemplateRef<unknown>>('pageActions');
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Wires the load effect over the active search, status filter and paging,
   * closes each dialog once its own write settles successfully, and
   * registers {@link pageActions}.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    registerPageActions(this.pageActions, this.pageActionsService, inject(DestroyRef));

    effect((): void => {
      const organizationId: string = this.organizationId();
      const status: ChecklistStatus | null = this.status();
      const search: string = this.searchTerm();
      const page: number = this.page();
      const pageSize: number = this.pageSize();

      untracked((): void => {
        this.store.load({
          organizationId,
          options: {
            status: status ?? undefined,
            search: search.trim() === '' ? undefined : search.trim(),
            page,
            itemsPerPage: pageSize,
          },
        });
      });
    });

    effect((): void => {
      const callState: CallState<ChecklistOutput | null> = this.store.createCallState();

      untracked((): void => {
        if (callState.status !== 'success') return;

        this.createDialogVisible.set(false);
        this.store.resetCreateOperation();
      });
    });

    effect((): void => {
      const callState: CallState<ChecklistOutput | null> = this.store.updateCallState();

      untracked((): void => {
        if (callState.status !== 'success') return;

        this.editingChecklist.set(null);
        this.store.resetUpdateOperation();
      });
    });

    effect((): void => {
      const callState: CallState<ChecklistOutput | null> = this.store.archiveCallState();

      untracked((): void => {
        if (callState.status !== 'success') return;

        this.archivingChecklist.set(null);
        this.store.resetArchiveOperation();
      });
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method applyStatus
   * @description Narrows the list to one status, from the chip's toggle group. Re-activating the current chip clears the narrowing, and picking a status closes the field's pending-pick state.
   * @access protected
   * @since 1.0.0
   * @param {string | readonly string[] | null | undefined} value - The toggle group's emitted value.
   * @returns {void}
   */
  protected applyStatus(value: string | readonly string[] | null | undefined): void {
    const status: ChecklistStatus | null =
      value === 'active' || value === 'archived' ? value : null;

    this.page.set(1);
    this.status.set(status);
    if (status !== null && this.openFilterKey() === 'status') this.openFilterKey.set(null);
  }

  /**
   * Method applySearch
   * @description Updates the draft search term and returns to the first page.
   * @access protected
   * @since 2.0.0
   * @param {string} term - The search box's current value.
   * @returns {void}
   */
  protected applySearch(term: string): void {
    this.page.set(1);
    this.searchTerm.set(term);
  }

  /**
   * Method setPageSize
   * @description Changes the page size and returns to the first page.
   * @access protected
   * @since 1.0.0
   * @param {number} size - The chosen page size.
   * @returns {void}
   */
  protected setPageSize(size: number): void {
    this.page.set(1);
    this.pageSize.set(size);
  }

  /**
   * Method goToPage
   * @description Moves to a page within bounds.
   * @access protected
   * @since 1.0.0
   * @param {number} target - The requested page.
   * @returns {void}
   */
  protected goToPage(target: number): void {
    this.page.set(Math.min(Math.max(1, target), this.pageCount()));
  }

  /**
   * Method reload
   * @description Re-runs the current query, for the error state's retry.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected reload(): void {
    this.store.load({
      organizationId: this.organizationId(),
      options: {
        status: this.status() ?? undefined,
        search: this.searchTerm().trim() === '' ? undefined : this.searchTerm().trim(),
        page: this.page(),
        itemsPerPage: this.pageSize(),
      },
    });
  }

  /**
   * Method onFieldPicked
   * @description Reacts to the filter bar's `fieldPicked` output by rendering the "Status" chip before a status is chosen, then moving focus onto its first toggle button — see {@link focusStatusToggle}.
   * @access protected
   * @since 2.2.0
   * @param {string} key - The field key the bar's "+ Filter" menu just picked.
   * @returns {void}
   */
  protected onFieldPicked(key: string): void {
    this.openFilterKey.set(key as 'status');
    this.focusStatusToggle();
  }

  /**
   * Method focusStatusToggle
   *
   * @description
   * Moves real DOM focus to the "Status" chip's first toggle button once the
   * "+ Filter" pick has actually rendered it. A fixed-choice toggle group
   * opens no popover to receive focus the way the bar's other value
   * controls do (`organization/FEATURE.md` — "opening a selector" has no
   * meaning for a boolean, and the same holds for a toggle group), so
   * without this the chip appears with focus left behind in the menu that
   * just closed. Deferred through `afterNextRender` rather than a
   * `setTimeout`, since the app is zoneless — the same idiom
   * `CollectionFilterBar.focusAfterRemoval` (`@shared/collection-filters`)
   * uses for its own post-render focus move.
   *
   * @access private
   * @since 2.2.0
   *
   * @returns {void}
   */
  private focusStatusToggle(): void {
    afterNextRender(
      {
        write: (): void => {
          this.statusToggleItem()?.nativeElement.focus();
        },
      },
      { injector: this.injector },
    );
  }

  /**
   * Method onFieldRemoved
   * @description Reacts to the filter bar's `fieldRemoved` output by clearing the status narrowing.
   * @access protected
   * @since 2.1.0
   * @returns {void}
   */
  protected onFieldRemoved(): void {
    this.applyStatus(null);
  }

  /**
   * Method toggleFiltersVisible
   * @description Reacts to `app-collection-filter-toggle`'s `visibleChange` by setting {@link filtersVisible} to the value it reports.
   * @access protected
   * @since 2.1.0
   * @param {boolean} visible - The toggle button's intended next state.
   * @returns {void}
   */
  protected toggleFiltersVisible(visible: boolean): void {
    this.filtersVisible.set(visible);
  }

  /**
   * Method clearFilters
   * @description Drops every narrowing at once, including the search term.
   * @access protected
   * @since 2.1.0
   * @returns {void}
   */
  protected clearFilters(): void {
    this.page.set(1);
    this.status.set(null);
    this.searchTerm.set('');
  }

  /**
   * Method openCreateDialog
   * @description Opens the "New checklist" dialog.
   * @access protected
   * @since 2.0.0
   * @returns {void}
   */
  protected openCreateDialog(): void {
    this.createDialogVisible.set(true);
  }

  /**
   * Method createChecklist
   * @description Sends the create write. The dialog closes once the store settles, via the constructor effect.
   * @access protected
   * @since 2.0.0
   * @param {CreateChecklistInput} payload - The validated creation payload.
   * @returns {void}
   */
  protected createChecklist(payload: CreateChecklistInput): void {
    this.store.create({ organizationId: this.organizationId(), input: payload });
  }

  /**
   * Method requestEdit
   * @description Opens the edit dialog for a row.
   * @access protected
   * @since 2.0.0
   * @param {ChecklistOutput} checklist - The row to edit.
   * @returns {void}
   */
  protected requestEdit(checklist: ChecklistOutput): void {
    this.editingChecklist.set(checklist);
  }

  /**
   * Method submitEdit
   * @description Sends the update write for the checklist currently open in the edit dialog. The dialog closes once the store settles, via the constructor effect.
   * @access protected
   * @since 2.0.0
   * @param {UpdateChecklistInput} payload - The validated update payload.
   * @returns {void}
   */
  protected submitEdit(payload: UpdateChecklistInput): void {
    const checklist: ChecklistOutput | null = this.editingChecklist();
    if (checklist === null) return;

    this.store.update({
      organizationId: this.organizationId(),
      checklistId: checklist.id,
      input: payload,
    });
  }

  /**
   * Method requestArchive
   * @description Opens the Archive confirmation for a row.
   * @access protected
   * @since 2.0.0
   * @param {ChecklistOutput} checklist - The row to archive.
   * @returns {void}
   */
  protected requestArchive(checklist: ChecklistOutput): void {
    this.archivingChecklist.set(checklist);
  }

  /**
   * Method onEditDialogVisibleChanged
   * @description Clears the editing target on any dismissal — Cancel, the backdrop or Escape.
   * @access protected
   * @since 2.0.0
   * @param {boolean} visible - The dialog's new visibility.
   * @returns {void}
   */
  protected onEditDialogVisibleChanged(visible: boolean): void {
    if (visible) return;

    this.editingChecklist.set(null);
  }

  /**
   * Method onArchiveDialogVisibleChanged
   * @description Clears the archiving target on any dismissal — Cancel, the backdrop or Escape.
   * @access protected
   * @since 2.0.0
   * @param {boolean} visible - The dialog's new visibility.
   * @returns {void}
   */
  protected onArchiveDialogVisibleChanged(visible: boolean): void {
    if (visible) return;

    this.archivingChecklist.set(null);
  }

  /**
   * Method confirmArchive
   * @description Sends the archive write for the checklist currently open in the confirmation. The dialog closes once the store settles, via the constructor effect.
   * @access protected
   * @since 2.0.0
   * @returns {void}
   */
  protected confirmArchive(): void {
    const checklist: ChecklistOutput | null = this.archivingChecklist();
    if (checklist === null) return;

    this.store.archive({ organizationId: this.organizationId(), checklistId: checklist.id });
  }
  //#endregion
}
