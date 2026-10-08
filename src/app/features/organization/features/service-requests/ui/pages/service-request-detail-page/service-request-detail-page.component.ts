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
  type Signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Events } from '@ngrx/signals/events';
import { ConnectivityService } from '@core/connectivity';
import { AUTH_SESSION_PORT } from '@features/auth/ports';
import { OrganizationPermissionService } from '@features/organization/access';
import type {
  ServiceRequestOutput,
  CreateServiceRequestInput,
} from '@features/organization/features/service-requests/models';
import {
  ServiceRequestStore,
  ServiceRequestTargetStore,
  serviceRequestStoreEvents,
  type ServiceRequestStoreType,
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
import { OrgDatePipe } from '@shared/regional-format';
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmSkeleton } from '@shared/ui/skeleton';
import { HlmLarge } from '@shared/ui/typography';
import type { ServiceRequestActionIntent } from '../../forms/service-request-action-form/service-request-action-form.component';
import {
  ServiceRequestEditorSheet,
  type ServiceRequestEditorKind,
} from '../../sheets/service-request-editor-sheet/service-request-editor-sheet.component';
/**
 * Class ServiceRequestDetailPage
 * @class ServiceRequestDetailPage
 *
 * @description
 * Request dossier separates qualification and work conversion while preserving target identity and
 * revision review.
 *
 * @since unreleased
 */
@Component({
  selector: 'app-service-request-detail-page',
  templateUrl: './service-request-detail-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ServiceRequestStore, ServiceRequestTargetStore],
  imports: [
    RouterLink,
    OrgDatePipe,
    HlmBadge,
    HlmButton,
    HlmLarge,
    HlmSkeleton,
    ServiceRequestEditorSheet,
    ...HlmAlertImports,
    ...HlmEmptyImports,
  ],
})
export class ServiceRequestDetailPage {
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
   * Property requestId
   * @readonly
   *
   * @description
   * Stable request identity supplied by the detail route.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string>}
   */
  public readonly requestId = input.required<string>();
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
   * Stable dossier, actor and session identity destroys the previous native editor when its owner
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
      this.requestId(),
      this.sessionRevision(),
      this.memberAccess.profile()?.userId ?? null,
    ]),
  );
  /**
   * Property targets
   * @readonly
   *
   * @description
   * Component-owned target and open-work read state.
   *
   * @access protected
   * @since unreleased
   *
   * @type {ServiceRequestTargetStoreType}
   */
  protected readonly targets = inject(ServiceRequestTargetStore);
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
   * Property current
   * @readonly
   *
   * @description
   * Current request data, scoped by organization and request identity.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<ServiceRequestOutput | null>}
   */
  protected readonly current = computed(() => this.store.readCallState().data);
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
   * Property canManage
   * @readonly
   *
   * @description
   * Dedicated qualification, decision and conversion grant.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly canManage = computed(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.SERVICE_REQUESTS_MANAGE),
  );
  /**
   * Property canReadEquipment
   * @readonly
   *
   * @description
   * Equipment dossier and target-choice read grant.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly canReadEquipment = computed(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.EQUIPMENT_READ),
  );
  /**
   * Property canReadSites
   * @readonly
   *
   * @description
   * Site dossier and root-site choice read grant.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly canReadSites = computed(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.FACILITIES_READ),
  );
  /**
   * Property canReadInterventions
   * @readonly
   *
   * @description
   * Intervention dossier and open-work read grant.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly canReadInterventions = computed(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.INTERVENTIONS_READ),
  );
  /**
   * Property canReadInspections
   * @readonly
   *
   * @description
   * Source inspection dossier read grant.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly canReadInspections = computed(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.INSPECTION_READ),
  );
  /**
   * Property canPlan
   * @readonly
   *
   * @description
   * Intervention planning grant required in addition to request management.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly canPlan = computed(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.INTERVENTIONS_PLAN),
  );
  /**
   * Property canReadWork
   * @readonly
   *
   * @description
   * Both equipment and intervention read grants are required for open-work choices.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly canReadWork = computed(
    () => this.canReadEquipment() && this.canReadInterventions(),
  );
  /**
   * Property kind
   * @readonly
   *
   * @description
   * Explicit workflow action currently being prepared.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<ServiceRequestEditorKind>}
   */
  protected readonly kind = signal<ServiceRequestEditorKind>('update');
  /**
   * Property editing
   * @readonly
   *
   * @description
   * Immutable displayed revision captured before an action is submitted.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<ServiceRequestOutput | null>}
   */
  protected readonly editing = signal<ServiceRequestOutput | null>(null);
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
   * Property retainedConversion
   * @readonly
   *
   * @description
   * Durable conversion belongs to this dossier and prevents preparing a competing operation.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<ReturnType<ServiceRequestStoreType['conversionCommand']>>}
   */
  protected readonly retainedConversion: Signal<
    ReturnType<ServiceRequestStoreType['conversionCommand']>
  > = computed(() => {
    const command = this.store.conversionCommand();
    return command?.organizationId === this.organizationId() &&
      command.request.id === this.requestId()
      ? command
      : null;
  });
  /**
   * Property reviewing
   * @readonly
   *
   * @description
   * An explicit latest-version read is pending; it does not adopt that revision.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly reviewing = signal(false);
  /**
   * Property latest
   * @readonly
   *
   * @description
   * Latest server projection available for an explicit revision review.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<ServiceRequestOutput | null>}
   */
  protected readonly latest = signal<ServiceRequestOutput | null>(null);
  /**
   * Property busy
   * @readonly
   *
   * @description
   * An open editor or accepted mutation prevents a competing action.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly busy: Signal<boolean> = computed(
    () =>
      !this.store.commandsReady() ||
      this.store.writeCallState().status === 'pending' ||
      !!this.retainedConversion() ||
      this.editorVisible(),
  );
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
   * Property compatibleWork
   * @readonly
   *
   * @description
   * Live open repair tasks offered for explicit reuse; no work identity is fabricated.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<readonly EquipmentOpenWorkOutput[]>}
   */
  protected readonly compatibleWork = computed(() =>
    (this.targets.openWorkCallState().data ?? []).filter(
      (work) =>
        work.action === 'repair' &&
        (work.workItemStatus === 'planned' || work.workItemStatus === 'in_progress') &&
        !['submitted', 'published', 'abandoned', 'completed', 'closed', 'cancelled'].includes(
          work.status,
        ),
    ),
  );
  /**
   * Property conflict
   * @readonly
   *
   * @description
   * A stale revision requires an explicit user review.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly conflict = computed(
    () =>
      this.store.writeCallState().error?.code === 412 ||
      this.store.writeCallState().error?.code === '412',
  );
  /**
   * Property canAcceptLatest
   * @readonly
   *
   * @description
   * Whether the reviewed state still allows the originally selected action.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly canAcceptLatest = computed(() => {
    const latest = this.latest();
    return !!latest && this.allowed(this.kind(), latest);
  });
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Binds scoped browser reads, explicit revision review and confirmed work-link feedback.
   *
   * @access public
   * @since unreleased
   */
  public constructor() {
    effect(() => {
      this.editorOwnerKey();
      const organizationId = this.organizationId(),
        requestId = this.requestId(),
        allowed = this.canRead();
      const enabled = allowed && isPlatformBrowser(this.platformId);
      untracked(() => {
        this.editorVisible.set(false);
        this.editing.set(null);
        this.latest.set(null);
        this.reviewing.set(false);
        this.targets.loadOpenWork(null);
        this.store.read(enabled ? { organizationId, requestId } : null);
      });
    });
    effect(() => {
      const request = this.editing(),
        kind = this.kind(),
        visible = this.editorVisible();
      const enabled =
        request?.equipmentId &&
        kind === 'convert' &&
        visible &&
        this.canReadWork() &&
        this.online() &&
        isPlatformBrowser(this.platformId);
      untracked(() =>
        this.targets.loadOpenWork(
          enabled && request
            ? { organizationId: this.organizationId(), equipmentId: request.equipmentId ?? '' }
            : null,
        ),
      );
    });
    effect(() => {
      const reviewing = this.reviewing(),
        state = this.store.readCallState();
      if (!reviewing || state.status !== 'success' || !state.data) return;
      untracked(() => {
        this.latest.set(state.data);
        this.reviewing.set(false);
      });
    });
    inject(Events)
      .on(serviceRequestStoreEvents.saved)
      .pipe(takeUntilDestroyed())
      .subscribe(({ payload }) => {
        if (
          payload.organizationId !== this.organizationId() ||
          payload.request.id !== this.requestId()
        )
          return;
        this.editorVisible.set(false);
        this.editing.set(null);
        this.latest.set(null);
      });
  }
  //#endregion

  //#region Methods
  /**
   * Method canLeaveDraft
   *
   * @description
   * Protects accepted writes and ordinary drafts while the session remains established. Journal
   * restoration does not trap a reader, and durable uncertain conversions remain recoverable.
   *
   * @access public
   * @since unreleased
   *
   * @returns {boolean | Promise<boolean>} Whether leaving can preserve the current workflow.
   */
  public canLeaveDraft(): boolean | Promise<boolean> {
    if (!this.isAuthenticated()) return true;
    if (this.store.writeCallState().status === 'pending') return false;
    if (!this.editorVisible()) return true;
    if (this.retainedConversion() && this.store.conversionUncertain()) return true;
    return this.editorSheet()?.canClose() ?? true;
  }

  /**
   * Method allowed
   *
   * @description
   * Checks the dedicated management grant and the server state before offering an action.
   *
   * @access protected
   * @since unreleased
   *
   * @param {ServiceRequestEditorKind} kind - Explicit workflow action.
   * @param {ServiceRequestOutput} request - Displayed immutable request revision.
   *
   * @returns {boolean} Result owned by the request workflow.
   */
  protected allowed(kind: ServiceRequestEditorKind, request: ServiceRequestOutput): boolean {
    if (!this.canManage()) return false;
    switch (kind) {
      case 'create':
        return false;
      case 'update':
        return request.status === 'requested';
      case 'qualify':
        return request.status === 'requested' && (!!request.equipmentId || this.canReadEquipment());
      case 'reject':
      case 'cancel':
        return request.status === 'requested' || request.status === 'qualified';
      case 'convert':
        return request.status === 'qualified' && !!request.equipmentId && this.canPlan();
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
   * @param {ServiceRequestEditorKind} kind - Explicit workflow action.
   *
   * @returns {void} Result owned by the request workflow.
   */
  protected open(kind: ServiceRequestEditorKind): void {
    const request = this.current();
    if (!request || this.busy() || !this.online() || !this.allowed(kind, request)) return;
    this.store.clearWrite();
    this.latest.set(null);
    this.editing.set(request);
    this.kind.set(kind);
    this.editorVisible.set(true);
  }
  /**
   * Method update
   *
   * @description
   * Submits editable description against the captured request revision.
   *
   * @access protected
   * @since unreleased
   *
   * @param {CreateServiceRequestInput} data - Validated description fields.
   *
   * @returns {void} Result owned by the request workflow.
   */
  protected update(data: CreateServiceRequestInput): void {
    const request = this.editing();
    if (
      !request ||
      !this.online() ||
      !this.store.commandsReady() ||
      !!this.retainedConversion() ||
      this.store.writeCallState().status === 'pending' ||
      !this.allowed('update', request)
    )
      return;
    this.store.write({
      kind: 'update',
      organizationId: this.organizationId(),
      request,
      input: { title: data.title, description: data.description, priority: data.priority },
    });
  }
  /**
   * Method act
   *
   * @description
   * Builds the chosen explicit command; conversion uses only real existing work identities.
   *
   * @access protected
   * @since unreleased
   *
   * @param {ServiceRequestActionIntent} intent - Validated explicit form intent.
   *
   * @returns {void} Result owned by the request workflow.
   */
  protected act(intent: ServiceRequestActionIntent): void {
    const request = this.editing();
    if (
      !request ||
      !this.online() ||
      !this.store.commandsReady() ||
      !!this.retainedConversion() ||
      this.store.writeCallState().status === 'pending' ||
      !this.allowed(intent.kind, request)
    )
      return;
    if (intent.kind === 'convert') {
      this.store.write({
        kind: 'convert',
        organizationId: this.organizationId(),
        request,
        input: {
          clientOperationId: crypto.randomUUID(),
          ...(intent.existingWork
            ? {
                existingInterventionId: intent.existingWork.interventionId,
                existingTaskId: intent.existingWork.workItemId,
              }
            : {}),
        },
      });
    } else if (intent.kind === 'qualify')
      this.store.write({
        kind: 'qualify',
        organizationId: this.organizationId(),
        request,
        input: intent.input,
      });
    else
      this.store.write({
        kind: intent.kind,
        organizationId: this.organizationId(),
        request,
        input: intent.input,
      });
  }
  /**
   * Method retryConversion
   *
   * @description
   * Replays the exact retained conversion revision and payload after an uncertain response.
   *
   * @access protected
   * @since unreleased
   *
   * @returns {void} Result owned by the request workflow.
   */
  protected retryConversion(): void {
    const command = this.store.conversionCommand();
    if (!command) return;
    if (
      command.organizationId === this.organizationId() &&
      command.request.id === this.requestId() &&
      this.store.commandsReady() &&
      this.store.writeCallState().status !== 'pending' &&
      this.online() &&
      this.canManage()
    )
      this.store.write(command);
  }
  /**
   * Method review
   *
   * @description
   * Reads the latest server projection without automatically adopting its revision.
   *
   * @access protected
   * @since unreleased
   *
   * @returns {void} Result owned by the request workflow.
   */
  protected review(): void {
    if (!this.canRead() || !this.online() || !this.conflict()) return;
    this.latest.set(null);
    this.reviewing.set(true);
    this.store.read({ organizationId: this.organizationId(), requestId: this.requestId() });
  }
  /**
   * Method acceptRevision
   *
   * @description
   * Adopts the explicitly reviewed revision only if it still allows the prepared action.
   *
   * @access protected
   * @since unreleased
   *
   * @returns {void} Result owned by the request workflow.
   */
  protected acceptRevision(): void {
    const latest = this.latest();
    if (!latest || !this.canAcceptLatest() || this.store.conversionUncertain()) return;
    this.editing.set(latest);
    this.store.clearWrite();
    this.latest.set(null);
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
    if (this.canRead() && this.online())
      this.store.read({ organizationId: this.organizationId(), requestId: this.requestId() });
  }
  /**
   * Method retryWork
   *
   * @description
   * Retries the authorized open corrective-work projection for the captured equipment.
   *
   * @access protected
   * @since unreleased
   *
   * @returns {void} Result owned by the request workflow.
   */
  protected retryWork(): void {
    const request = this.editing();
    if (request?.equipmentId && this.canReadWork() && this.online())
      this.targets.loadOpenWork({
        organizationId: this.organizationId(),
        equipmentId: request.equipmentId,
      });
  }
  //#endregion
}
