import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  type InputSignal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { provideIcons } from '@ng-icons/core';
import { lucideCircleAlert, lucideListChecks, lucidePlus } from '@ng-icons/lucide';
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
import { CollectionPagination } from '@shared/collection-pagination';
import { CollectionSearchBox, CollectionToolbar } from '@shared/collection-toolbar';
import { EmptyState } from '@shared/empty-state';
import { ErrorState } from '@shared/error-state';
import { HlmButton } from '@shared/ui/button';
import { HlmToggleGroupImports } from '@shared/ui/toggle-group';
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
 * and status `hlm-toggle-group` row above `ChecklistTable`, a "New
 * checklist" header action, and the create/edit/archive dialogs the row menu
 * and header button open. Owns the query the table renders (search, status
 * filter, paging) and every write the table and dialogs only ask for
 * (`ARCHITECTURE.md` §10.3/§10.5) — the table and the three dialogs inject
 * no store and call no service themselves.
 *
 * Search has no debounce yet: every keystroke reissues the list request.
 * Acceptable at the checklist template library's expected scale; a future
 * pass can add the same debounced, URL-synced round-trip `FacilitiesPage`
 * uses if that changes.
 *
 * @version 2.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-checklists-page',
  imports: [
    ChecklistArchiveDialog,
    ChecklistCreateDialog,
    ChecklistEditDialog,
    ChecklistTable,
    CollectionPagination,
    CollectionSearchBox,
    CollectionToolbar,
    EmptyState,
    ErrorState,
    HlmButton,
    ...HlmToggleGroupImports,
  ],
  providers: [ChecklistStore, provideIcons({ lucideCircleAlert, lucideListChecks, lucidePlus })],
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

  /** Whether the create dialog is open. */
  protected readonly createDialogVisible: WritableSignal<boolean> = signal<boolean>(false);

  /** The checklist currently open in the edit dialog, or `null` when it is closed. */
  protected readonly editingChecklist: WritableSignal<ChecklistOutput | null> =
    signal<ChecklistOutput | null>(null);

  /** The checklist currently open in the archive confirmation, or `null` when it is closed. */
  protected readonly archivingChecklist: WritableSignal<ChecklistOutput | null> =
    signal<ChecklistOutput | null>(null);
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Wires the load effect over the active search, status filter and paging,
   * and closes each dialog once its own write settles successfully.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
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
   * @description Narrows the list to one status, from the toggle group. Re-activating the current chip clears the narrowing.
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
