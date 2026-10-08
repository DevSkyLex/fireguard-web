import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
  type InputSignal,
  type Signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { Events } from '@ngrx/signals/events';
import { ConnectivityService } from '@core/connectivity';
import { INTERACTION_CAPABILITIES_PORT } from '@core/interaction-capabilities';
import { AUTH_SESSION_PORT } from '@features/auth/ports';
import { OrganizationPermissionService } from '@features/organization/access';
import type {
  ServiceRequestStatus,
  CreateServiceRequestInput,
} from '@features/organization/features/service-requests/models';
import {
  ServiceRequestStore,
  serviceRequestStoreEvents,
} from '@features/organization/features/service-requests/state';
import {
  serviceRequestStatusLabel,
  serviceRequestPriorityLabel,
} from '@features/organization/features/service-requests/utils';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import {
  ORGANIZATION_MEMBER_ACCESS_PORT,
  REGIONAL_FORMATTING_PORT,
  type OrganizationMemberAccessPort,
} from '@features/organization/ports';
import { CollectionPagination } from '@shared/collection-pagination';
import { OrgDatePipe } from '@shared/regional-format';
import { StateIllustration } from '@shared/state-illustration';
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmInput } from '@shared/ui/input';
import { HlmItemImports } from '@shared/ui/item';
import { HlmSkeleton } from '@shared/ui/skeleton';
import { HlmTableImports } from '@shared/ui/table';
import { HlmToggleGroupImports } from '@shared/ui/toggle-group';
import { ServiceRequestEditorSheet } from '../../sheets/service-request-editor-sheet/service-request-editor-sheet.component';

/**
 * Class ServiceRequestsPage
 * @class ServiceRequestsPage
 *
 * @description
 * Internal server-paginated request directory and dedicated creation entry point.
 *
 * @since unreleased
 */
@Component({
  selector: 'app-service-requests-page',
  templateUrl: './service-requests-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ServiceRequestStore],
  imports: [
    RouterLink,
    OrgDatePipe,
    CollectionPagination,
    StateIllustration,
    HlmBadge,
    HlmButton,
    HlmInput,
    HlmSkeleton,
    ServiceRequestEditorSheet,
    ...HlmAlertImports,
    ...HlmEmptyImports,
    ...HlmItemImports,
    ...HlmTableImports,
    ...HlmToggleGroupImports,
  ],
})
export class ServiceRequestsPage {
  //#region Properties
  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Organization authority shared by the owning route and server transport.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string>}
   */
  public readonly organizationId = input.required<string>();
  /**
   * Property equipmentId
   * @readonly
   *
   * @description
   * Optional route equipment target; absent query parameters remain undefined.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly equipmentId = input<string | undefined>();
  /**
   * Property siteId
   * @readonly
   *
   * @description
   * Optional root-site route scope; qualification choices stay inside this site.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly siteId = input<string | undefined>();
  /**
   * Property originInspectionId
   * @readonly
   *
   * @description
   * Optional source inspection preserved in the creation input.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly originInspectionId = input<string | undefined>();
  /**
   * Property originNonConformityId
   * @readonly
   *
   * @description
   * Optional source anomaly preserved in the creation input.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly originNonConformityId = input<string | undefined>();
  /**
   * Property create
   * @readonly
   *
   * @description
   * Optional route intent to open creation without submitting a request.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly create: InputSignal<string | undefined> = input<string | undefined>();
  /**
   * Property store
   * @readonly
   *
   * @description
   * Component-owned request workflow state.
   *
   * @access protected
   * @since unreleased
   *
   * @type {ServiceRequestStoreType}
   */
  protected readonly store = inject(ServiceRequestStore);
  /**
   * Property sessionRevision
   * @readonly
   *
   * @description
   * Session replacement invalidates the route's actor-private editor without reading credentials.
   *
   * @access private
   * @since unreleased
   *
   * @type {Signal<number>}
   */
  private readonly sessionRevision: Signal<number> = inject(AUTH_SESSION_PORT).sessionRevision;

  /**
   * Property isAuthenticated
   * @readonly
   *
   * @description
   * Established local session whose termination must permit authentication redirects.
   *
   * @access private
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  private readonly isAuthenticated: Signal<boolean> = inject(AUTH_SESSION_PORT).isAuthenticated;

  /**
   * Property memberAccess
   * @readonly
   *
   * @description
   * Published member identity distinguishes actors whose organization permissions are identical.
   *
   * @access private
   * @since unreleased
   *
   * @type {OrganizationMemberAccessPort}
   */
  private readonly memberAccess: OrganizationMemberAccessPort = inject(
    ORGANIZATION_MEMBER_ACCESS_PORT,
  );

  /**
   * Property editorOwnerKey
   * @readonly
   *
   * @description
   * Stable route, actor and session identity destroys the previous native editor when its owner
   * changes.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<string>}
   */
  protected readonly editorOwnerKey: Signal<string> = computed(() =>
    JSON.stringify([
      this.organizationId(),
      this.sessionRevision(),
      this.memberAccess.profile()?.userId ?? null,
    ]),
  );
  /**
   * Property permissions
   * @readonly
   *
   * @description
   * API-derived organization permission authority.
   *
   * @access private
   * @since unreleased
   *
   * @type {OrganizationPermissionService}
   */
  private readonly permissions = inject(OrganizationPermissionService);
  /**
   * Property connectivity
   * @readonly
   *
   * @description
   * Online state used without discarding an entered draft.
   *
   * @access private
   * @since unreleased
   *
   * @type {ConnectivityService}
   */
  private readonly connectivity = inject(ConnectivityService);
  /**
   * Property platformId
   * @readonly
   *
   * @description
   * Browser guard for secondary authenticated reads.
   *
   * @access private
   * @since unreleased
   *
   * @type {object}
   */
  private readonly platformId = inject(PLATFORM_ID);
  /**
   * Property router
   * @readonly
   *
   * @description
   * Navigation after the server confirms request creation.
   *
   * @access private
   * @since unreleased
   *
   * @type {Router}
   */
  private readonly router = inject(Router);
  /**
   * Property regionalFormatting
   * @readonly
   *
   * @description
   * Organization timezone and date pattern for retained history.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<RegionalFormatSettings>}
   */
  protected readonly regionalFormatting = inject(REGIONAL_FORMATTING_PORT).regionalFormatting;
  /**
   * Property isMobile
   * @readonly
   *
   * @description
   * Central interaction mode selects native touch cards without viewport heuristics.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly isMobile = inject(INTERACTION_CAPABILITIES_PORT).isMobileInteractionMode;
  /**
   * Property canRead
   * @readonly
   *
   * @description
   * Permission gate for the owned resource reads.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly canRead = computed(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.SERVICE_REQUESTS_READ),
  );
  /**
   * Property canCreate
   * @readonly
   *
   * @description
   * Dedicated request creation grant, independent of management.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly canCreate = computed(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.SERVICE_REQUESTS_CREATE),
  );
  /**
   * Property online
   * @readonly
   *
   * @description
   * Observed network state for explicit online commands.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly online = computed(() => this.connectivity.isOnline());
  /**
   * Property page
   * @readonly
   *
   * @description
   * Current server page, starting at one.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<number>}
   */
  protected readonly page = signal(1);
  /**
   * Property search
   * @readonly
   *
   * @description
   * Committed server search term.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<string>}
   */
  protected readonly search = signal('');
  /**
   * Property status
   * @readonly
   *
   * @description
   * Server workflow state or the selected workflow filter.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<ServiceRequestStatus | ''>}
   */
  protected readonly status = signal<ServiceRequestStatus | ''>('');
  /**
   * Property editorVisible
   * @readonly
   *
   * @description
   * Overlay visibility owned by the page and confirmed mutation feedback.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly editorVisible = signal(false);
  /**
   * Property editorSheet
   * @readonly
   *
   * @description
   * Active native editor owns the entered draft and its discard confirmation.
   *
   * @access private
   * @since unreleased
   *
   * @type {Signal<ServiceRequestEditorSheet | undefined>}
   */
  private readonly editorSheet: Signal<ServiceRequestEditorSheet | undefined> =
    viewChild(ServiceRequestEditorSheet);
  /**
   * Property confirmedTitle
   * @readonly
   *
   * @description
   * Server-confirmed creation title shown to a creator without directory read access.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<string>}
   */
  protected readonly confirmedTitle = signal('');
  /**
   * Property statusLabel
   * @readonly
   *
   * @description
   * Localized workflow label from the owning request vocabulary.
   *
   * @access protected
   * @since unreleased
   *
   * @type {(status: ServiceRequestStatus) => string}
   */
  protected readonly statusLabel = serviceRequestStatusLabel;
  /**
   * Property priorityLabel
   * @readonly
   *
   * @description
   * Localized declared-priority label.
   *
   * @access protected
   * @since unreleased
   *
   * @type {(priority: ServiceRequestPriority) => string}
   */
  protected readonly priorityLabel = serviceRequestPriorityLabel;
  /**
   * Property statuses
   * @readonly
   *
   * @description
   * Canonical server workflow filters offered to the directory.
   *
   * @access protected
   * @since unreleased
   *
   * @type {readonly ServiceRequestStatus[]}
   */
  protected readonly statuses: readonly ServiceRequestStatus[] = [
    'requested',
    'qualified',
    'rejected',
    'cancelled',
    'converted',
  ];
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Binds cancellable browser directory reads, permission-gated creation and confirmed navigation.
   *
   * @access public
   * @since unreleased
   */
  public constructor() {
    effect(() => {
      const organizationId = this.organizationId();
      this.editorOwnerKey();
      untracked(() => {
        this.page.set(1);
        this.search.set('');
        this.status.set('');
        this.editorVisible.set(false);
        this.confirmedTitle.set('');
        this.store.load(null);
      });
      if (!organizationId) return;
    });
    effect(() => {
      this.editorOwnerKey();
      const organizationId = this.organizationId(),
        equipmentId = this.equipmentId(),
        siteId = this.siteId(),
        page = this.page(),
        search = this.search(),
        status = this.status();
      const enabled = this.canRead() && this.online() && isPlatformBrowser(this.platformId);
      const commandsEnabled =
        (this.canRead() || this.canCreate()) && isPlatformBrowser(this.platformId);
      untracked(() => {
        this.store.load(
          enabled
            ? {
                organizationId,
                page,
                search,
                ...(status ? { status } : {}),
                ...(equipmentId ? { equipmentId } : {}),
                ...(siteId ? { siteId } : {}),
              }
            : null,
        );
        if (commandsEnabled && organizationId) this.store.activateCommands(organizationId);
      });
    });
    effect(() => {
      const create = this.create(),
        allowed = this.canCreate(),
        organizationId = this.organizationId();
      if (
        create !== '1' ||
        !allowed ||
        !organizationId ||
        !this.store.commandsReady() ||
        !isPlatformBrowser(this.platformId)
      )
        return;
      untracked(() => this.editorVisible.set(true));
    });
    inject(Events)
      .on(serviceRequestStoreEvents.saved)
      .pipe(takeUntilDestroyed())
      .subscribe(({ payload }) => {
        if (payload.organizationId !== this.organizationId()) return;
        this.editorVisible.set(false);
        this.confirmedTitle.set(payload.request.title);
        if (this.canRead())
          void this.router.navigate([
            '/organizations',
            payload.organizationId,
            'service-requests',
            payload.request.id,
          ]);
      });
  }
  //#endregion

  //#region Methods
  /**
   * Method canLeaveDraft
   *
   * @description
   * Protects accepted writes and entered creation drafts while the session remains established.
   * Journal restoration does not trap a reader or prevent authentication redirects.
   *
   * @access public
   * @since unreleased
   *
   * @returns {boolean | Promise<boolean>} Whether the route may leave its current editor.
   */
  public canLeaveDraft(): boolean | Promise<boolean> {
    if (!this.isAuthenticated()) return true;
    if (this.store.writeCallState().status === 'pending') return false;
    if (!this.editorVisible()) return true;
    return this.editorSheet()?.canClose() ?? true;
  }

  /**
   * Method searchChanged
   *
   * @description
   * Commits directory search and returns to the first server page.
   *
   * @access protected
   * @since unreleased
   *
   * @param {Event} event - Native submit or input event.
   *
   * @returns {void} Result owned by the request workflow.
   */
  protected searchChanged(event: Event): void {
    if (event.target instanceof HTMLInputElement) {
      this.page.set(1);
      this.search.set(event.target.value);
    }
  }
  /**
   * Method statusChanged
   *
   * @description
   * Accepts canonical server workflow filters.
   *
   * @access protected
   * @since unreleased
   *
   * @param {unknown} value - Native choice value validated against the current options.
   *
   * @returns {void} Result owned by the request workflow.
   */
  protected statusChanged(value: unknown): void {
    if (
      value === '' ||
      value === 'requested' ||
      value === 'qualified' ||
      value === 'rejected' ||
      value === 'cancelled' ||
      value === 'converted'
    ) {
      this.page.set(1);
      this.status.set(value);
    }
  }
  /**
   * Method open
   *
   * @description
   * Captures the displayed revision and opens an explicitly permitted action.
   *
   * @access protected
   * @since unreleased
   *
   * @returns {void} Result owned by the request workflow.
   */
  protected open(): void {
    if (
      !this.canCreate() ||
      !this.store.commandsReady() ||
      this.store.writeCallState().status === 'pending'
    )
      return;
    this.store.clearWrite();
    this.editorVisible.set(true);
  }
  /**
   * Method createRequest
   *
   * @description
   * Submits a described target without implicitly qualifying or converting it.
   *
   * @access protected
   * @since unreleased
   *
   * @param {CreateServiceRequestInput} data - Validated description fields.
   *
   * @returns {void} Result owned by the request workflow.
   */
  protected createRequest(data: CreateServiceRequestInput): void {
    if (
      !this.canCreate() ||
      !this.online() ||
      !this.store.commandsReady() ||
      this.store.writeCallState().status === 'pending'
    )
      return;
    this.store.write({ kind: 'create', organizationId: this.organizationId(), input: data });
  }
  /**
   * Method retry
   *
   * @description
   * Retries the currently permitted scoped resource read.
   *
   * @access protected
   * @since unreleased
   *
   * @returns {void} Result owned by the request workflow.
   */
  protected retry(): void {
    const query = this.store.query();
    if (query && this.canRead() && this.online()) this.store.load(query);
  }
  //#endregion
}
