import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  PLATFORM_ID,
  signal,
  untracked,
  type InputSignal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Events } from '@ngrx/signals/events';
import { ConnectivityService } from '@core/connectivity';
import type { StoreError } from '@core/request-state';
import { AUTH_SESSION_PORT, type AuthSessionPort } from '@features/auth/ports';
import { OrganizationPermissionService } from '@features/organization/access';
import type {
  CreateMaintenanceExportInput,
  MaintenanceExportOutput,
  MaintenanceExportResourceType,
} from '@features/organization/features/maintenance-exports/models';
import {
  MaintenanceExportStore,
  maintenanceExportStoreEvents,
  type MaintenanceExportStoreType,
} from '@features/organization/features/maintenance-exports/state';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { REGIONAL_FORMATTING_PORT } from '@features/organization/ports';
import { BrowserDownloadService } from '@features/organization/services/browser-download';
import { OrgDatePipe, type RegionalFormatSettings } from '@shared/regional-format';
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmCardImports } from '@shared/ui/card';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmSheetImports } from '@shared/ui/sheet';
import { HlmSkeleton } from '@shared/ui/skeleton';
import { HlmTableImports } from '@shared/ui/table';
import { HlmLarge } from '@shared/ui/typography';
import { MaintenanceExportActionForm } from '../../forms/maintenance-export-action-form';
import { MaintenanceExportCreateForm } from '../../forms/maintenance-export-create-form';
import { MaintenanceExportReferenceForm } from '../../forms/maintenance-export-reference-form';

/**
 * Class MaintenanceExportsPage
 * @class MaintenanceExportsPage
 *
 * @description
 * Orchestrates browser-private archives, native command sheets and explicit external import
 * acknowledgement.
 */
@Component({
  selector: 'app-maintenance-exports-page',
  templateUrl: './maintenance-exports-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MaintenanceExportStore],
  imports: [
    RouterLink,
    OrgDatePipe,
    HlmButton,
    HlmBadge,
    HlmLarge,
    HlmSkeleton,
    MaintenanceExportCreateForm,
    MaintenanceExportActionForm,
    MaintenanceExportReferenceForm,
    ...HlmAlertImports,
    ...HlmCardImports,
    ...HlmEmptyImports,
    ...HlmSheetImports,
    ...HlmTableImports,
  ],
})
export class MaintenanceExportsPage {
  //#region Properties
  /**
   * Property router
   * @readonly
   *
   * @description
   * Application router that keeps acknowledged archive identity in the URL.
   *
   * @access private
   * @since unreleased
   *
   * @type {Router}
   */
  private readonly router: Router = inject(Router);
  /**
   * Property route
   * @readonly
   *
   * @description
   * Current organization route used for archive query navigation.
   *
   * @access private
   * @since unreleased
   *
   * @type {ActivatedRoute}
   */
  private readonly route: ActivatedRoute = inject(ActivatedRoute);
  /**
   * Property deactivationResolver
   *
   * @description
   * Pending guarded navigation decision, resolved exactly once.
   *
   * @access private
   * @since unreleased
   *
   * @type {((allowed: boolean) => void) | null}
   */
  private deactivationResolver: ((allowed: boolean) => void) | null = null;
  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Owning organization boundary for every read and accepted command.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input.required();
  /**
   * Property exportId
   * @readonly
   *
   * @description
   * Optional selected archive supplied by the route query.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly exportId: InputSignal<string | undefined> = input<string | undefined>();
  /**
   * Property store
   * @readonly
   *
   * @description
   * Route-scoped archive state and command acceptance authority.
   *
   * @access protected
   * @since unreleased
   *
   * @type {MaintenanceExportStoreType}
   */
  protected readonly store: MaintenanceExportStoreType = inject(MaintenanceExportStore);
  /**
   * Property regionalFormatting
   * @readonly
   *
   * @description
   * Organization date and timezone formatting preferences.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<RegionalFormatSettings>}
   */
  protected readonly regionalFormatting: Signal<RegionalFormatSettings> =
    inject(REGIONAL_FORMATTING_PORT).regionalFormatting;
  /**
   * Property permissions
   * @readonly
   *
   * @description
   * Effective server-owned organization permission grants.
   *
   * @access private
   * @since unreleased
   *
   * @type {OrganizationPermissionService}
   */
  private readonly permissions: OrganizationPermissionService = inject(
    OrganizationPermissionService,
  );
  /**
   * Property session
   * @readonly
   *
   * @description
   * Authenticated session boundary that invalidates private archive data.
   *
   * @access private
   * @since unreleased
   *
   * @type {AuthSessionPort}
   */
  private readonly session: AuthSessionPort = inject(AUTH_SESSION_PORT);
  /**
   * Property platform
   * @readonly
   *
   * @description
   * Rendering platform used to prohibit private SSR requests.
   *
   * @access private
   * @since unreleased
   *
   * @type {object}
   */
  private readonly platform: object = inject(PLATFORM_ID);
  /**
   * Property downloader
   * @readonly
   *
   * @description
   * Owner browser helper that saves the exact retained bytes.
   *
   * @access private
   * @since unreleased
   *
   * @type {BrowserDownloadService}
   */
  private readonly downloader: BrowserDownloadService = inject(BrowserDownloadService);
  /**
   * Property connectivity
   * @readonly
   *
   * @description
   * Connectivity authority used to defer new archive writes while offline.
   *
   * @access private
   * @since unreleased
   *
   * @type {ConnectivityService}
   */
  private readonly connectivity: ConnectivityService = inject(ConnectivityService);
  /**
   * Property editor
   * @readonly
   *
   * @description
   * Explicit native command sheet currently selected by the reader.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<'create' | 'adjust' | 'confirm' | 'reference' | null>}
   */
  protected readonly editor: WritableSignal<'create' | 'adjust' | 'confirm' | 'reference' | null> =
    signal(null);
  /**
   * Property sourcePage
   * @readonly
   *
   * @description
   * Current published dossier selector page.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<number>}
   */
  protected readonly sourcePage: WritableSignal<number> = signal(1);
  /**
   * Property sourceSearch
   * @readonly
   *
   * @description
   * Committed server search for published dossier choices.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<string>}
   */
  protected readonly sourceSearch: WritableSignal<string> = signal('');
  /**
   * Property targetPage
   * @readonly
   *
   * @description
   * Current resource directory page.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<number>}
   */
  protected readonly targetPage: WritableSignal<number> = signal(1);
  /**
   * Property dirty
   * @readonly
   *
   * @description
   * Native form dirtiness reported by the active editor.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly dirty: WritableSignal<boolean> = signal(false);
  /**
   * Property discardRequested
   * @readonly
   *
   * @description
   * Whether the reader must resolve dismissal of a modified draft.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly discardRequested: WritableSignal<boolean> = signal(false);
  /**
   * Property reviewRequested
   * @readonly
   *
   * @description
   * Whether a confirmed conflict source has been explicitly reloaded.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly reviewRequested: WritableSignal<boolean> = signal(false);
  /**
   * Property canManage
   * @readonly
   *
   * @description
   * Separate archive and mapping management permission.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly canManage: Signal<boolean> = computed(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.MAINTENANCE_EXPORTS_MANAGE),
  );
  /**
   * Property canConfirm
   * @readonly
   *
   * @description
   * Separate permission to acknowledge an actual external import.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly canConfirm: Signal<boolean> = computed(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.MAINTENANCE_EXPORTS_CONFIRM),
  );
  /**
   * Property canReadCosts
   * @readonly
   *
   * @description
   * Independent financial read permission for private exports.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly canReadCosts: Signal<boolean> = computed(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.MAINTENANCE_COST_READ),
  );
  /**
   * Property allowedReferenceTypes
   * @readonly
   *
   * @description
   * Readable owner types available for external mapping selection.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<readonly MaintenanceExportResourceType[]>}
   */
  protected readonly allowedReferenceTypes: Signal<readonly MaintenanceExportResourceType[]> =
    computed(() => {
      const result: MaintenanceExportResourceType[] = [];
      if (this.permissions.hasPermission(ORGANIZATION_PERMISSION.CUSTOMERS_READ))
        result.push('customer');
      if (this.permissions.hasPermission(ORGANIZATION_PERMISSION.FACILITIES_READ))
        result.push('site');
      if (this.permissions.hasPermission(ORGANIZATION_PERMISSION.EQUIPMENT_READ))
        result.push('equipment');
      return result;
    });
  /**
   * Property pending
   * @readonly
   *
   * @description
   * Whether an accepted command is waiting for its acknowledgement.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly pending: Signal<boolean> = computed(() => this.store.writePending());
  /**
   * Property locked
   * @readonly
   *
   * @description
   * Whether editing is prohibited by permissions, connectivity or receipt recovery.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly locked: Signal<boolean> = computed(
    () => this.store.writePending() || this.store.uncertainWrite() || !this.connectivity.isOnline(),
  );
  /**
   * Property conflict
   * @readonly
   *
   * @description
   * Confirmed concurrency or identity conflict requiring explicit source review.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly conflict: Signal<boolean> = computed(() =>
    ['409', '412'].includes(String(this.store.writeCallState().error?.code ?? '')),
  );
  /**
   * Property creating
   * @readonly
   *
   * @description
   * Whether the creation form is mounted in the native sheet.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly creating: Signal<boolean> = computed(() => this.editor() === 'create');
  /**
   * Property referencing
   * @readonly
   *
   * @description
   * Whether the external mapping form is mounted.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly referencing: Signal<boolean> = computed(() => this.editor() === 'reference');
  /**
   * Property confirming
   * @readonly
   *
   * @description
   * Whether the actual import acknowledgement form is mounted.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly confirming: Signal<boolean> = computed(() => this.editor() === 'confirm');
  /**
   * Property editorTitle
   * @readonly
   *
   * @description
   * Localized accessible title for the active native sheet.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<string>}
   */
  protected readonly editorTitle: Signal<string> = computed(() => {
    const labels: Readonly<Record<string, string>> = {
      create: $localize`:@@maintenanceExport.editor.create:Generate a prestation export`,
      adjust: $localize`:@@maintenanceExport.editor.adjust:Append an adjustment`,
      confirm: $localize`:@@maintenanceExport.editor.confirm:Confirm an external import`,
      reference: $localize`:@@maintenanceExport.editor.reference:Map an external resource reference`,
    };
    const editor = this.editor();
    return editor ? (labels[editor] ?? '') : '';
  });
  /**
   * Property writeError
   * @readonly
   *
   * @description
   * Server rejection retained beside the unchanged command draft.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<StoreError | null>}
   */
  protected readonly writeError: Signal<StoreError | null> = computed(
    () => this.store.writeCallState().error,
  );
  /**
   * Property downloadFilename
   *
   * @description
   * Selected retained archive filename used after the byte request succeeds.
   *
   * @access private
   * @since unreleased
   *
   * @type {string}
   */
  private downloadFilename: string = '';
  /**
   * Property renderedScope
   *
   * @description
   * Organization, session and financial access identity already rendered.
   *
   * @access private
   * @since unreleased
   *
   * @type {string}
   */
  private renderedScope: string = '';
  /**
   * Property mappingQuery
   *
   * @description
   * Exact readable mapping tuple retained for explicit conflict review.
   *
   * @access private
   * @since unreleased
   *
   * @type {{
   *   readonly resourceType: MaintenanceExportResourceType;
   *   readonly resourceId: string;
   *   readonly system: string;
   * } | null}
   */
  private mappingQuery: {
    readonly resourceType: MaintenanceExportResourceType;
    readonly resourceId: string;
    readonly system: string;
  } | null = null;

  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Connects native draft, authenticated scope and acknowledged command consequences.
   *
   * @access public
   * @since unreleased
   */
  public constructor() {
    effect(() => {
      const organizationId = this.organizationId(),
        revision = this.session.sessionRevision(),
        authenticated = this.session.isAuthenticated(),
        allowed = this.permissions.hasPermission(ORGANIZATION_PERMISSION.MAINTENANCE_EXPORTS_READ);
      if (!isPlatformBrowser(this.platform) || !authenticated || !allowed) {
        untracked(() => {
          this.renderedScope = '';
          this.store.setScope(null);
          this.editor.set(null);
        });
        return;
      }
      const identity = organizationId + '/' + revision + '/' + this.canReadCosts();
      untracked(() => {
        if (identity !== this.renderedScope) {
          this.renderedScope = identity;
          this.editor.set(null);
          this.dirty.set(false);
          this.mappingQuery = null;
          this.store.setScope({ organizationId, sessionRevision: revision });
          this.store.load({ page: 1 });
          this.store.loadReferences({ page: 1 });
        }
      });
    });
    effect(() => {
      const id = this.exportId();
      this.store.scope();
      untracked(() => this.store.read(id ?? null));
    });
    effect(() => {
      const downloaded = this.store.downloadCallState();
      const blob = downloaded.data;
      if (downloaded.status === 'success' && blob && isPlatformBrowser(this.platform))
        untracked(() => {
          this.downloader.trigger(blob, this.downloadFilename);
          this.store.clearDownload();
        });
    });
    inject(Events)
      .on(maintenanceExportStoreEvents.acknowledged)
      .pipe(takeUntilDestroyed())
      .subscribe(({ payload }) => {
        if (
          payload.organizationId !== this.organizationId() ||
          payload.sessionRevision !== this.session.sessionRevision()
        )
          return;
        this.editor.set(null);
        this.dirty.set(false);
        this.reviewRequested.set(false);
        this.store.load({ page: this.store.page() });
        this.store.loadReferences({ page: 1 });
        if (payload.kind !== 'reference')
          void this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { exportId: payload.id },
            queryParamsHandling: 'merge',
          });
      });
  }

  //#endregion

  //#region Methods
  /**
   * Method stateLabel
   * @method stateLabel
   *
   * @description
   * Separates generated files from actual acknowledged external imports.
   *
   * @access protected
   * @since unreleased
   *
   * @param {string} value - Explicit value supplied by the owning workflow.
   *
   * @returns {string} Result for the current authorized archive workflow.
   */
  protected stateLabel(value: string): string {
    const labels: Readonly<Record<string, string>> = {
      generated: $localize`:@@maintenanceExport.state.generated:Export generated`,
      import_confirmed: $localize`:@@maintenanceExport.state.confirmed:Import confirmed`,
    };
    return labels[value] ?? value;
  }

  /**
   * Method kindLabel
   * @method kindLabel
   *
   * @description
   * Identifies an original archive or its linked adjustment.
   *
   * @access protected
   * @since unreleased
   *
   * @param {string} value - Explicit value supplied by the owning workflow.
   *
   * @returns {string} Result for the current authorized archive workflow.
   */
  protected kindLabel(value: string): string {
    const labels: Readonly<Record<string, string>> = {
      initial: $localize`:@@maintenanceExport.kind.initial:Initial export`,
      adjustment: $localize`:@@maintenanceExport.kind.adjustment:Adjustment`,
    };
    return labels[value] ?? value;
  }

  /**
   * Method typeLabel
   * @method typeLabel
   *
   * @description
   * Localizes the supported owner type without changing server codes.
   *
   * @access protected
   * @since unreleased
   *
   * @param {string} value - Explicit value supplied by the owning workflow.
   *
   * @returns {string} Result for the current authorized archive workflow.
   */
  protected typeLabel(value: string): string {
    const labels: Readonly<Record<string, string>> = {
      customer: $localize`:@@maintenanceExport.reference.customer:Customer`,
      site: $localize`:@@maintenanceExport.reference.site:Site`,
      equipment: $localize`:@@maintenanceExport.reference.equipment:Equipment`,
    };
    return labels[value] ?? value;
  }

  /**
   * Method open
   * @method open
   *
   * @description
   * Opens an explicitly permitted native editor and starts only its necessary secondary reads.
   *
   * @access protected
   * @since unreleased
   *
   * @param {'create' | 'adjust' | 'confirm' | 'reference'} kind - Explicit kind supplied by the
   *   owning workflow.
   *
   * @returns {void} No return value.
   */
  protected open(kind: 'create' | 'adjust' | 'confirm' | 'reference'): void {
    if (this.locked() || (kind === 'confirm' ? !this.canConfirm() : !this.canManage())) return;
    const detail = this.store.detailCallState().data;
    if ((kind === 'adjust' || kind === 'confirm') && (!detail || !this.readableArchive(detail)))
      return;
    this.store.clearCommand();
    this.reviewRequested.set(false);
    this.dirty.set(false);
    this.discardRequested.set(false);
    this.editor.set(kind);
    if (kind === 'create') {
      this.sourcePage.set(1);
      this.sourceSearch.set('');
      this.store.loadSources({ page: 1 });
    }
  }

  /**
   * Method sourcesChanged
   * @method sourcesChanged
   *
   * @description
   * Loads a committed server selector page while the form keeps selected dossiers.
   *
   * @access protected
   * @since unreleased
   *
   * @param {{ readonly page: number; readonly search?: string }} query - Explicit query supplied by
   *   the owning workflow.
   *
   * @returns {void} No return value.
   */
  protected sourcesChanged(query: { readonly page: number; readonly search?: string }): void {
    this.sourcePage.set(query.page);
    if (query.search !== undefined) this.sourceSearch.set(query.search);
    this.store.loadSources({ page: query.page, search: this.sourceSearch() });
  }

  /**
   * Method targetsChanged
   * @method targetsChanged
   *
   * @description
   * Loads a bounded readable owner directory page.
   *
   * @access protected
   * @since unreleased
   *
   * @param {{
   *   readonly resourceType: MaintenanceExportResourceType;
   *   readonly page: number;
   *   readonly search: string;
   *   readonly archived?: boolean;
   * }} query
   *   - Explicit query supplied by the owning workflow.
   *
   * @returns {void} No return value.
   */
  protected targetsChanged(query: {
    readonly resourceType: MaintenanceExportResourceType;
    readonly page: number;
    readonly search: string;
    readonly archived?: boolean;
  }): void {
    this.targetPage.set(query.page);
    this.store.loadTargets(query);
  }

  /**
   * Method mappingChanged
   * @method mappingChanged
   *
   * @description
   * Reads the exact mapping tuple before granting revision-zero or current-revision authority.
   *
   * @access protected
   * @since unreleased
   *
   * @param {{
   *   readonly resourceType: MaintenanceExportResourceType;
   *   readonly resourceId: string;
   *   readonly system: string;
   * } | null} query
   *   - Explicit query supplied by the owning workflow.
   *
   * @returns {void} No return value.
   */
  protected mappingChanged(
    query: {
      readonly resourceType: MaintenanceExportResourceType;
      readonly resourceId: string;
      readonly system: string;
    } | null,
  ): void {
    this.mappingQuery = query;
    this.store.readMapping(query);
  }

  /**
   * Method create
   * @method create
   *
   * @description
   * Accepts the validated bounded dossier selection with one stable operation identity.
   *
   * @access protected
   * @since unreleased
   *
   * @param {Omit<CreateMaintenanceExportInput, 'clientOperationId'>} commandInput - Explicit
   *   commandInput supplied by the owning workflow.
   *
   * @returns {void} No return value.
   */
  protected create(commandInput: Omit<CreateMaintenanceExportInput, 'clientOperationId'>): void {
    if (!this.locked() && this.canManage())
      this.store.write({
        kind: 'create',
        organizationId: this.organizationId(),
        input: { ...commandInput, clientOperationId: crypto.randomUUID() },
      });
  }

  /**
   * Method act
   * @method act
   *
   * @description
   * Accepts a motivated adjustment or actual import reference at the displayed source revision.
   *
   * @access protected
   * @since unreleased
   *
   * @param {string} value - Explicit value supplied by the owning workflow.
   *
   * @returns {void} No return value.
   */
  protected act(value: string): void {
    const detail = this.store.detailCallState().data;
    if (!detail || this.locked() || this.conflict()) return;
    if (this.confirming() && this.canConfirm())
      this.store.write({
        kind: 'confirm',
        organizationId: this.organizationId(),
        exportId: detail.id,
        revision: detail.revision,
        input: { clientOperationId: crypto.randomUUID(), externalImportReference: value },
      });
    else if (this.canManage())
      this.store.write({
        kind: 'adjust',
        organizationId: this.organizationId(),
        exportId: detail.id,
        revision: detail.revision,
        input: { clientOperationId: crypto.randomUUID(), reason: value },
      });
  }

  /**
   * Method saveReference
   * @method saveReference
   *
   * @description
   * Accepts a readable mapping choice with its reviewed optimistic revision.
   *
   * @access protected
   * @since unreleased
   *
   * @param {{
   *   readonly resourceType: MaintenanceExportResourceType;
   *   readonly resourceId: string;
   *   readonly system: string;
   *   readonly reference: string;
   *   readonly revision: number;
   * }} commandInput
   *   - Explicit commandInput supplied by the owning workflow.
   *
   * @returns {void} No return value.
   */
  protected saveReference(commandInput: {
    readonly resourceType: MaintenanceExportResourceType;
    readonly resourceId: string;
    readonly system: string;
    readonly reference: string;
    readonly revision: number;
  }): void {
    if (this.locked() || this.conflict() || !this.canManage()) return;
    this.store.write({
      kind: 'reference',
      organizationId: this.organizationId(),
      resourceType: commandInput.resourceType,
      resourceId: commandInput.resourceId,
      revision: commandInput.revision,
      input: {
        clientOperationId: crypto.randomUUID(),
        system: commandInput.system,
        reference: commandInput.reference,
      },
    });
  }

  /**
   * Method retry
   * @method retry
   *
   * @description
   * Recovers the original uncertain operation with the same body, UUID and revision.
   *
   * @access protected
   * @since unreleased
   *
   * @returns {void} No return value.
   */
  protected retry(): void {
    const command = this.store.command();
    if (command && !this.store.writePending()) this.store.write(command);
  }

  /**
   * Method loadReview
   * @method loadReview
   *
   * @description
   * Explicitly reloads a confirmed conflicting source while preserving the local form.
   *
   * @access protected
   * @since unreleased
   *
   * @returns {void} No return value.
   */
  protected loadReview(): void {
    if (this.locked()) return;
    this.reviewRequested.set(true);
    if (this.referencing()) this.store.readMapping(this.mappingQuery);
    else if (this.store.selectedId()) this.store.read(this.store.selectedId());
  }

  /**
   * Method reviewReady
   * @method reviewReady
   *
   * @description
   * Requires a successful completed source read before adopting a newer revision.
   *
   * @access protected
   * @since unreleased
   *
   * @returns {boolean} Result for the current authorized archive workflow.
   */
  protected reviewReady(): boolean {
    return (
      this.reviewRequested() &&
      (this.referencing()
        ? this.store.mappingCallState().status === 'success'
        : this.store.detailCallState().status === 'success')
    );
  }

  /**
   * Method adoptReview
   * @method adoptReview
   *
   * @description
   * Adopts the explicitly reviewed source without clearing the user draft.
   *
   * @access protected
   * @since unreleased
   *
   * @returns {void} No return value.
   */
  protected adoptReview(): void {
    if (!this.reviewReady()) return;
    this.store.clearCommand();
    this.reviewRequested.set(false);
  }

  /**
   * Method readableArchive
   * @method readableArchive
   *
   * @description
   * Applies independent financial access to archives that include internal costs.
   *
   * @access protected
   * @since unreleased
   *
   * @param {MaintenanceExportOutput} archive - Explicit archive supplied by the owning workflow.
   *
   * @returns {boolean} Result for the current authorized archive workflow.
   */
  protected readableArchive(archive: MaintenanceExportOutput): boolean {
    return !archive.includeInternalCosts || this.canReadCosts();
  }

  /**
   * Method download
   * @method download
   *
   * @description
   * Requests retained bytes and preserves their server-owned schema and identity.
   *
   * @access protected
   * @since unreleased
   *
   * @param {MaintenanceExportOutput} archive - Explicit archive supplied by the owning workflow.
   * @param {'json' | 'csv'} format - Explicit format supplied by the owning workflow.
   *
   * @returns {void} No return value.
   */
  protected download(archive: MaintenanceExportOutput, format: 'json' | 'csv'): void {
    if (!this.readableArchive(archive) || this.store.downloadCallState().status === 'pending')
      return;
    this.downloadFilename =
      'fireguard-prestations-' + archive.id + '-v' + archive.schemaVersion + '.' + format;
    this.store.download({
      exportId: archive.id,
      format,
      includeInternalCosts: archive.includeInternalCosts,
    });
  }

  /**
   * Method close
   * @method close
   *
   * @description
   * Controls draft dismissal and prohibits closing an accepted uncertain command.
   *
   * @access protected
   * @since unreleased
   *
   * @returns {void} No return value.
   */
  protected close(): void {
    if (this.locked()) return;
    if (this.dirty()) this.discardRequested.set(true);
    else this.editor.set(null);
  }

  /**
   * Method stateChanged
   * @method stateChanged
   *
   * @description
   * Routes native sheet dismissal through the same guarded draft decision.
   *
   * @access protected
   * @since unreleased
   *
   * @param {string} state - Explicit state supplied by the owning workflow.
   *
   * @returns {void} No return value.
   */
  protected stateChanged(state: string): void {
    if (state === 'closed' && this.editor()) this.close();
  }

  /**
   * Method discard
   * @method discard
   *
   * @description
   * Resolves confirmed draft abandonment and any pending navigation decision.
   *
   * @access protected
   * @since unreleased
   *
   * @returns {void} No return value.
   */
  protected discard(): void {
    if (!this.locked()) {
      this.dirty.set(false);
      this.discardRequested.set(false);
      this.editor.set(null);
      this.deactivationResolver?.(true);
      this.deactivationResolver = null;
    }
  }

  /**
   * Method keepEditing
   * @method keepEditing
   *
   * @description
   * Retains the modified draft and rejects pending navigation.
   *
   * @access protected
   * @since unreleased
   *
   * @returns {void} No return value.
   */
  protected keepEditing(): void {
    this.discardRequested.set(false);
    this.deactivationResolver?.(false);
    this.deactivationResolver = null;
  }

  /**
   * Method hasUnsavedChanges
   * @method hasUnsavedChanges
   *
   * @description
   * Reports native drafts and unresolved accepted writes to the navigation guard.
   *
   * @access public
   * @since unreleased
   *
   * @returns {boolean} Result for the current authorized archive workflow.
   */
  public hasUnsavedChanges(): boolean {
    return this.dirty() || this.store.writePending() || this.store.uncertainWrite();
  }

  /**
   * Method confirmDeactivation
   * @method confirmDeactivation
   *
   * @description
   * Blocks unresolved writes and asks the reader to resolve a modified draft.
   *
   * @access public
   * @since unreleased
   *
   * @returns {Promise<boolean>} Result for the current authorized archive workflow.
   */
  public confirmDeactivation(): Promise<boolean> {
    if (this.store.writePending() || this.store.uncertainWrite()) return Promise.resolve(false);
    this.discardRequested.set(true);
    return new Promise((resolve) => {
      this.deactivationResolver = resolve;
    });
  }
  //#endregion
}
