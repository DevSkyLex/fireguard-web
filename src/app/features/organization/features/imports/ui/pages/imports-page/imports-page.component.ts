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
import { lucideCircleAlert, lucideUpload } from '@ng-icons/lucide';
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
import { CollectionPagination } from '@shared/collection-pagination';
import { EmptyState } from '@shared/empty-state';
import { ErrorState } from '@shared/error-state';
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
};

/**
 * Component ImportsPage
 * @class ImportsPage
 *
 * @description
 * Route entry page for the organization's bulk CSV import surface: an
 * upload card ({@link ImportUploadForm}), the job list
 * ({@link ImportJobTable}), and a report panel
 * ({@link ImportJobDetailSheet}) opened from a row's "View report" action.
 * Owns the list query (paging), the upload submission and the detail
 * panel's target; `ImportJobsStore.create` starts the live poll itself, so
 * this page only reflects `store.jobs()` — a just-created row updates in
 * place on the same table without the page driving the poll. The upload
 * card renders only the kinds {@link availableKindOptions} the active
 * member holds the matching write permission for, and disappears entirely
 * once neither kind is writable — the route itself needs only one read
 * permission, so a reader may reach the page with no write permission at
 * all.
 *
 * @version 1.0.0
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
    CollectionPagination,
    HlmButton,
    ...HlmCardImports,
  ],
  providers: [provideIcons({ lucideCircleAlert, lucideUpload })],
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
  //#endregion

  //#region Properties
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
   * @description Wires the load effect over the active organization and paging.
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    effect((): void => {
      const organizationId: string = this.organizationId();
      const page: number = this.page();
      const pageSize: number = this.pageSize();

      untracked((): void => {
        this.store.load({ organizationId, options: { page, itemsPerPage: pageSize } });
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
    this.store.load({
      organizationId: this.organizationId(),
      options: { page: this.page(), itemsPerPage: this.pageSize() },
    });
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
