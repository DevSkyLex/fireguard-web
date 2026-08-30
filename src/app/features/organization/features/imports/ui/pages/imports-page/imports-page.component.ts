import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
  type InputSignal,
  type Signal,
  type TemplateRef,
  type WritableSignal,
} from '@angular/core';
import { provideIcons } from '@ng-icons/core';
import {
  lucideCircleAlert,
  lucideLock,
  lucideSearch,
  lucideTag,
  lucideUpload,
} from '@ng-icons/lucide';
import type { BrnOverlayState } from '@spartan-ng/brain/overlay';
import { OrganizationPermissionService } from '@features/organization/access';
import type {
  ImportJobKind,
  ImportJobOutput,
} from '@features/organization/features/imports/models';
import { IMPORT_JOB_KIND_OPTIONS } from '@features/organization/features/imports/options';
import {
  ImportJobsStore,
  type ImportJobsStoreType,
} from '@features/organization/features/imports/state';
import {
  ImportUploadForm,
  type ImportUploadSubmission,
} from '@features/organization/features/imports/ui/forms/import-upload-form';
import { ImportJobDetailSheet } from '@features/organization/features/imports/ui/sheets/import-job-detail-sheet';
import { ImportJobTable } from '@features/organization/features/imports/ui/tables/import-job-table';
import {
  ORGANIZATION_PERMISSION,
  type OrganizationPermissionName,
} from '@features/organization/models';
import {
  REGIONAL_FORMATTING_PORT,
  type RegionalFormattingPort,
} from '@features/organization/ports';
import {
  CollectionFilterBar,
  CollectionFilterSelect,
  CollectionFilterToggle,
  initialCollectionFilterBarVisibility,
  type CollectionFilterField,
} from '@shared/collection-filters';
import { CollectionPagination } from '@shared/collection-pagination';
import { CollectionToolbar } from '@shared/collection-toolbar';
import { EmptyState } from '@shared/empty-state';
import { ErrorState } from '@shared/error-state';
import type { RegionalFormatSettings } from '@shared/regional-format';
import { HlmButton } from '@shared/ui/button';
import { HlmCardImports } from '@shared/ui/card';

/** The page sizes offered under the table — the server default first. */
const PAGE_SIZES: readonly [number, number, number] = [30, 60, 100];

/**
 * Constant IMPORT_KIND_WRITE_PERMISSION
 * @description The permission the backend gates `create` on, per submitted kind.
 */
const IMPORT_KIND_WRITE_PERMISSION: Readonly<Record<ImportJobKind, OrganizationPermissionName>> = {
  equipment: ORGANIZATION_PERMISSION.EQUIPMENT_WRITE,
  facility: ORGANIZATION_PERMISSION.FACILITIES_WRITE,
  member: ORGANIZATION_PERMISSION.MEMBERS_MANAGE,
};

/**
 * Component ImportsPage
 * @class ImportsPage
 *
 * @description
 * Route entry page for the organization's bulk CSV import surface: an
 * upload card ({@link ImportUploadForm}, `max-w-xl` per `DESIGN.md` "Action
 * Surfaces"), a "Kind" filter chip (`app-collection-toolbar` →
 * `app-collection-filter-bar`, `@shared/collection-filters`), the job list
 * ({@link ImportJobTable}), and a report panel
 * ({@link ImportJobDetailSheet}) opened from a row's "View report" action.
 * Owns the list query (paging and the `kind` narrowing), the upload
 * submission and the detail panel's target; `ImportJobsStore.create` starts
 * the live poll itself, so this page only reflects `store.jobs()` — a
 * just-created row updates in place on the same table without the page
 * driving the poll. The upload card renders only the kinds
 * {@link availableKindOptions} the active member holds the matching write
 * permission for, and disappears entirely once no kind is writable —
 * the route itself needs only one read permission, so a reader may reach the
 * page with no write permission at all. The "Kind" filter is unrelated to
 * that gate: it narrows what a reader sees and offers every kind regardless
 * of the active member's write permissions ({@link kindFilterOptions}).
 * There is no search box: `ImportJobCollectionProvider` accepts only
 * `organization` and `kind`, so this page has nothing else to send. The
 * "Kind" chip's value control is `app-collection-filter-select` — its
 * two-option catalog needs no popover search, unlike the richer fields on
 * other collection pages.
 *
 * @version 1.2.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-imports-page',
  imports: [
    EmptyState,
    ErrorState,
    ImportUploadForm,
    ImportJobTable,
    ImportJobDetailSheet,
    CollectionFilterBar,
    CollectionFilterSelect,
    CollectionFilterToggle,
    CollectionPagination,
    CollectionToolbar,
    HlmButton,
    ...HlmCardImports,
  ],
  providers: [
    provideIcons({ lucideCircleAlert, lucideLock, lucideSearch, lucideTag, lucideUpload }),
  ],
  templateUrl: './imports-page.component.html',
  host: { class: 'flex min-h-0 flex-1 flex-col' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImportsPage {
  //#region Inputs
  /**
   * Property organizationId
   * @readonly
   * @description The workspace whose import jobs are listed, bound from the route.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input.required<string>();
  /** Whether the last list read was refused for lack of permission, which a retry cannot fix. */
  protected readonly listForbidden: Signal<boolean> = computed<boolean>(() =>
    this.store.isListForbidden(),
  );

  //#endregion

  //#region Properties
  /** The active organization's regional formatting context port. */
  private readonly regionalFormattingPort: RegionalFormattingPort =
    inject<RegionalFormattingPort>(REGIONAL_FORMATTING_PORT);

  /**
   * Property regionalFormatting
   * @readonly
   * @description The active organization's date pattern and timezone, read by `appOrgDate` bindings and forwarded to date-rendering children.
   * @access protected
   * @since 1.0.0
   * @type {Signal<RegionalFormatSettings>}
   */
  protected readonly regionalFormatting: Signal<RegionalFormatSettings> =
    this.regionalFormattingPort.regionalFormatting;

  /** The job list and upload dataset, provided by this route. */
  protected readonly store: ImportJobsStoreType = inject<ImportJobsStoreType>(ImportJobsStore);

  /** Organization permission checks gating which kinds the upload card offers. */
  private readonly permissions: OrganizationPermissionService = inject(
    OrganizationPermissionService,
  );

  /** The page window, one-based. */
  protected readonly page: WritableSignal<number> = signal<number>(1);

  /** How many rows a page holds. */
  protected readonly pageSize: WritableSignal<number> = signal<number>(PAGE_SIZES[0]);

  /** The job currently opened in the report panel, or `null` when it is closed. */
  protected readonly selectedJob: WritableSignal<ImportJobOutput | null> =
    signal<ImportJobOutput | null>(null);

  /** The active "Kind" narrowing, or `null` when every kind is shown. Not URL-synced — this page persists no other query state either. */
  protected readonly kindFilter: WritableSignal<ImportJobKind | null> =
    signal<ImportJobKind | null>(null);

  /** Every kind the filter offers, unlike {@link availableKindOptions} — narrowing what a reader sees needs no write permission. */
  protected readonly kindFilterOptions: typeof IMPORT_JOB_KIND_OPTIONS = IMPORT_JOB_KIND_OPTIONS;

  /** The filter bar's field catalog — a single "Kind" chip. */
  protected readonly filterFields: readonly CollectionFilterField[] = [
    {
      key: 'kind',
      fieldLabel: $localize`:@@imports.list.filterKind:Kind`,
      icon: 'lucideTag',
      operators: ['equals'],
    },
  ];

  /**
   * Property activeFilterKeys
   * @readonly
   * @description The `kind` field, when {@link kindFilter} is set — the bar's `activeKeys` input.
   * @access protected
   * @since 1.1.0
   * @type {Signal<readonly string[]>}
   */
  protected readonly activeFilterKeys: Signal<readonly string[]> = computed<readonly string[]>(
    () => (this.kindFilter() !== null ? ['kind'] : []),
  );

  /** Which field the filter bar currently renders mid-pick, before a kind is chosen — `null` when none is. */
  protected readonly openFilterKey: WritableSignal<'kind' | null> = signal<'kind' | null>(null);

  /**
   * Property filtersVisible
   * @readonly
   * @description Whether `app-collection-filter-bar` is currently mounted below the toolbar — presentation-only. Seeded by `initialCollectionFilterBarVisibility` (`@shared/collection-filters`), then purely driven by `app-collection-filter-toggle`.
   * @access protected
   * @since 1.1.0
   * @type {WritableSignal<boolean>}
   */
  protected readonly filtersVisible: WritableSignal<boolean> = initialCollectionFilterBarVisibility(
    computed<boolean>(() => this.activeFilterKeys().length > 0),
  );

  /** The "Kind" chip's `app-collection-filter-select`, projected into the filter bar. */
  private readonly kindChipTemplate = viewChild<TemplateRef<unknown>>('kindChip');

  /**
   * Property chipTemplates
   * @readonly
   * @description The `kind` field's value-control `TemplateRef`, for `app-collection-filter-bar`'s `templates` input.
   * @access protected
   * @since 1.1.0
   * @type {Signal<Readonly<Record<string, TemplateRef<unknown> | undefined>>>}
   */
  protected readonly chipTemplates: Signal<
    Readonly<Record<string, TemplateRef<unknown> | undefined>>
  > = computed(() => ({ kind: this.kindChipTemplate() }));

  /** Whether the current view is narrowed by kind — decides the empty state's icon and its "Clear filters" action. */
  protected readonly hasFilters: Signal<boolean> = computed<boolean>(
    () => this.kindFilter() !== null,
  );

  /** The rows the table currently renders. */
  protected readonly items: Signal<readonly ImportJobOutput[]> = computed(() => this.store.jobs());

  /**
   * Property pageCount
   * @readonly
   * @description How many pages the current total spans, at least one.
   * @access protected
   * @since 1.0.0
   * @type {Signal<number>}
   */
  protected readonly pageCount: Signal<number> = computed<number>(() =>
    Math.max(1, Math.ceil(this.store.totalJobs() / this.pageSize())),
  );

  /**
   * Property availableKindOptions
   * @readonly
   *
   * @description
   * The kind choices the upload form offers, narrowed to the kinds the
   * active member holds the matching write permission for — the backend
   * gates `create` per submitted `kind`, so a kind neither permission
   * covers is never offered rather than left to fail with a 403.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<typeof IMPORT_JOB_KIND_OPTIONS>}
   */
  protected readonly availableKindOptions: Signal<typeof IMPORT_JOB_KIND_OPTIONS> = computed(() =>
    IMPORT_JOB_KIND_OPTIONS.filter((option) =>
      this.permissions.hasPermission(IMPORT_KIND_WRITE_PERMISSION[option.value]),
    ),
  );

  /** Whether the active member may upload at least one kind. */
  protected readonly canUpload: Signal<boolean> = computed<boolean>(
    () => this.availableKindOptions().length > 0,
  );

  /** Whether the report panel is open. */
  protected readonly detailVisible: Signal<boolean> = computed<boolean>(
    () => this.selectedJob() !== null,
  );
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   * @description Wires the load effect over the active organization, paging and the `kind` narrowing.
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    effect((): void => {
      const organizationId: string = this.organizationId();
      const page: number = this.page();
      const pageSize: number = this.pageSize();
      const kind: ImportJobKind | null = this.kindFilter();

      untracked((): void => {
        this.store.load({
          organizationId,
          options: { page, itemsPerPage: pageSize },
          query: kind ? { kind } : undefined,
        });
      });
    });

    effect((): void => {
      const job: ImportJobOutput | null = this.selectedJob();
      if (job === null) return;

      const updated: ImportJobOutput | undefined = this.store
        .jobs()
        .find((candidate: ImportJobOutput) => candidate.id === job.id);

      untracked((): void => {
        if (updated && updated !== job) this.selectedJob.set(updated);
      });
    });
  }
  //#endregion

  //#region Methods
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
    const kind: ImportJobKind | null = this.kindFilter();

    this.store.load({
      organizationId: this.organizationId(),
      options: { page: this.page(), itemsPerPage: this.pageSize() },
      query: kind ? { kind } : undefined,
    });
  }

  /**
   * Method applyKindFilter
   * @description Replaces the "Kind" narrowing, which reloads the list from the first page, and closes the field's mid-pick state once a value is chosen.
   * @access protected
   * @since 1.1.0
   * @param {ImportJobKind | null} kind - The kind to narrow to, or `null` to show every kind.
   * @returns {void}
   */
  protected applyKindFilter(kind: ImportJobKind | null): void {
    this.page.set(1);
    this.kindFilter.set(kind);
    if (kind !== null && this.openFilterKey() === 'kind') this.openFilterKey.set(null);
  }

  /**
   * Method onFieldPicked
   * @description Reacts to the filter bar's `fieldPicked` output by opening the "Kind" chip's `app-collection-filter-select`.
   * @access protected
   * @since 1.1.0
   * @param {string} key - The field key the bar's "+ Filter" menu just picked.
   * @returns {void}
   */
  protected onFieldPicked(key: string): void {
    this.openFilterKey.set(key as 'kind');
  }

  /**
   * Method onFieldRemoved
   * @description Reacts to the filter bar's `fieldRemoved` output by dropping the "Kind" narrowing.
   * @access protected
   * @since 1.1.0
   * @returns {void}
   */
  protected onFieldRemoved(): void {
    this.applyKindFilter(null);
  }

  /**
   * Method toggleFiltersVisible
   * @description Reacts to `app-collection-filter-toggle`'s `visibleChange` by setting {@link filtersVisible} to the value it reports.
   * @access protected
   * @since 1.1.0
   * @param {boolean} visible - The toggle button's intended next state.
   * @returns {void}
   */
  protected toggleFiltersVisible(visible: boolean): void {
    this.filtersVisible.set(visible);
  }

  /**
   * Method clearFilters
   * @description Drops the "Kind" narrowing.
   * @access protected
   * @since 1.1.0
   * @returns {void}
   */
  protected clearFilters(): void {
    this.applyKindFilter(null);
  }

  /**
   * Method fieldPopoverState
   * @description Whether the "Kind" chip's `app-collection-filter-select` should currently render open.
   * @access protected
   * @since 1.1.0
   * @returns {BrnOverlayState} `'open'` or `'closed'`.
   */
  protected fieldPopoverState(): BrnOverlayState {
    return this.openFilterKey() === 'kind' ? 'open' : 'closed';
  }

  /**
   * Method onFieldPopoverStateChanged
   * @description Keeps {@link openFilterKey} in sync with the "Kind" chip's own `app-collection-filter-select`.
   * @access protected
   * @since 1.1.0
   * @param {BrnOverlayState} state - Its next state.
   * @returns {void}
   */
  protected onFieldPopoverStateChanged(state: BrnOverlayState): void {
    if (state === 'open') {
      this.openFilterKey.set('kind');
      return;
    }

    if (this.openFilterKey() === 'kind') this.openFilterKey.set(null);
  }

  /**
   * Method upload
   * @description Submits a validated upload from {@link ImportUploadForm}.
   * @access protected
   * @since 1.0.0
   * @param {ImportUploadSubmission} submission - The kind, file and dry-run choice.
   * @returns {void}
   */
  protected upload(submission: ImportUploadSubmission): void {
    this.store.create({ organizationId: this.organizationId(), ...submission });
  }

  /**
   * Method openReport
   * @description Opens the report panel for one row.
   * @access protected
   * @since 1.0.0
   * @param {ImportJobOutput} job - The row activated.
   * @returns {void}
   */
  protected openReport(job: ImportJobOutput): void {
    this.selectedJob.set(job);
  }

  /**
   * Method closeReport
   * @description Closes the report panel.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected closeReport(): void {
    this.selectedJob.set(null);
  }
  //#endregion
}
