import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  signal,
  type InputSignal,
  type Signal,
  type TemplateRef,
  type WritableSignal,
  untracked,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCircleAlert,
  lucideGauge,
  lucideLock,
  lucideMailPlus,
  lucideMailQuestion,
  lucideSearch,
  lucideTrash2,
  lucideUserCheck,
  lucideUsersRound,
  lucideX,
} from '@ng-icons/lucide';
import type { BrnDialogState } from '@spartan-ng/brain/dialog';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { PageActionsService, registerPageActions } from '@core/page-actions';
import { PageTabsService, registerPageTabs } from '@core/page-tabs';
import type { CallState, CallStatus, StoreError } from '@core/request-state';
import { OrganizationPermissionService } from '@features/organization/access';
import {
  ORGANIZATION_PERMISSION,
  ORGANIZATION_QUOTA_RESOURCE,
  type InviteOrganizationMemberInput,
  type OrganizationInvitationOutput,
  type OrganizationMemberListSort,
  type OrganizationMemberOutput,
  type OrganizationMemberSortField,
  type OrganizationMemberStatusFilter,
  type OrganizationQuotaItemOutput,
} from '@features/organization/models';
import {
  REGIONAL_FORMATTING_PORT,
  type RegionalFormattingPort,
} from '@features/organization/ports';
import {
  OrganizationMemberListPreferencesService,
  SubmissionGateService,
  type SubmissionGate,
} from '@features/organization/services';
import {
  OrganizationQuotaStore,
  type OrganizationQuotaStoreType,
} from '@features/organization/state';
import {
  INVITATIONS_PAGE_SIZE,
  MEMBERS_PAGE_SIZE,
  OrganizationMembersStore,
} from '@features/organization/state/organization-members';
import { StatTile } from '@features/organization/ui/components';
import { CollectionPagination } from '@shared/collection-pagination';
import { CollectionSearchBox, CollectionToolbar } from '@shared/collection-toolbar';
import type { RegionalFormatSettings } from '@shared/regional-format';
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmButton } from '@shared/ui/button';
import { HlmCardTitle } from '@shared/ui/card';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmSelectImports } from '@shared/ui/select';
import { HlmTabsImports } from '@shared/ui/tabs';
import { HlmToggleGroupImports } from '@shared/ui/toggle-group';
import { OrganizationInvitationRevokeDialog } from '../../dialogs/organization-invitation-revoke-dialog';
import { OrganizationInviteDialog } from '../../dialogs/organization-invite-dialog';
import { OrganizationMemberRemoveDialog } from '../../dialogs/organization-member-remove-dialog';
import {
  OrganizationMemberRolesDialog,
  type OrganizationMemberRoleToggle,
} from '../../dialogs/organization-member-roles-dialog';
import { OrganizationInvitationTable } from '../../tables/organization-invitation-table';
import { OrganizationMemberTable } from '../../tables/organization-member-table';
import { OrganizationTeamPage } from '../organization-team-page/organization-team-page.component';
import { OrganizationTeamsPage } from '../organization-teams-page/organization-teams-page.component';

/** How long typing settles before the roster search reaches the wire. */
const SEARCH_DEBOUNCE_MS: number = 300;

/**
 * Type OrganizationMembersTabId
 *
 * @description
 * The three tabs `OrganizationMembersPage` hosts: the roster itself, the
 * absorbed "Roles & permissions" (`OrganizationTeamPage`) and "Teams"
 * (`OrganizationTeamsPage`) surfaces.
 *
 * @since 2.0.0
 */
type OrganizationMembersTabId = 'members' | 'roles' | 'teams';

/** The rail tabs, as a runtime set — `?tab=` arrives as an unvalidated string. */
const MEMBERS_TAB_IDS: ReadonlySet<string> = new Set<string>(['members', 'roles', 'teams']);

/**
 * Function isOrganizationMembersTabId
 *
 * @description
 * Narrows an untrusted string — a query param, or `hlm-tabs`' plain-string
 * `tabActivated` payload — to a known tab id.
 *
 * @access private
 * @since 2.0.0
 *
 * @param {string | undefined} value - The candidate tab id.
 *
 * @returns {boolean} Whether the value names one of the three tabs.
 */
function isOrganizationMembersTabId(value: string | undefined): value is OrganizationMembersTabId {
  return value !== undefined && MEMBERS_TAB_IDS.has(value);
}

/**
 * Type OrganizationMembersKpiTile
 *
 * @description
 * View-model for one `app-stat-tile` in the page's KPI row.
 *
 * @since 1.1.0
 */
type OrganizationMembersKpiTile = {
  readonly id: string;
  readonly label: string;
  readonly value: string | number;
  readonly icon: string;
  readonly progress: number | null;
  readonly loading: boolean;
};

/**
 * Component OrganizationMembersPage
 * @class OrganizationMembersPage
 *
 * @description
 * Route entry page for `/organizations/:organizationId/members`, now the
 * single people-management surface: three tabs, `?tab=`-addressable
 * (`members` default, `roles`, `teams`), following the same
 * `linkedSignal`-seeded, param-mirroring pattern as
 * `InterventionDetailPage`'s header tabs. The absorbed `OrganizationTeamPage`
 * ("Roles & permissions", the retired `/team`) and `OrganizationTeamsPage`
 * ("Teams", the retired `/teams`) are mounted as-is inside
 * `hlmTabsContentLazy` panels rather than inlined — each keeps its own
 * component-scoped store and page actions (`ARCHITECTURE.md` §10.2's
 * "smallest useful shape"; this page does not absorb their business logic).
 *
 * **Per-tab permissions.** The `members` route now opens on the union of
 * every tab's read permission (`match: 'any'` over `members.read`,
 * `members.manage`, `roles.read`, `roles.manage`, `teams.read`) rather than
 * `members.*` alone — a member who can reach the page at all might hold
 * only one of the three tabs' permissions. {@link canViewMembersTab},
 * {@link canViewRolesTab} and {@link canViewTeamsTab} gate each trigger and
 * panel individually, and {@link activeTab} never resolves to a tab the
 * acting member cannot see: an unauthorized or unrecognized `?tab=` falls
 * back to the first permitted tab in `members` → `roles` → `teams` order.
 *
 * The `members` tab itself renders a KPI row, then two stacked sections
 * built like this codebase's other permission-aware list pages
 * (`InterventionsPage`) — the members grid with search, a status filter,
 * bulk selection and a confirm-gated remove, and the pending-invitations
 * grid underneath, both fed by one component-scoped `OrganizationMembersStore`.
 *
 * It owns what its tables must not — which resources load
 * (`OrganizationMembersLoadOptions` is built from four independent backend
 * permissions: `organization.members.read` for the roster,
 * `organization.members.manage` for invitations and their write actions,
 * `organization.roles.read` for the role catalog and `organization.roles.manage`
 * for role assignment — assigning a role is not gated by `members.manage`,
 * it is a distinct permission the backend checks on its own endpoint), the
 * members page window, the invite/role-assignment dialogs and the
 * remove/revoke confirmations (`ARCHITECTURE.md` §10.5).
 *
 * The store exposes one shared `mutationCallState` across every write
 * action, so a stale error from an earlier action must never leak into a
 * dialog opened afterwards: the invite dialog, the remove confirmation and
 * the revoke confirmation each hold their own `SubmissionGate` over it, and
 * the page-level banner clears itself the moment a new error lands and
 * hides while any of them is showing its own copy.
 *
 * The roster's search and status filter are server-side: a debounced search
 * keystroke and an immediate status change both re-issue
 * `OrganizationMembersStore.loadMembers` on page one, which is also what the
 * "N of M shown" line and the KPI row's own "Total members" tile then
 * reflect. `OrganizationQuotaStore` (root-provided) supplies the "Seats
 * used" tile's used/limit reading, shared with the settings Usage tab.
 *
 * Its title lives in the shell's own `DashboardPageHeader`; this page
 * renders no title band of its own. `app-organization-page-header` is
 * retired — {@link subtitle}'s member count stays as a lead line at content
 * top, the primary tabs register beneath the title through `PageTabsService`,
 * and "Invite member" registers on the shell header through
 * `PageActionsService`, gated to the `members` tab being active — the
 * absorbed pages' own action buttons (New role, New team) take over the
 * slot the same way while their tab is active, since `hlmTabsContentLazy`
 * keeps all three mounted after their first activation.
 *
 * @version 2.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-members-page',
  imports: [
    NgIcon,
    ...HlmEmptyImports,
    HlmCardTitle,
    HlmButton,
    CollectionPagination,
    CollectionSearchBox,
    ...HlmSelectImports,
    CollectionToolbar,
    OrganizationInvitationRevokeDialog,
    OrganizationInvitationTable,
    OrganizationInviteDialog,
    OrganizationMemberRemoveDialog,
    OrganizationMemberRolesDialog,
    OrganizationMemberTable,
    OrganizationTeamPage,
    OrganizationTeamsPage,
    StatTile,
    ...HlmAlertImports,
    ...HlmTabsImports,
    ...HlmToggleGroupImports,
  ],
  providers: [
    OrganizationMembersStore,
    provideIcons({
      lucideLock,
      lucideCircleAlert,
      lucideGauge,
      lucideMailPlus,
      lucideMailQuestion,
      lucideSearch,
      lucideTrash2,
      lucideUserCheck,
      lucideUsersRound,
      lucideX,
    }),
  ],
  templateUrl: './organization-members-page.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationMembersPage {
  //#region Inputs
  /**
   * Property organizationId
   * @readonly
   * @description The workspace whose members are listed, bound from the route.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input.required<string>();

  /**
   * Property roleIdParam
   * @readonly
   *
   * @description
   * The `?roleId=` the URL arrived with. It is what makes "who holds this role"
   * answerable: the backend has always served the filter, and until now no
   * caller sent it, so a role card in `/team` led nowhere and the roster could
   * not be narrowed to one role at all.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly roleIdParam: InputSignal<string | undefined> = input<string | undefined>(
    undefined,
    { alias: 'roleId' },
  );

  /**
   * Property tab
   * @readonly
   * @description Which tab the URL asks for (`?tab=`), bound through `withComponentInputBinding()`. `undefined` and any unrecognized or unauthorized value resolve to {@link activeTab}'s fallback.
   * @access public
   * @since 2.0.0
   * @type {InputSignal<string | undefined>}
   */
  public readonly tab: InputSignal<string | undefined> = input<string | undefined>(undefined);

  /** Whether the last list read was refused for lack of permission, which a retry cannot fix. */
  protected readonly listForbidden: Signal<boolean> = computed<boolean>(
    () => this.store.loadCallState().error?.code === 403,
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

  /** The members/invitations workflow store, scoped to this page. */
  protected readonly store: OrganizationMembersStore =
    inject<OrganizationMembersStore>(OrganizationMembersStore);

  /** Organization permission checks gating every write action this page offers. */
  private readonly permissions: OrganizationPermissionService = inject(
    OrganizationPermissionService,
  );

  /** Builds the per-surface claims on the store's one shared `mutationCallState`. */
  private readonly submissionGates: SubmissionGateService =
    inject<SubmissionGateService>(SubmissionGateService);

  /** The cookie-backed memory of how the roster was last ordered. */
  private readonly preferences: OrganizationMemberListPreferencesService =
    inject<OrganizationMemberListPreferencesService>(OrganizationMemberListPreferencesService);

  /**
   * Property quotaStore
   * @readonly
   * @description Root-provided quota usage, read here only for the "Seats used" KPI tile (shared with the settings Usage tab).
   * @access protected
   * @since 1.1.0
   * @type {OrganizationQuotaStoreType}
   */
  protected readonly quotaStore: OrganizationQuotaStoreType =
    inject<OrganizationQuotaStoreType>(OrganizationQuotaStore);

  /** Registers {@link pageActions} on the shell header. */
  private readonly pageActionsService: PageActionsService = inject(PageActionsService);

  /** The "Invite member" button, registered on the shell header instead of an in-page title band. */
  private readonly pageActions: Signal<TemplateRef<unknown> | undefined> =
    viewChild<TemplateRef<unknown>>('pageActions');

  /**
   * Property pageTabsService
   * @readonly
   *
   * @description
   * Shell registry receiving the primary people-management tabs.
   *
   * @access private
   * @since 2.0.0
   *
   * @type {PageTabsService}
   */
  private readonly pageTabsService: PageTabsService = inject(PageTabsService);

  /**
   * Property pageTabs
   * @readonly
   *
   * @description
   * Native Spartan line tabs projected beneath the dashboard page title.
   *
   * @access private
   * @since 2.0.0
   *
   * @type {Signal<TemplateRef<unknown> | undefined>}
   */
  private readonly pageTabs: Signal<TemplateRef<unknown> | undefined> =
    viewChild<TemplateRef<unknown>>('pageTabs');

  /** Currently selected member ids, scoped to the loaded page — cleared on every reload. */
  protected readonly selectedIds: WritableSignal<ReadonlySet<string>> = signal<ReadonlySet<string>>(
    new Set<string>(),
  );

  /** The members page window, one-based. */
  protected readonly page: WritableSignal<number> = signal<number>(1);

  /** How many roster rows a page holds, from the pagination band's rows-per-page select. */
  protected readonly pageSize: WritableSignal<number> = signal<number>(MEMBERS_PAGE_SIZE);

  /** Writes the role narrowing back into the URL. */
  private readonly router: Router = inject<Router>(Router);

  /** The route the role narrowing is written relative to. */
  private readonly route: ActivatedRoute = inject<ActivatedRoute>(ActivatedRoute);

  /** What the roster search box holds; debounced before it reaches the wire. */
  protected readonly searchTerm: WritableSignal<string> = signal<string>('');

  /** The roster's active status filter. */
  protected readonly statusFilter: WritableSignal<OrganizationMemberStatusFilter> =
    signal<OrganizationMemberStatusFilter>('all');

  /**
   * Property selectionMode
   * @readonly
   * @description Whether the compact card layout offers its selection checkboxes — a mode below `sm`, never a permanent column.
   * @access protected
   * @since 2.0.0
   * @type {WritableSignal<boolean>}
   */
  protected readonly selectionMode: WritableSignal<boolean> = signal<boolean>(false);

  /** The role the roster is narrowed to, or `null` for everyone. */
  protected readonly roleFilter: WritableSignal<string | null> = signal<string | null>(null);

  /**
   * Property sortOrder
   * @readonly
   * @description The roster's active ordering, restored from the preferences cookie.
   * @access protected
   * @since 1.5.0
   * @type {WritableSignal<OrganizationMemberListSort>}
   */
  protected readonly sortOrder: WritableSignal<OrganizationMemberListSort> =
    signal<OrganizationMemberListSort>(this.preferences.readSort());

  /** The pending-invitations page window, one-based. */
  protected readonly invitationsPage: WritableSignal<number> = signal<number>(1);

  /** Rows per invitations page — fixed; the section offers no rows-per-page choice. */
  protected readonly invitationsPageSize: number = INVITATIONS_PAGE_SIZE;

  /** Whether the invite dialog is open. */
  protected readonly inviteDialogVisible: WritableSignal<boolean> = signal<boolean>(false);

  /** The invite dialog's claim on the shared mutation state, closing it once its own invite lands. */
  private readonly inviteGate: SubmissionGate = this.submissionGates.create(
    this.store.mutationCallState,
    { onSuccess: (): void => this.inviteDialogVisible.set(false) },
  );

  /** The member id the role-assignment dialog is currently open for, or `null` when closed. */
  protected readonly rolesDialogMemberId: WritableSignal<string | null> = signal<string | null>(
    null,
  );

  /** The member a row's menu asked to remove, pending confirmation. */
  protected readonly pendingRemove: WritableSignal<OrganizationMemberOutput | null> =
    signal<OrganizationMemberOutput | null>(null);

  /** The selected ids the toolbar asked to bulk-remove, pending confirmation. */
  protected readonly pendingBulkRemoveIds: WritableSignal<ReadonlyArray<string> | null> =
    signal<ReadonlyArray<string> | null>(null);

  /** The remove-confirm dialog's own claim, clearing its pending target once its own removal lands. */
  private readonly removeGate: SubmissionGate = this.submissionGates.create(
    this.store.mutationCallState,
    {
      onSuccess: (): void => {
        this.pendingRemove.set(null);
        this.pendingBulkRemoveIds.set(null);
      },
    },
  );

  /** The invitation a row's menu asked to revoke, pending confirmation. */
  protected readonly pendingRevoke: WritableSignal<OrganizationInvitationOutput | null> =
    signal<OrganizationInvitationOutput | null>(null);

  /** The revoke-confirm dialog's own claim, clearing its pending target once its own revoke lands. */
  private readonly revokeGate: SubmissionGate = this.submissionGates.create(
    this.store.mutationCallState,
    { onSuccess: (): void => this.pendingRevoke.set(null) },
  );

  /** Whether the page-level action-error banner was dismissed for the error currently in state. */
  private readonly actionErrorDismissed: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property canReadMembers
   * @readonly
   * @description Whether the roster may be loaded and shown at all (`organization.members.read`).
   * @access protected
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  protected readonly canReadMembers: Signal<boolean> = computed<boolean>(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.MEMBERS_READ),
  );

  /**
   * Property canManageMembers
   * @readonly
   * @description Whether invitations, invite/resend/revoke and member removal may render (`organization.members.manage`).
   * @access protected
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  protected readonly canManageMembers: Signal<boolean> = computed<boolean>(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.MEMBERS_MANAGE),
  );

  /**
   * Property canReadRoles
   * @readonly
   * @description Whether the role catalog may be loaded (`organization.roles.read`), needed for the role badges' source data and the assignment dialog.
   * @access protected
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  protected readonly canReadRoles: Signal<boolean> = computed<boolean>(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.ROLES_READ),
  );

  /**
   * Property canManageRoles
   * @readonly
   * @description Whether role assignment may render at all (`organization.roles.manage` — distinct from `members.manage`).
   * @access protected
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  protected readonly canManageRoles: Signal<boolean> = computed<boolean>(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.ROLES_MANAGE),
  );

  /** Whether the `members` tab may render — `organization.members.read` or `.manage`. */
  protected readonly canViewMembersTab: Signal<boolean> = computed<boolean>(
    () => this.canReadMembers() || this.canManageMembers(),
  );

  /** Whether the `roles` tab (the absorbed `OrganizationTeamPage`) may render — `organization.roles.read` or `.manage`. */
  protected readonly canViewRolesTab: Signal<boolean> = computed<boolean>(
    () => this.canReadRoles() || this.canManageRoles(),
  );

  /** Whether the `teams` tab (the absorbed `OrganizationTeamsPage`) may render — `organization.teams.read`. */
  protected readonly canViewTeamsTab: Signal<boolean> = computed<boolean>(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.TEAMS_READ),
  );

  /**
   * Property activeTab
   * @readonly
   *
   * @description
   * The showing tab, seeded from {@link tab} so the URL is the entry point.
   * An unrecognized or unauthorized request falls back to
   * {@link firstPermittedTab}, so `?tab=roles` sent to a member without
   * `organization.roles.*` never renders an empty panel. Writable so a
   * trigger click switches synchronously; every write goes through
   * {@link setActiveTab}, which mirrors it back to `?tab=`.
   *
   * @access protected
   * @since 2.0.0
   * @type {WritableSignal<OrganizationMembersTabId>}
   */
  protected readonly activeTab: WritableSignal<OrganizationMembersTabId> =
    linkedSignal<OrganizationMembersTabId>((): OrganizationMembersTabId => {
      const requested: string | undefined = this.tab();

      return isOrganizationMembersTabId(requested) && this.isTabPermitted(requested)
        ? requested
        : this.firstPermittedTab();
    });

  /**
   * Property membersPageCount
   * @readonly
   * @description How many member pages the current total spans, at least one.
   * @access protected
   * @since 1.0.0
   * @type {Signal<number>}
   */
  protected readonly membersPageCount: Signal<number> = computed<number>(() =>
    Math.max(1, Math.ceil(this.store.membersTotal() / this.pageSize())),
  );

  /**
   * Property invitationsPageCount
   * @readonly
   * @description How many invitation pages the current total spans, at least one.
   * @access protected
   * @since 1.4.0
   * @type {Signal<number>}
   */
  protected readonly invitationsPageCount: Signal<number> = computed<number>(() =>
    Math.max(1, Math.ceil(this.store.invitationsTotal() / this.invitationsPageSize)),
  );

  /** Where a member row's link points. */
  protected readonly memberDetailRouteBase: Signal<readonly string[]> = computed<readonly string[]>(
    () => ['/organizations', this.organizationId(), 'members'],
  );

  /** The header's count line, naming how many members the organization has. */
  protected readonly subtitle: Signal<string> = computed<string>(() => {
    const total: number = this.store.membersTotal();

    return total === 1
      ? $localize`:@@org.members.countOne:1 member`
      : $localize`:@@org.members.countMany:${total}:count: members`;
  });

  /**
   * Property membersQuotaItem
   * @readonly
   * @description The organization's `members` quota usage, `null` while it has not resolved.
   * @access protected
   * @since 1.1.0
   * @type {Signal<OrganizationQuotaItemOutput | null>}
   */
  protected readonly membersQuotaItem: Signal<OrganizationQuotaItemOutput | null> = computed(
    (): OrganizationQuotaItemOutput | null =>
      this.quotaStore
        .items()
        .find((item) => item.resource === ORGANIZATION_QUOTA_RESOURCE.MEMBERS) ?? null,
  );

  /**
   * Property kpiTiles
   * @readonly
   *
   * @description
   * The KPI row's view-models: the roster's total and active-membership
   * counts, the pending-invitation count, and the plan's seat usage.
   * "Total members" reads {@link OrganizationMembersStore.membersTotal},
   * which reflects the roster's own search/status filter by design; "Active"
   * is the fixed organization-wide count `load` fetches once, so it stays
   * meaningful even while the roster below is filtered to `inactive`.
   *
   * @access protected
   * @since 1.1.0
   * @type {Signal<readonly OrganizationMembersKpiTile[]>}
   */
  protected readonly kpiTiles: Signal<readonly OrganizationMembersKpiTile[]> = computed(() => {
    const quotaItem: OrganizationQuotaItemOutput | null = this.membersQuotaItem();
    const seatsValue: string | number =
      quotaItem === null
        ? '—'
        : quotaItem.limit === null
          ? quotaItem.used
          : `${quotaItem.used} / ${quotaItem.limit}`;
    const seatsProgress: number | null =
      quotaItem !== null && quotaItem.limit !== null && quotaItem.limit > 0
        ? Math.min(100, Math.round((quotaItem.used / quotaItem.limit) * 100))
        : null;

    return [
      {
        id: 'total',
        label: $localize`:@@org.members.kpi.total:Total members`,
        value: this.store.membersTotal(),
        icon: 'lucideUsersRound',
        progress: null,
        loading: this.store.isLoading(),
      },
      {
        id: 'active',
        label: $localize`:@@org.members.kpi.active:Active`,
        value: this.store.membersActiveTotal(),
        icon: 'lucideUserCheck',
        progress: null,
        loading: this.store.isLoading(),
      },
      {
        id: 'pending-invitations',
        label: $localize`:@@org.members.kpi.pendingInvitations:Pending invitations`,
        value: this.store.activeInvitations().length,
        icon: 'lucideMailQuestion',
        progress: null,
        loading: this.store.isLoading(),
      },
      {
        id: 'seats-used',
        label: $localize`:@@org.members.kpi.seatsUsed:Seats used`,
        value: seatsValue,
        icon: 'lucideGauge',
        progress: seatsProgress,
        loading: this.quotaStore.isLoadingQuota(),
      },
    ];
  });

  /**
   * Property rosterHeading
   * @readonly
   * @description The roster section's heading, naming how many rows the current search/status filter matches.
   * @access protected
   * @since 1.1.0
   * @type {Signal<string>}
   */
  protected readonly rosterHeading: Signal<string> = computed<string>(() => {
    const total: number = this.store.membersTotal();

    return $localize`:@@org.members.rosterHeadingCount:Roster (${total}:count:)`;
  });

  /**
   * Property pendingInvitationsHeading
   * @readonly
   * @description The pending-invitations section's heading, naming how many are outstanding.
   * @access protected
   * @since 1.1.0
   * @type {Signal<string>}
   */
  protected readonly pendingInvitationsHeading: Signal<string> = computed<string>(() => {
    const total: number = this.store.activeInvitations().length;

    return $localize`:@@org.invitations.headingCount:Pending invitations (${total}:count:)`;
  });

  /**
   * Property hasRosterFilters
   * @readonly
   * @description Whether the roster is currently narrowed by a search term or a non-default status, deciding what the empty state offers.
   * @access protected
   * @since 1.1.0
   * @type {Signal<boolean>}
   */
  protected readonly hasRosterFilters: Signal<boolean> = computed<boolean>(
    () =>
      this.searchTerm().trim() !== '' ||
      this.statusFilter() !== 'all' ||
      this.roleFilter() !== null,
  );

  /**
   * Property roleFilterLabelOf
   * @readonly
   *
   * @description
   * Resolves the role filter's transport value to reader-facing text for
   * the closed Spartan select trigger. A stale or not-yet-resolved role id
   * degrades to "Unknown role" so an internal UUID is never exposed while
   * roles load or after a bookmarked role has been removed.
   *
   * @access protected
   * @since 2.1.0
   * @type {(value: string) => string}
   */
  protected readonly roleFilterLabelOf: (value: string) => string = (value: string): string => {
    if (value === 'all') return $localize`:@@org.members.roleFilterAll:All roles`;

    return (
      this.store.roles().find((role): boolean => role.id === value)?.name ??
      $localize`:@@org.members.roleFilterUnknown:Unknown role`
    );
  };

  /** Fallback text for the action-error banner when the backend sent no message. */
  protected readonly actionErrorFallback: string = $localize`:@@org.members.actionErrorFallback:The action could not be completed.`;

  /** The action-error banner's heading. */
  protected readonly actionErrorTitle: string = $localize`:@@org.members.actionErrorTitle:Action failed`;

  /** The bulk-remove button's label, counting the current selection. */
  protected readonly bulkRemoveLabel: Signal<string> = computed<string>(
    () => $localize`:@@org.members.bulkRemoveButton:Remove (${this.selectedIds().size}:count:)`,
  );

  /** The member the role-assignment dialog is open for, resolved reactively so a toggle's own result is reflected immediately. */
  protected readonly rolesDialogMember: Signal<OrganizationMemberOutput | null> = computed(() => {
    const id: string | null = this.rolesDialogMemberId();

    return id === null ? null : (this.store.memberEntityMap()[id] ?? null);
  });

  /** The invite dialog's error banner, scoped to an invite actually attempted this session. */
  protected readonly inviteServerError: Signal<StoreError | null> = this.inviteGate.error;

  /** Whether the revoke-confirm dialog's own write is in flight — busy-disables its footer and blocks Escape/backdrop dismissal. */
  protected readonly revokeDialogBusy: Signal<boolean> = this.revokeGate.isBusy;

  /** The revoke-confirm dialog's own error, scoped to a revoke actually attempted this session — never a stale or unrelated mutation's failure. */
  protected readonly revokeDialogError: Signal<StoreError | null> = this.revokeGate.error;

  /**
   * Property actionError
   * @readonly
   * @description A resend/role-toggle mutation's error, shown as a page-level banner and hidden while the invite, remove-confirm or revoke-confirm dialog is showing its own copy.
   * @access protected
   * @since 1.0.0
   * @type {Signal<StoreError | null>}
   */
  protected readonly actionError: Signal<StoreError | null> = computed<StoreError | null>(() => {
    if (
      this.actionErrorDismissed() ||
      this.inviteDialogVisible() ||
      this.removeGate.isSubmitted() ||
      this.revokeGate.isSubmitted()
    )
      return null;

    const state: CallState<null, StoreError> = this.store.mutationCallState();

    return state.status === 'error' ? state.error : null;
  });

  /** The remove-confirm dialog's open/closed state, derived from whichever pending target is set. */
  protected readonly removeDialogState: Signal<BrnDialogState> = computed<BrnDialogState>(() =>
    this.pendingRemove() !== null || this.pendingBulkRemoveIds() !== null ? 'open' : 'closed',
  );

  /** Whether the remove-confirm dialog's own write is in flight — busy-disables its footer and blocks Escape/backdrop dismissal. */
  protected readonly removeDialogBusy: Signal<boolean> = this.removeGate.isBusy;

  /** The remove-confirm dialog's own error, scoped to a remove actually attempted this session — never a stale or unrelated mutation's failure. */
  protected readonly removeDialogError: Signal<StoreError | null> = this.removeGate.error;
  //#endregion

  //#region Constructor
  /**
   * Constructor
   *
   * @description
   * Wires the resource load (re-firing whenever the organization or the
   * resolved permissions change, and resetting the search/status filter with
   * it), the debounced roster search, the page-level error banner's
   * auto-reset, and registers {@link pageActions}.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    const destroyRef: DestroyRef = inject(DestroyRef);
    registerPageActions(this.pageActions, this.pageActionsService, destroyRef);
    registerPageTabs(this.pageTabs, this.pageTabsService, destroyRef);

    effect((): void => {
      const isActive: boolean = this.activeTab() === 'members';
      const template: TemplateRef<unknown> | undefined = this.pageActions();

      untracked((): void => {
        if (isActive && template) this.pageActionsService.register(template);
        else if (!isActive) this.pageActionsService.clear(template);
      });
    });

    effect((): void => {
      const organizationId: string = this.organizationId();
      const includeMembers: boolean = this.canReadMembers();
      const includeInvitations: boolean = this.canManageMembers();
      const includeRoles: boolean = this.canReadRoles();

      untracked((): void => {
        this.page.set(1);
        this.pageSize.set(MEMBERS_PAGE_SIZE);
        this.selectedIds.set(new Set<string>());
        this.searchTerm.set('');
        this.statusFilter.set('all');
        this.invitationsPage.set(1);

        const roleId: string | null = this.roleIdParam() ?? null;
        this.roleFilter.set(roleId);

        this.store.load({
          organizationId,
          includeMembers,
          includeInvitations,
          includeRoles,
          sort: this.sortOrder(),
          roleId,
        });
      });
    });

    toObservable(this.searchTerm)
      .pipe(debounceTime(SEARCH_DEBOUNCE_MS), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((term: string): void => {
        if (term !== untracked(this.store.membersSearch)) this.queryMembers(1);
      });

    effect((): void => {
      const status: CallStatus = this.store.mutationCallState().status;

      untracked((): void => {
        if (status === 'error') this.actionErrorDismissed.set(false);
      });
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method reload
   * @description Re-runs the initial load after a failure.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected reload(): void {
    this.invitationsPage.set(1);
    this.store.load({
      organizationId: this.organizationId(),
      includeMembers: this.canReadMembers(),
      includeInvitations: this.canManageMembers(),
      includeRoles: this.canReadRoles(),
      sort: this.sortOrder(),
    });
  }

  /**
   * Method goToMembersPage
   * @description Loads another members page, keeping the current search/status filter and leaving invitations and roles untouched.
   * @access protected
   * @since 1.0.0
   * @param {number} target - The requested one-based page.
   * @returns {void}
   */
  protected goToMembersPage(target: number): void {
    const clamped: number = Math.min(Math.max(1, target), this.membersPageCount());

    this.queryMembers(clamped);
  }

  /**
   * Method setPageSize
   * @description Changes how many roster rows a page holds and returns to the first page.
   * @access protected
   * @since 1.2.0
   * @param {number} size - The chosen page size.
   * @returns {void}
   */
  protected setPageSize(size: number): void {
    this.pageSize.set(size);
    this.queryMembers(1);
  }

  /**
   * Method onSearchQueryChanged
   * @description Records a keystroke into the debounced roster search.
   * @access protected
   * @since 1.4.0
   * @param {string} term - The search box's current value.
   * @returns {void}
   */
  protected onSearchQueryChanged(term: string): void {
    this.searchTerm.set(term);
  }

  /**
   * Method onStatusFilterChanged
   * @description Narrows `hlm-toggle-group`'s single/multi-select payload and re-queries the roster immediately — a discrete choice needs no debounce.
   * @access protected
   * @since 1.1.0
   * @param {string | readonly string[] | null | undefined} value - The toggle group's emitted value.
   * @returns {void}
   */
  protected onStatusFilterChanged(value: string | readonly string[] | null | undefined): void {
    const status: OrganizationMemberStatusFilter =
      value === 'active' || value === 'inactive' ? value : 'all';

    this.statusFilter.set(status);
    this.queryMembers(1);
  }

  /**
   * Method onRoleFilterChanged
   * @description Narrows the roster to one role, or widens it back to everyone, and records the choice in the URL.
   * @access protected
   * @since 2.0.0
   * @param {string | null | undefined} value - The chosen role id, or `all`.
   * @returns {void}
   */
  /**
   * Method toggleSelectionMode
   * @description Enters or leaves the compact selection mode, clearing the selection on the way out.
   * @access protected
   * @since 2.0.0
   * @returns {void}
   */
  protected toggleSelectionMode(): void {
    const next: boolean = !this.selectionMode();
    this.selectionMode.set(next);

    if (!next) this.selectedIds.set(new Set<string>());
  }

  protected onRoleFilterChanged(value: string | null | undefined): void {
    this.roleFilter.set(value === 'all' || !value ? null : value);
    this.writeRoleParam();
    this.queryMembers(1);
  }

  /**
   * Method clearRosterFilters
   * @description Drops the search term and returns the status filter to `all`.
   * @access protected
   * @since 1.1.0
   * @returns {void}
   */
  protected clearRosterFilters(): void {
    this.searchTerm.set('');
    this.statusFilter.set('all');
    this.roleFilter.set(null);
    this.writeRoleParam();
    this.queryMembers(1);
  }

  /**
   * Method onTabActivated
   * @description Narrows `hlm-tabs`' plain-string `tabActivated` payload before writing {@link activeTab}, ignoring a request for a tab the acting member cannot see.
   * @access protected
   * @since 2.0.0
   * @param {string} tabId - The `hlm-tabs` id that just activated.
   * @returns {void}
   */
  protected onTabActivated(tabId: string): void {
    if (isOrganizationMembersTabId(tabId) && this.isTabPermitted(tabId)) this.setActiveTab(tabId);
  }

  /**
   * Method writeRoleParam
   * @description Mirrors the role narrowing into `?roleId=`, so the narrowed roster survives a reload and can be sent to a colleague.
   * @access private
   * @since 2.0.0
   * @returns {void}
   */
  private writeRoleParam(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { roleId: this.roleFilter() },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  /**
   * Method applySortField
   *
   * @description
   * Orders the roster by a column head. Re-picking the active field reverses
   * it, which is what a second click on a sorted column means everywhere
   * else in this codebase (`EquipmentsPage`). Persists the choice to
   * {@link preferences} and resets to the first page like every other
   * roster-narrowing entry point.
   *
   * @access protected
   * @since 1.5.0
   *
   * @param {OrganizationMemberSortField} field - The column's field.
   *
   * @returns {void}
   */
  protected applySortField(field: OrganizationMemberSortField): void {
    this.sortOrder.update((current: OrganizationMemberListSort) =>
      current.field === field
        ? { field, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { field, direction: current.direction },
    );
    this.preferences.write(this.sortOrder());
    this.queryMembers(1);
  }

  /**
   * Method goToInvitationsPage
   * @description Loads another pending-invitations page.
   * @access protected
   * @since 1.5.0
   * @param {number} target - The requested one-based page.
   * @returns {void}
   */
  protected goToInvitationsPage(target: number): void {
    const clamped: number = Math.min(Math.max(1, target), this.invitationsPageCount());

    this.invitationsPage.set(clamped);
    this.store.loadInvitations({
      organizationId: this.organizationId(),
      page: clamped,
      pageSize: this.invitationsPageSize,
    });
  }

  /**
   * Method onSelectionChanged
   * @description Records the members table's next row selection.
   * @access protected
   * @since 1.0.0
   * @param {ReadonlySet<string>} ids - The full next selection.
   * @returns {void}
   */
  protected onSelectionChanged(ids: ReadonlySet<string>): void {
    this.selectedIds.set(ids);
  }

  /**
   * Method openInviteDialog
   * @description Opens the invite dialog for a fresh session.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected openInviteDialog(): void {
    this.inviteGate.reset();
    this.inviteDialogVisible.set(true);
  }

  /**
   * Method onInviteDialogVisibleChange
   * @description Keeps the dialog's error scope in sync with whether it is actually open.
   * @access protected
   * @since 1.0.0
   * @param {boolean} visible - The dialog's next visibility.
   * @returns {void}
   */
  protected onInviteDialogVisibleChange(visible: boolean): void {
    this.inviteDialogVisible.set(visible);
    if (!visible) this.inviteGate.reset();
  }

  /**
   * Method sendInvite
   * @description Hands the form's values to the store. The dialog closes itself once the shared mutation state reports success.
   * @access protected
   * @since 1.0.0
   * @param {InviteOrganizationMemberInput} payload - The validated invite payload.
   * @returns {void}
   */
  protected sendInvite(payload: InviteOrganizationMemberInput): void {
    this.inviteGate.submit();
    this.store.invite({ organizationId: this.organizationId(), input: payload });
  }

  /**
   * Method openRolesDialog
   * @description Opens the role-assignment dialog for a member.
   * @access protected
   * @since 1.0.0
   * @param {OrganizationMemberOutput} member - The row's member.
   * @returns {void}
   */
  protected openRolesDialog(member: OrganizationMemberOutput): void {
    this.rolesDialogMemberId.set(member.id);
  }

  /**
   * Method onRolesDialogVisibleChange
   * @description Closes the role-assignment dialog.
   * @access protected
   * @since 1.0.0
   * @param {boolean} visible - The dialog's next visibility.
   * @returns {void}
   */
  protected onRolesDialogVisibleChange(visible: boolean): void {
    if (!visible) this.rolesDialogMemberId.set(null);
  }

  /**
   * Method onRoleToggled
   * @description Assigns or removes the toggled role for the dialog's current member.
   * @access protected
   * @since 1.0.0
   * @param {OrganizationMemberRoleToggle} toggle - Which role, and the requested next state.
   * @returns {void}
   */
  protected onRoleToggled(toggle: OrganizationMemberRoleToggle): void {
    const memberId: string | null = this.rolesDialogMemberId();
    if (memberId === null) return;

    if (toggle.assign) {
      this.store.assignRole({
        organizationId: this.organizationId(),
        memberId,
        input: { roleId: toggle.roleId },
      });
    } else {
      this.store.removeRoleFromMember({
        organizationId: this.organizationId(),
        memberId,
        roleId: toggle.roleId,
      });
    }
  }

  /**
   * Method reactivateMember
   * @description Reactivates an inactive member. No confirm step — unlike Remove, reactivation is not destructive, so the store call fires directly from the row menu.
   * @access protected
   * @since 1.7.0
   * @param {OrganizationMemberOutput} member - The row's member.
   * @returns {void}
   */
  protected reactivateMember(member: OrganizationMemberOutput): void {
    this.store.reactivateMember({ organizationId: this.organizationId(), memberId: member.id });
  }

  /**
   * Method requestRemove
   * @description Opens the confirm dialog for a single row's Remove entry.
   * @access protected
   * @since 1.0.0
   * @param {OrganizationMemberOutput} member - The row's member.
   * @returns {void}
   */
  protected requestRemove(member: OrganizationMemberOutput): void {
    this.removeGate.reset();
    this.pendingRemove.set(member);
  }

  /**
   * Method requestBulkRemove
   * @description Opens the confirm dialog for the current selection. A no-op when nothing is selected.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected requestBulkRemove(): void {
    const ids: ReadonlyArray<string> = [...this.selectedIds()];

    if (ids.length === 0) return;

    this.removeGate.reset();
    this.pendingBulkRemoveIds.set(ids);
  }

  /**
   * Method confirmRemove
   *
   * @description
   * Sends the pending target(s) to the store. The dialog stays open,
   * busy-disabled, until `mutationCallState` settles — the constructor
   * effect closes it on success; a failure surfaces inline via
   * {@link removeDialogError} instead of closing under the operator.
   *
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected confirmRemove(): void {
    const single: OrganizationMemberOutput | null = this.pendingRemove();
    const bulkIds: ReadonlyArray<string> | null = this.pendingBulkRemoveIds();
    if (single === null && bulkIds === null) return;

    this.removeGate.submit();

    if (single) {
      this.store.removeMember({ organizationId: this.organizationId(), memberId: single.id });

      return;
    }

    if (bulkIds) {
      this.store.removeMembers({ organizationId: this.organizationId(), memberIds: bulkIds });
      this.selectedIds.set(new Set<string>());
    }
  }

  /**
   * Method onRemoveDialogVisibleChange
   * @description Clears both pending-remove signals on any dismissal — Cancel, the backdrop or Escape.
   * @access protected
   * @since 1.0.0
   * @param {boolean} visible - The dialog's next visibility.
   * @returns {void}
   */
  protected onRemoveDialogVisibleChange(visible: boolean): void {
    if (visible) return;

    this.pendingRemove.set(null);
    this.pendingBulkRemoveIds.set(null);
    this.removeGate.reset();
  }

  /**
   * Method copyInvitationLink
   * @description Puts an invitation's accept link on the clipboard.
   * @access protected
   * @since 1.0.0
   * @param {string} link - The accept link.
   * @returns {void}
   */
  protected copyInvitationLink(link: string): void {
    void navigator.clipboard?.writeText(link);
  }

  /**
   * Method resendInvitation
   * @description Resends an invitation, regenerating its accept link.
   * @access protected
   * @since 1.0.0
   * @param {OrganizationInvitationOutput} invitation - The row's invitation.
   * @returns {void}
   */
  protected resendInvitation(invitation: OrganizationInvitationOutput): void {
    this.store.resendInvitation({
      organizationId: this.organizationId(),
      invitationId: invitation.id,
    });
  }

  /**
   * Method requestRevoke
   * @description Opens the confirm dialog for a row's Revoke entry.
   * @access protected
   * @since 1.0.0
   * @param {OrganizationInvitationOutput} invitation - The row's invitation.
   * @returns {void}
   */
  protected requestRevoke(invitation: OrganizationInvitationOutput): void {
    this.revokeGate.reset();
    this.pendingRevoke.set(invitation);
  }

  /**
   * Method confirmRevoke
   *
   * @description
   * Sends the pending invitation to the store. The dialog stays open,
   * busy-disabled, until `mutationCallState` settles — the gate's own
   * success watcher closes it; a failure surfaces inline via
   * {@link revokeDialogError} instead of closing under the operator.
   *
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected confirmRevoke(): void {
    const invitation: OrganizationInvitationOutput | null = this.pendingRevoke();
    if (invitation === null) return;

    this.revokeGate.submit();
    this.store.revokeInvitation({
      organizationId: this.organizationId(),
      invitationId: invitation.id,
    });
  }

  /**
   * Method onRevokeDialogVisibleChange
   * @description Clears the pending invitation on any dismissal — Cancel, the backdrop or Escape.
   * @access protected
   * @since 1.0.0
   * @param {boolean} visible - The dialog's next visibility.
   * @returns {void}
   */
  protected onRevokeDialogVisibleChange(visible: boolean): void {
    if (visible) return;

    this.pendingRevoke.set(null);
    this.revokeGate.reset();
  }

  /**
   * Method dismissActionError
   * @description Hides the page-level action-error banner until the next error.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected dismissActionError(): void {
    this.actionErrorDismissed.set(true);
  }
  //#endregion

  //#region Internals
  /**
   * Method setActiveTab
   *
   * @description
   * Switches the active tab and mirrors the choice into `?tab=`, dropping
   * the param on `members` so the default stays a clean URL — the same
   * `InterventionDetailPage.setLinkedTab` shape: `replaceUrl` keeps the tab
   * addressable and reload-safe without turning every trigger click into a
   * history entry.
   *
   * @access private
   * @since 2.0.0
   *
   * @param {OrganizationMembersTabId} tab - The tab to show.
   *
   * @returns {void}
   */
  private setActiveTab(tab: OrganizationMembersTabId): void {
    this.activeTab.set(tab);

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: tab === 'members' ? null : tab },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  /**
   * Method isTabPermitted
   * @description Whether the acting member holds the permission the given tab requires.
   * @access private
   * @since 2.0.0
   * @param {OrganizationMembersTabId} tab - The tab to check.
   * @returns {boolean}
   */
  private isTabPermitted(tab: OrganizationMembersTabId): boolean {
    if (tab === 'roles') return this.canViewRolesTab();
    if (tab === 'teams') return this.canViewTeamsTab();

    return this.canViewMembersTab();
  }

  /**
   * Method firstPermittedTab
   * @description The first tab, in `members` → `roles` → `teams` order, the acting member may see — the route guard's `match: 'any'` over the three tabs' permissions guarantees at least one.
   * @access private
   * @since 2.0.0
   * @returns {OrganizationMembersTabId}
   */
  private firstPermittedTab(): OrganizationMembersTabId {
    if (this.canViewMembersTab()) return 'members';
    if (this.canViewRolesTab()) return 'roles';

    return 'teams';
  }

  /**
   * Method queryMembers
   *
   * @description
   * Re-issues the server-side roster query for the given page with the
   * current search term, status filter, page size and ordering, clearing the
   * row selection — the shared tail of every roster-narrowing entry point
   * (pagination, the rows-per-page select, the debounced search, the status
   * toggle, a sortable head).
   *
   * @access private
   * @since 1.1.0
   *
   * @param {number} page - The one-based page to load.
   *
   * @returns {void}
   */
  private queryMembers(page: number): void {
    this.page.set(page);
    this.selectedIds.set(new Set<string>());
    this.store.loadMembers({
      organizationId: this.organizationId(),
      page,
      search: this.searchTerm().trim(),
      status: this.statusFilter(),
      roleId: this.roleFilter(),
      pageSize: this.pageSize(),
      sort: this.sortOrder(),
    });
  }
  //#endregion
}
