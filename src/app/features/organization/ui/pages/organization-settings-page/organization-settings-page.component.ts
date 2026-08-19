import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  LOCALE_ID,
  signal,
  untracked,
  type EffectRef,
  type InputSignal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowRightLeft,
  lucideBan,
  lucideBell,
  lucideBot,
  lucideCircleAlert,
  lucideCircleCheck,
  lucideCircleX,
  lucideClock,
  lucideCreditCard,
  lucideDownload,
  lucideExternalLink,
  lucideGauge,
  lucideGlobe,
  lucideLogOut,
  lucideReceipt,
  lucideRefreshCw,
  lucideSettings,
  lucideShieldCheck,
  lucideTrash2,
  lucideTriangleAlert,
} from '@ng-icons/lucide';
import type { OptionOutput } from '@core/api/models';
import { OrganizationPermissionService } from '@features/organization/access';
import { OrganizationMemberService, OrganizationService } from '@features/organization/data-access';
import { ApprovalRequestService } from '@features/organization/features/approvals/data-access';
import type { ApprovalActionTypeOutput } from '@features/organization/features/approvals/models';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import type {
  InvoiceOutput,
  OrganizationApprovalSettings,
  OrganizationAssistantSettings,
  OrganizationAutomationSettings,
  OrganizationComplianceSettings,
  OrganizationMemberOutput,
  OrganizationNotificationSettings,
  OrganizationOutput,
  OrganizationRegionalSettings,
  OrganizationTransferOwnershipConfirmedEvent,
} from '@features/organization/models';
import {
  ActiveOrganizationStore,
  OrganizationMemberAccessStore,
  OrganizationQuotaStore,
} from '@features/organization/state';
import { OrganizationBillingStore } from '@features/organization/state/organization-billing';
import { OrganizationSettingsStore } from '@features/organization/state/organization-settings';
import { EmptyState } from '@shared/empty-state';
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmCardImports } from '@shared/ui/card';
import { HlmItemImports } from '@shared/ui/item';
import { HlmSkeleton } from '@shared/ui/skeleton';
import { HlmTabsImports } from '@shared/ui/tabs';
import { OrganizationLogoPicker } from '../../components/organization-logo-picker';
import { OrganizationPlanSelector } from '../../components/organization-plan-selector';
import { OrganizationUsagePanel } from '../../components/organization-usage-panel';
import { OrganizationCancelSubscriptionDialog } from '../../dialogs/organization-cancel-subscription-dialog';
import { OrganizationDeleteDialog } from '../../dialogs/organization-delete-dialog';
import { OrganizationLeaveDialog } from '../../dialogs/organization-leave-dialog';
import { OrganizationSuspendDialog } from '../../dialogs/organization-suspend-dialog';
import { OrganizationTransferOwnershipDialog } from '../../dialogs/organization-transfer-ownership-dialog';
import {
  OrganizationApprovalForm,
  type OrganizationApprovalFormValues,
} from '../../forms/organization-approval-form';
import {
  OrganizationAssistantForm,
  type OrganizationAssistantFormValues,
} from '../../forms/organization-assistant-form';
import { OrganizationAutomationForm } from '../../forms/organization-automation-form';
import {
  OrganizationComplianceForm,
  type OrganizationComplianceFormValues,
} from '../../forms/organization-compliance-form';
import {
  OrganizationGeneralForm,
  type OrganizationGeneralFormValues,
} from '../../forms/organization-general-form';
import {
  OrganizationLegalForm,
  type OrganizationLegalFormValues,
} from '../../forms/organization-legal-form';
import { OrganizationNotificationsForm } from '../../forms/organization-notifications-form';
import { OrganizationRegionalForm } from '../../forms/organization-regional-form';
import { SUBSCRIPTION_STATUS_TAG_ICON_CLASS } from './constants/subscription-status-tag-icon-class.constants';
import {
  resolveSubscriptionStatusTag,
  type OrganizationSettingsTabId,
  type SubscriptionStatusTagDescriptor,
} from './models';

/**
 * Constant TAB_IDS
 *
 * @description
 * Every recognized `?tab=` value, in the order the tab list renders them.
 *
 * @since 1.0.0
 */
const TAB_IDS: ReadonlyArray<OrganizationSettingsTabId> = [
  'general',
  'subscription',
  'usage',
  'notifications',
  'regional',
  'compliance',
  'assistant',
  'danger',
];

/**
 * Constant DEFAULT_NOTIFICATIONS
 *
 * @description
 * Seeded when an organization has never persisted a notification policy of
 * its own. Every category defaults on, matching how a new workspace expects
 * to be kept informed until told otherwise.
 *
 * @since 1.0.0
 */
const DEFAULT_NOTIFICATIONS: OrganizationNotificationSettings = {
  emailEnabled: true,
  inAppEnabled: true,
  interventionPublished: true,
  interventionAssigned: true,
  inspectionDue: true,
  nonConformityOpened: true,
  memberInvited: true,
};

/**
 * Constant DEFAULT_COMPLIANCE
 *
 * @description
 * Seeded when an organization has never persisted compliance customizations
 * of its own. Mirrors the backend's `OrganizationComplianceDefaults` catalog
 * so an organization with no `settings.compliance` sees the same effective
 * values the API would compute for it.
 *
 * @since 1.0.0
 */
const DEFAULT_COMPLIANCE: OrganizationComplianceSettings = {
  nonConformitySlaDays: { low: 90, medium: 30, high: 7, critical: 1 },
  inspectionPeriodicityDefaults: {
    fire_extinguisher: 'P1Y',
    smoke_detector: 'P1Y',
    heat_detector: 'P1Y',
    sprinkler: 'P1Y',
    fire_alarm_panel: 'P6M',
    hydrant: 'P1Y',
    fire_door: 'P6M',
    emergency_lighting: 'P6M',
    access_control: 'P1Y',
    camera: 'P1Y',
    gas_detector: 'P6M',
  },
  reminderWindowDays: 30,
  customizedSlaSeverities: [],
  customizedPeriodicityTypes: [],
};

/**
 * Constant DEFAULT_AUTOMATION
 *
 * @description
 * Seeded when an organization has never persisted automation toggles of its
 * own. Mirrors the backend's `OrganizationAutomationSettingsOutput` default.
 *
 * @since 1.0.0
 */
const DEFAULT_AUTOMATION: OrganizationAutomationSettings = {
  autoCreateInterventionOnCriticalNc: false,
};

/**
 * Constant DEFAULT_APPROVAL
 *
 * @description
 * Seeded when an organization has never customized its four-eyes approval
 * policy. Mirrors the backend's `OrganizationApprovalDefaults` catalog: every
 * action type is disabled by default.
 *
 * @since 1.0.0
 */
const DEFAULT_APPROVAL: OrganizationApprovalSettings = {
  actionRules: {},
  allowSelfApproval: false,
  approvalTtlDays: 14,
};

/**
 * Constant DEFAULT_ASSISTANT
 *
 * @description
 * Seeded when an organization has never persisted an AI-assistant policy of
 * its own. Mirrors the backend's `OrganizationAssistantDefaults` catalog:
 * disabled by default, since a conversation transcript is sent to the
 * inference backend once enabled.
 *
 * @since 1.0.0
 */
const DEFAULT_ASSISTANT: OrganizationAssistantSettings = {
  enabled: false,
  model: null,
  temperature: 0.2,
  includeBusinessContext: true,
};

/**
 * Component OrganizationSettingsPage
 * @class OrganizationSettingsPage
 *
 * @description
 * The organization settings route: eight sections synced two-way with the
 * `?tab=` query parameter (`FEATURE.md`) — general & branding, subscription,
 * usage, notifications, regional & formats, compliance (SLAs, inspection
 * periodicity, the automation toggle, and the editable four-eyes approval
 * policy form), assistant (AI-assistant policy), and a permission-gated
 * danger zone. Tab content is deferred with `hlmTabsContentLazy`, so
 * subscription data (Stripe subscription, pricing, invoices, and the plan
 * catalog owned by `OrganizationPlanSelector`) and the approval-policy
 * form's action-type catalog each load only once the reader opens their tab,
 * per `AGENTS.md`'s hidden-UI SSR guidance.
 *
 * The page owns orchestration: it holds the settings and billing stores,
 * resolves permissions, seeds every form from the active organization, and
 * performs navigation; its children only render (`ARCHITECTURE.md` §10.1).
 *
 * Each tab trigger carries an icon ahead of its label — the Danger zone
 * trigger tints its icon destructive, never colour alone, while its label
 * stays neutral like its siblings. The section list is a `lg`-and-up left
 * rail that collapses to a horizontally-scrollable row below that, and every
 * tab's content shares one `max-w-3xl` so the page does not visibly resize
 * as the reader switches tabs.
 *
 * Its title lives in the shell's own `DashboardPageHeader`; this page
 * renders no title band of its own. `app-organization-page-header` is
 * retired, and this page has no header actions of its own to register.
 *
 * @version 1.4.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-settings-page',
  imports: [
    NgIcon,
    NgTemplateOutlet,
    EmptyState,
    OrganizationApprovalForm,
    OrganizationAssistantForm,
    OrganizationAutomationForm,
    OrganizationCancelSubscriptionDialog,
    OrganizationComplianceForm,
    OrganizationDeleteDialog,
    OrganizationGeneralForm,
    OrganizationLeaveDialog,
    OrganizationLegalForm,
    OrganizationLogoPicker,
    OrganizationNotificationsForm,
    OrganizationPlanSelector,
    OrganizationRegionalForm,
    OrganizationSuspendDialog,
    OrganizationTransferOwnershipDialog,
    OrganizationUsagePanel,
    HlmBadge,
    HlmButton,
    HlmSkeleton,
    ...HlmAlertImports,
    ...HlmCardImports,
    ...HlmItemImports,
    ...HlmTabsImports,
  ],
  providers: [
    OrganizationSettingsStore,
    OrganizationBillingStore,
    provideIcons({
      lucideArrowRightLeft,
      lucideBan,
      lucideBell,
      lucideBot,
      lucideCircleAlert,
      lucideCircleCheck,
      lucideCircleX,
      lucideClock,
      lucideCreditCard,
      lucideDownload,
      lucideExternalLink,
      lucideGauge,
      lucideGlobe,
      lucideLogOut,
      lucideReceipt,
      lucideRefreshCw,
      lucideSettings,
      lucideShieldCheck,
      lucideTrash2,
      lucideTriangleAlert,
    }),
  ],
  templateUrl: './organization-settings-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationSettingsPage {
  //#region Inputs
  /**
   * Property tab
   * @readonly
   *
   * @description
   * The raw `?tab=` query parameter, bound automatically by the router's
   * component input binding. `undefined` when absent.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly tab: InputSignal<string | undefined> = input<string | undefined>(undefined);
  //#endregion

  //#region Properties
  /**
   * Property settingsStore
   * @readonly
   * @description Component-scoped store owning the general & branding mutations, the logo upload and the deletion.
   * @access protected
   * @since 1.0.0
   * @type {OrganizationSettingsStore}
   */
  protected readonly settingsStore: OrganizationSettingsStore =
    inject<OrganizationSettingsStore>(OrganizationSettingsStore);

  /**
   * Property billingStore
   * @readonly
   * @description Component-scoped store owning the subscription tab's Stripe data.
   * @access protected
   * @since 1.0.0
   * @type {OrganizationBillingStore}
   */
  protected readonly billingStore: OrganizationBillingStore =
    inject<OrganizationBillingStore>(OrganizationBillingStore);

  /**
   * Property activeOrganizationStore
   * @readonly
   * @description Root-provided resolved organization, seeding every form on this page.
   * @access protected
   * @since 1.0.0
   * @type {ActiveOrganizationStore}
   */
  protected readonly activeOrganizationStore: ActiveOrganizationStore =
    inject<ActiveOrganizationStore>(ActiveOrganizationStore);

  /**
   * Property quotaStore
   * @readonly
   * @description Root-provided quota usage feeding the Usage tab's meters.
   * @access protected
   * @since 1.0.0
   * @type {OrganizationQuotaStore}
   */
  protected readonly quotaStore: OrganizationQuotaStore =
    inject<OrganizationQuotaStore>(OrganizationQuotaStore);

  /**
   * Property permissionService
   * @readonly
   * @description Organization-owned helper exposing reactive permission checks.
   * @access private
   * @since 1.0.0
   * @type {OrganizationPermissionService}
   */
  private readonly permissionService: OrganizationPermissionService =
    inject<OrganizationPermissionService>(OrganizationPermissionService);

  /**
   * Property approvalRequestService
   * @readonly
   *
   * @description
   * Direct cross-feature dependency on the `approvals` subfeature's
   * `data-access` barrel, feeding the Compliance tab's approval-policy
   * form's per-action-type rows — the same direct-service pattern
   * `maintenance-schedules/FEATURE.md` documents for `FacilityService`.
   *
   * @access private
   * @since 1.4.0
   * @type {ApprovalRequestService}
   */
  private readonly approvalRequestService: ApprovalRequestService =
    inject<ApprovalRequestService>(ApprovalRequestService);

  /**
   * Property memberService
   * @readonly
   *
   * @description
   * Loads the active, non-owner members offered as ownership-transfer
   * candidates once the danger tab opens for an owner. The page injects it
   * directly, mirroring {@link approvalRequestService} — this is orchestration,
   * not something the transfer dialog itself may do (`ARCHITECTURE.md` §10.3).
   *
   * @access private
   * @since 1.6.0
   * @type {OrganizationMemberService}
   */
  private readonly memberService: OrganizationMemberService =
    inject<OrganizationMemberService>(OrganizationMemberService);

  /**
   * Property organizationService
   * @readonly
   * @description Loads the legal entity type catalog for the Legal information section. The page injects it directly rather than routing it through {@link settingsStore}, which owns mutations, not reference catalogs.
   * @access private
   * @since 1.6.0
   * @type {OrganizationService}
   */
  private readonly organizationService: OrganizationService =
    inject<OrganizationService>(OrganizationService);

  /**
   * Property memberAccessStore
   * @readonly
   *
   * @description
   * Root-provided store carrying the authenticated user's own `userId` in
   * the active organization (`profile()`). Used to derive {@link isOwner}
   * locally: the single-organization `GET` this page's {@link organization}
   * comes from never populates `OrganizationOutput.isOwner` — only the list
   * endpoint does — so comparing `ownerUserId` against the acting member's
   * own `userId` is the reliable source here, with the declared `isOwner`
   * field consulted first for forward compatibility.
   *
   * @access private
   * @since 1.6.0
   * @type {OrganizationMemberAccessStore}
   */
  private readonly memberAccessStore: OrganizationMemberAccessStore =
    inject<OrganizationMemberAccessStore>(OrganizationMemberAccessStore);

  /**
   * Property route
   * @readonly
   * @description Used to keep tab navigation relative to this route.
   * @access private
   * @since 1.0.0
   * @type {ActivatedRoute}
   */
  private readonly route: ActivatedRoute = inject<ActivatedRoute>(ActivatedRoute);

  /**
   * Property router
   * @readonly
   * @description Used to write the `?tab=` query parameter and to navigate away after deletion.
   * @access private
   * @since 1.0.0
   * @type {Router}
   */
  private readonly router: Router = inject<Router>(Router);

  /**
   * Property locale
   * @readonly
   * @description The active Angular locale, used to format dates and to seed a never-persisted regional locale.
   * @access private
   * @since 1.0.0
   * @type {string}
   */
  private readonly locale: string = inject<string>(LOCALE_ID);

  /** Unregisters the settings tab-rail orientation media query listener on teardown. */
  private readonly destroyRef: DestroyRef = inject<DestroyRef>(DestroyRef);

  /**
   * Property defaultRegional
   * @readonly
   *
   * @description
   * Seeded when an organization has never persisted regional preferences of
   * its own. `timezone` defaults to UTC rather than a browser-detected zone,
   * so the seed is identical on the server and after hydration.
   *
   * @access private
   * @since 1.0.0
   * @type {OrganizationRegionalSettings}
   */
  private readonly defaultRegional: OrganizationRegionalSettings = {
    timezone: 'UTC',
    locale: this.locale,
    dateFormat: 'dd/MM/yyyy',
    firstDayOfWeek: 'monday',
    measurementSystem: 'metric',
  };

  /**
   * Property organization
   * @readonly
   * @description The active organization resource, seeding every form.
   * @access protected
   * @since 1.0.0
   * @type {Signal<OrganizationOutput | null>}
   */
  protected readonly organization: Signal<OrganizationOutput | null> =
    this.activeOrganizationStore.selectedOrganization;

  /**
   * Property organizationId
   * @readonly
   * @description The active organization's identifier, keying every mutation on this page.
   * @access protected
   * @since 1.0.0
   * @type {Signal<string | null>}
   */
  protected readonly organizationId: Signal<string | null> =
    this.activeOrganizationStore.selectedOrganizationId;

  /**
   * Property organizationReady
   * @readonly
   *
   * @description
   * Whether the organization has landed. The settings routes nest under the
   * `:organizationId` parent, whose resolver already redirects away on a
   * failed load, so this only ever covers the brief moment before that
   * resolved value reaches the store.
   *
   * @access protected
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  protected readonly organizationReady: Signal<boolean> = computed(
    (): boolean => this.organization() !== null,
  );

  /**
   * Property canDelete
   * @readonly
   * @description Whether the danger-zone tab and its trigger may render.
   * @access protected
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  protected readonly canDelete: Signal<boolean> = computed((): boolean =>
    this.permissionService.hasPermission(ORGANIZATION_PERMISSION.DELETE),
  );

  /**
   * Property isOwner
   * @readonly
   *
   * @description
   * Whether the authenticated user owns the active organization. Prefers the
   * declared `OrganizationOutput.isOwner` field when it is present, and falls
   * back to comparing `ownerUserId` against the acting member's own `userId`
   * ({@link memberAccessStore}) when it is not — which is every read this
   * page performs today (see {@link memberAccessStore}'s doc).
   *
   * @access protected
   * @since 1.6.0
   * @type {Signal<boolean>}
   */
  protected readonly isOwner: Signal<boolean> = computed((): boolean => {
    const org: OrganizationOutput | null = this.organization();
    if (org === null) return false;

    const declared: boolean | null | undefined = org.isOwner;
    if (declared !== null && declared !== undefined) return declared;

    const actingUserId: string | undefined = this.memberAccessStore.profile()?.userId;
    return actingUserId !== undefined && actingUserId === org.ownerUserId;
  });

  /**
   * Property canSuspend
   * @readonly
   * @description Whether the Suspend control may render — the organization is currently active.
   * @access protected
   * @since 1.6.0
   * @type {Signal<boolean>}
   */
  protected readonly canSuspend: Signal<boolean> = computed(
    (): boolean => this.organization()?.status === 'active',
  );

  /**
   * Property canRestore
   * @readonly
   * @description Whether the Restore control may render — the organization is currently suspended or archived.
   * @access protected
   * @since 1.6.0
   * @type {Signal<boolean>}
   */
  protected readonly canRestore: Signal<boolean> = computed((): boolean => {
    const status: string | undefined = this.organization()?.status;
    return status === 'suspended' || status === 'archived';
  });

  /**
   * Property canTransferOwnership
   * @readonly
   *
   * @description
   * Whether the Transfer ownership control may render. Ownership transfer is
   * outside RBAC — only the current owner may call it — and the domain
   * refuses it on an archived organization (`TransferOrganizationOwnershipHandler`).
   *
   * @access protected
   * @since 1.6.0
   * @type {Signal<boolean>}
   */
  protected readonly canTransferOwnership: Signal<boolean> = computed(
    (): boolean => this.isOwner() && this.organization()?.status !== 'archived',
  );

  /**
   * Property canLeave
   * @readonly
   * @description Whether the Leave control may render — the owner cannot leave (`LeaveOrganizationHandler`).
   * @access protected
   * @since 1.6.0
   * @type {Signal<boolean>}
   */
  protected readonly canLeave: Signal<boolean> = computed((): boolean => !this.isOwner());

  /**
   * Property activeTab
   * @readonly
   *
   * @description
   * The resolved tab: {@link tab} narrowed to a known id, falling back to
   * `general` for a missing, unrecognized, or (for `danger`) unauthorized
   * value.
   *
   * @access protected
   * @since 1.0.0
   * @type {Signal<OrganizationSettingsTabId>}
   */
  protected readonly activeTab: Signal<OrganizationSettingsTabId> = computed(
    (): OrganizationSettingsTabId => {
      const requested: string | undefined = this.tab();
      const resolved: OrganizationSettingsTabId =
        requested !== undefined && (TAB_IDS as ReadonlyArray<string>).includes(requested)
          ? (requested as OrganizationSettingsTabId)
          : 'general';

      return resolved === 'danger' && !this.canDelete() ? 'general' : resolved;
    },
  );

  /**
   * Property settingsTabsOrientation
   * @readonly
   *
   * @description
   * Whether the section list lays out as a `lg`-and-up left rail
   * (`vertical`, `hlm-tabs-list`) or a horizontally-scrollable row above the
   * panes (`horizontal`, `hlm-paginated-tabs-list`) on narrower viewports —
   * driven by a `(min-width: 1024px)` media query. Starts `horizontal`
   * (server/pre-hydration default) and upgrades once the browser evaluates
   * the query.
   *
   * @access protected
   * @since 1.2.0
   * @type {WritableSignal<'horizontal' | 'vertical'>}
   */
  protected readonly settingsTabsOrientation: WritableSignal<'horizontal' | 'vertical'> = signal<
    'horizontal' | 'vertical'
  >('horizontal');

  /**
   * Property generalFormValues
   * @readonly
   * @description The active organization mapped onto the general & branding form's shape.
   * @access protected
   * @since 1.0.0
   * @type {Signal<OrganizationGeneralFormValues>}
   */
  protected readonly generalFormValues: Signal<OrganizationGeneralFormValues> = computed(
    (): OrganizationGeneralFormValues => {
      const organization: OrganizationOutput | null = this.organization();

      return {
        name: organization?.name ?? '',
        slug: organization?.slug ?? '',
        description: organization?.description ?? '',
      };
    },
  );

  /**
   * Property legalFormValues
   * @readonly
   * @description The active organization mapped onto the legal information form's shape.
   * @access protected
   * @since 1.6.0
   * @type {Signal<OrganizationLegalFormValues>}
   */
  protected readonly legalFormValues: Signal<OrganizationLegalFormValues> = computed(
    (): OrganizationLegalFormValues => {
      const organization: OrganizationOutput | null = this.organization();

      return {
        country: organization?.country ?? '',
        legalType: organization?.legalType ?? '',
        legalName: organization?.legalName ?? '',
        registrationNumber: organization?.registrationNumber ?? '',
        vatNumber: organization?.vatNumber ?? '',
      };
    },
  );

  /**
   * Property notificationsSeed
   * @readonly
   * @description The active organization's notification policy, defaulted for an organization that has never persisted one.
   * @access protected
   * @since 1.0.0
   * @type {Signal<OrganizationNotificationSettings>}
   */
  protected readonly notificationsSeed: Signal<OrganizationNotificationSettings> = computed(
    (): OrganizationNotificationSettings =>
      this.organization()?.settings?.notifications ?? DEFAULT_NOTIFICATIONS,
  );

  /**
   * Property regionalSeed
   * @readonly
   * @description The active organization's regional preferences, defaulted for an organization that has never persisted them.
   * @access protected
   * @since 1.0.0
   * @type {Signal<OrganizationRegionalSettings>}
   */
  protected readonly regionalSeed: Signal<OrganizationRegionalSettings> = computed(
    (): OrganizationRegionalSettings =>
      this.organization()?.settings?.regional ?? this.defaultRegional,
  );

  /**
   * Property complianceSeed
   * @readonly
   * @description The active organization's compliance policy, defaulted for an organization that has never customized it.
   * @access protected
   * @since 1.0.0
   * @type {Signal<OrganizationComplianceSettings>}
   */
  protected readonly complianceSeed: Signal<OrganizationComplianceSettings> = computed(
    (): OrganizationComplianceSettings =>
      this.organization()?.settings?.compliance ?? DEFAULT_COMPLIANCE,
  );

  /**
   * Property automationSeed
   * @readonly
   * @description The active organization's automation toggles, defaulted for an organization that has never persisted any.
   * @access protected
   * @since 1.0.0
   * @type {Signal<OrganizationAutomationSettings>}
   */
  protected readonly automationSeed: Signal<OrganizationAutomationSettings> = computed(
    (): OrganizationAutomationSettings =>
      this.organization()?.settings?.automation ?? DEFAULT_AUTOMATION,
  );

  /**
   * Property approvalSeed
   * @readonly
   * @description The active organization's four-eyes approval policy, defaulted for an organization that has never customized it.
   * @access protected
   * @since 1.0.0
   * @type {Signal<OrganizationApprovalSettings>}
   */
  protected readonly approvalSeed: Signal<OrganizationApprovalSettings> = computed(
    (): OrganizationApprovalSettings => this.organization()?.settings?.approval ?? DEFAULT_APPROVAL,
  );

  /**
   * Property assistantSeed
   * @readonly
   * @description The active organization's AI-assistant policy, defaulted for an organization that has never persisted one.
   * @access protected
   * @since 1.0.0
   * @type {Signal<OrganizationAssistantSettings>}
   */
  protected readonly assistantSeed: Signal<OrganizationAssistantSettings> = computed(
    (): OrganizationAssistantSettings =>
      this.organization()?.settings?.assistant ?? DEFAULT_ASSISTANT,
  );

  /**
   * Property subscriptionStatusTag
   * @readonly
   * @description The current subscription's status descriptor, or `null` when there is no subscription to describe.
   * @access protected
   * @since 1.0.0
   * @type {Signal<SubscriptionStatusTagDescriptor | null>}
   */
  protected readonly subscriptionStatusTag: Signal<SubscriptionStatusTagDescriptor | null> =
    computed((): SubscriptionStatusTagDescriptor | null => {
      const status: string | null | undefined = this.billingStore.subscription()?.status;
      return status ? resolveSubscriptionStatusTag(status) : null;
    });

  /**
   * Property subscriptionStatusIconClass
   * @readonly
   * @description Maps the subscription status severity to its icon colour.
   * @access protected
   * @since 1.0.0
   * @type {typeof SUBSCRIPTION_STATUS_TAG_ICON_CLASS}
   */
  protected readonly subscriptionStatusIconClass: typeof SUBSCRIPTION_STATUS_TAG_ICON_CLASS =
    SUBSCRIPTION_STATUS_TAG_ICON_CLASS;

  /**
   * Property renewalDate
   * @readonly
   * @description The current subscription's renewal or expiry date, formatted for display.
   * @access protected
   * @since 1.0.0
   * @type {Signal<string | null>}
   */
  protected readonly renewalDate: Signal<string | null> = computed((): string | null =>
    this.formatDate(this.billingStore.subscription()?.currentPeriodEnd),
  );

  /**
   * Property renewalStatusText
   * @readonly
   *
   * @description
   * The current subscription's renewal line, or `null` while there is no
   * date to report. Built here rather than interpolated in the template: a
   * named `$localize` placeholder extracts as one translatable sentence,
   * where a template interpolation would extract as a positional
   * `INTERPOLATION` id a translator cannot reorder.
   *
   * @access protected
   * @since 1.0.0
   * @type {Signal<string | null>}
   */
  protected readonly renewalStatusText: Signal<string | null> = computed((): string | null => {
    const date: string | null = this.renewalDate();
    if (date === null) return null;

    return this.billingStore.subscription()?.cancelAtPeriodEnd
      ? $localize`:@@org.settings.subscription.endsOn:Ends on ${date}:date:`
      : $localize`:@@org.settings.subscription.renewsOn:Renews on ${date}:date:`;
  });

  /**
   * Property confirmingDelete
   * @readonly
   * @description Whether the danger-zone confirmation dialog is open.
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<boolean>}
   */
  protected readonly confirmingDelete: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property confirmingSuspend
   * @readonly
   * @description Whether the danger-zone suspend confirmation dialog is open.
   * @access protected
   * @since 1.6.0
   * @type {WritableSignal<boolean>}
   */
  protected readonly confirmingSuspend: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property confirmingTransfer
   * @readonly
   * @description Whether the danger-zone ownership-transfer confirmation dialog is open.
   * @access protected
   * @since 1.6.0
   * @type {WritableSignal<boolean>}
   */
  protected readonly confirmingTransfer: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property confirmingLeave
   * @readonly
   * @description Whether the danger-zone leave confirmation dialog is open.
   * @access protected
   * @since 1.6.0
   * @type {WritableSignal<boolean>}
   */
  protected readonly confirmingLeave: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property confirmingCancelSubscription
   * @readonly
   * @description Whether the subscription tab's cancel confirmation dialog is open.
   * @access protected
   * @since 1.6.0
   * @type {WritableSignal<boolean>}
   */
  protected readonly confirmingCancelSubscription: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property legalTypeOptions
   * @readonly
   * @description The legal entity type catalog, feeding the Legal information section's type picker. Loaded once, the first time the General tab opens (it is the default tab, so effectively on mount).
   * @access protected
   * @since 1.6.0
   * @type {WritableSignal<ReadonlyArray<OptionOutput>>}
   */
  protected readonly legalTypeOptions: WritableSignal<ReadonlyArray<OptionOutput>> = signal<
    ReadonlyArray<OptionOutput>
  >([]);

  /**
   * Property transferCandidates
   * @readonly
   *
   * @description
   * Active members eligible to receive ownership — every active member but
   * the current owner. Loaded once, the first time the danger tab opens for
   * an owner (`canTransferOwnership`).
   *
   * @access protected
   * @since 1.6.0
   * @type {WritableSignal<ReadonlyArray<{ readonly value: string; readonly label: string }>>}
   */
  protected readonly transferCandidates: WritableSignal<
    ReadonlyArray<{ readonly value: string; readonly label: string }>
  > = signal<ReadonlyArray<{ readonly value: string; readonly label: string }>>([]);

  /**
   * Property approvalActionTypes
   * @readonly
   * @description The regulated action-type catalog, feeding the approval-policy form's rows. Loaded once, the first time the Compliance tab opens.
   * @access protected
   * @since 1.4.0
   * @type {WritableSignal<ReadonlyArray<ApprovalActionTypeOutput>>}
   */
  protected readonly approvalActionTypes: WritableSignal<ReadonlyArray<ApprovalActionTypeOutput>> =
    signal<ReadonlyArray<ApprovalActionTypeOutput>>([]);

  /**
   * Property currentPlanKey
   * @readonly
   *
   * @description
   * The current plan's catalog key, reported by `OrganizationPlanSelector`
   * once it resolves it, used to target a recovery Checkout session for an
   * organization with no active subscription.
   *
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<string | null>}
   */
  protected readonly currentPlanKey: WritableSignal<string | null> = signal<string | null>(null);

  /**
   * Property hasRequestedBillingData
   *
   * @description
   * Guards the subscription tab's data load so it fires once per page
   * instance rather than on every re-evaluation of {@link loadSubscriptionTabData}.
   *
   * @access private
   * @since 1.0.0
   * @type {boolean}
   */
  private hasRequestedBillingData: boolean = false;

  /**
   * Property hasRequestedApprovalActionTypes
   *
   * @description
   * Guards the approval-policy form's catalog load so it fires once per
   * page instance rather than on every re-evaluation of
   * {@link loadApprovalActionTypes}.
   *
   * @access private
   * @since 1.4.0
   * @type {boolean}
   */
  private hasRequestedApprovalActionTypes: boolean = false;

  /**
   * Property hasRequestedLegalTypes
   *
   * @description
   * Guards the legal information form's type-catalog load so it fires once
   * per page instance rather than on every re-evaluation of
   * {@link loadLegalTypes}.
   *
   * @access private
   * @since 1.6.0
   * @type {boolean}
   */
  private hasRequestedLegalTypes: boolean = false;

  /**
   * Property hasRequestedTransferCandidates
   *
   * @description
   * Guards the ownership-transfer candidate load so it fires once per page
   * instance rather than on every re-evaluation of
   * {@link loadTransferCandidates}.
   *
   * @access private
   * @since 1.6.0
   * @type {boolean}
   */
  private hasRequestedTransferCandidates: boolean = false;

  /**
   * Property previousDeleteStatus
   *
   * @description
   * The delete call state as of the last time {@link navigateAwayOnDelete}
   * ran, so it can spot the transition into success rather than the state of
   * being in it.
   *
   * @access private
   * @since 1.0.0
   * @type {string}
   */
  private previousDeleteStatus: string = 'idle';

  /**
   * Property previousLeaveStatus
   * @description The leave call state as of the last time {@link navigateAwayOnLeave} ran.
   * @access private
   * @since 1.6.0
   * @type {string}
   */
  private previousLeaveStatus: string = 'idle';

  /**
   * Property previousStatusChangeStatus
   * @description The suspend/restore call state as of the last time {@link closeSuspendDialogOnSuccess} ran.
   * @access private
   * @since 1.6.0
   * @type {string}
   */
  private previousStatusChangeStatus: string = 'idle';

  /**
   * Property previousTransferStatus
   * @description The transfer-ownership call state as of the last time {@link closeTransferDialogOnSuccess} ran.
   * @access private
   * @since 1.6.0
   * @type {string}
   */
  private previousTransferStatus: string = 'idle';

  /**
   * Property previousCancelSubscriptionStatus
   * @description The subscription cancel call state as of the last time {@link closeCancelSubscriptionDialogOnSuccess} ran.
   * @access private
   * @since 1.6.0
   * @type {string}
   */
  private previousCancelSubscriptionStatus: string = 'idle';

  /**
   * Property loadSubscriptionTabData
   * @readonly
   *
   * @description
   * Loads the subscription, the pricing catalog and the invoice history the
   * first time the reader opens the Subscription tab — including a direct
   * deep link into it, which fires no `tabActivated` event. Hidden-tab data
   * loads on demand rather than on page mount (`AGENTS.md`).
   *
   * @access private
   * @since 1.0.0
   */
  private readonly loadSubscriptionTabData: EffectRef = effect((): void => {
    const tabId: OrganizationSettingsTabId = this.activeTab();
    const organizationId: string | null = this.organizationId();

    if (tabId !== 'subscription' || organizationId === null || this.hasRequestedBillingData) return;

    untracked((): void => {
      this.hasRequestedBillingData = true;
      this.billingStore.loadSubscription(organizationId);
      this.billingStore.loadPricing();
      this.billingStore.loadInvoices(organizationId);
    });
  });

  /**
   * Property loadApprovalActionTypes
   * @readonly
   *
   * @description
   * Loads the regulated action-type catalog the first time the reader opens
   * the Compliance tab — including a direct deep link into it. Hidden-tab
   * data loads on demand rather than on page mount (`AGENTS.md`).
   *
   * @access private
   * @since 1.4.0
   */
  private readonly loadApprovalActionTypes: EffectRef = effect((): void => {
    const tabId: OrganizationSettingsTabId = this.activeTab();

    if (tabId !== 'compliance' || this.hasRequestedApprovalActionTypes) return;

    untracked((): void => {
      this.hasRequestedApprovalActionTypes = true;
      this.approvalRequestService.listActionTypes().subscribe((response) => {
        this.approvalActionTypes.set(response.member);
      });
    });
  });

  /**
   * Property loadLegalTypes
   * @readonly
   *
   * @description
   * Loads the legal entity type catalog the first time the reader opens the
   * General tab — the default tab, so this effectively fires on mount.
   * Hidden-tab data loads on demand rather than on page mount (`AGENTS.md`).
   *
   * @access private
   * @since 1.6.0
   */
  private readonly loadLegalTypes: EffectRef = effect((): void => {
    const tabId: OrganizationSettingsTabId = this.activeTab();

    if (tabId !== 'general' || this.hasRequestedLegalTypes) return;

    untracked((): void => {
      this.hasRequestedLegalTypes = true;
      this.organizationService.listLegalTypes().subscribe((response) => {
        this.legalTypeOptions.set(response.member);
      });
    });
  });

  /**
   * Property loadTransferCandidates
   * @readonly
   *
   * @description
   * Loads the active membership roster the first time the reader — who owns
   * the organization — opens the danger tab, then narrows it to every active
   * member but the owner themselves for the transfer dialog's picker.
   *
   * @access private
   * @since 1.6.0
   */
  private readonly loadTransferCandidates: EffectRef = effect((): void => {
    const tabId: OrganizationSettingsTabId = this.activeTab();
    const organizationId: string | null = this.organizationId();
    const eligible: boolean = this.canTransferOwnership();

    if (
      tabId !== 'danger' ||
      !eligible ||
      organizationId === null ||
      this.hasRequestedTransferCandidates
    ) {
      return;
    }

    untracked((): void => {
      this.hasRequestedTransferCandidates = true;
      this.memberService.listAll(organizationId).subscribe((members) => {
        this.transferCandidates.set(
          members
            .filter(
              (member: OrganizationMemberOutput): boolean => member.isActive && !member.isOwner,
            )
            .map((member: OrganizationMemberOutput) => ({
              value: member.userId,
              label: this.memberDisplayName(member),
            })),
        );
      });
    });
  });

  /**
   * Property navigateAwayOnDelete
   * @readonly
   *
   * @description
   * Once the deletion succeeds, clears the active organization context and
   * returns to the organization redirector, which resolves the next
   * accessible workspace. Keyed on the transition into success, matching
   * `AccountProfilePage`'s `leaveEditOnSave`.
   *
   * @access private
   * @since 1.0.0
   */
  private readonly navigateAwayOnDelete: EffectRef = effect((): void => {
    const status: string = this.settingsStore.deleteCallState().status;
    const previous: string = this.previousDeleteStatus;
    this.previousDeleteStatus = status;

    if (previous !== 'pending' || status !== 'success') return;

    untracked((): void => {
      this.confirmingDelete.set(false);
      this.activeOrganizationStore.clear();
      void this.router.navigate(['/organizations']);
    });
  });

  /**
   * Property closeSuspendDialogOnSuccess
   * @readonly
   *
   * @description
   * Closes the suspend confirmation once it succeeds. Keyed on the
   * transition into success while the dialog is open, since {@link restore}
   * shares `statusCallState` and opens no dialog of its own.
   *
   * @access private
   * @since 1.6.0
   */
  private readonly closeSuspendDialogOnSuccess: EffectRef = effect((): void => {
    const status: string = this.settingsStore.statusCallState().status;
    const previous: string = this.previousStatusChangeStatus;
    this.previousStatusChangeStatus = status;

    if (previous !== 'pending' || status !== 'success' || !this.confirmingSuspend()) return;

    untracked((): void => this.confirmingSuspend.set(false));
  });

  /**
   * Property closeTransferDialogOnSuccess
   * @readonly
   * @description Closes the ownership-transfer confirmation once it succeeds. Keyed on the transition into success.
   * @access private
   * @since 1.6.0
   */
  private readonly closeTransferDialogOnSuccess: EffectRef = effect((): void => {
    const status: string = this.settingsStore.transferOwnershipCallState().status;
    const previous: string = this.previousTransferStatus;
    this.previousTransferStatus = status;

    if (previous !== 'pending' || status !== 'success') return;

    untracked((): void => this.confirmingTransfer.set(false));
  });

  /**
   * Property closeCancelSubscriptionDialogOnSuccess
   * @readonly
   * @description Closes the subscription cancel confirmation once it succeeds, mirroring {@link closeSuspendDialogOnSuccess}.
   * @access private
   * @since 1.6.0
   */
  private readonly closeCancelSubscriptionDialogOnSuccess: EffectRef = effect((): void => {
    const status: string = this.billingStore.cancelCallState().status;
    const previous: string = this.previousCancelSubscriptionStatus;
    this.previousCancelSubscriptionStatus = status;

    if (previous !== 'pending' || status !== 'success') return;

    untracked((): void => this.confirmingCancelSubscription.set(false));
  });

  /**
   * Property navigateAwayOnLeave
   * @readonly
   *
   * @description
   * Once leaving succeeds, clears the active organization context and
   * returns to the organization redirector, mirroring
   * {@link navigateAwayOnDelete} — the acting member no longer belongs here
   * either way.
   *
   * @access private
   * @since 1.6.0
   */
  private readonly navigateAwayOnLeave: EffectRef = effect((): void => {
    const status: string = this.settingsStore.leaveCallState().status;
    const previous: string = this.previousLeaveStatus;
    this.previousLeaveStatus = status;

    if (previous !== 'pending' || status !== 'success') return;

    untracked((): void => {
      this.confirmingLeave.set(false);
      this.activeOrganizationStore.clear();
      void this.router.navigate(['/organizations']);
    });
  });
  //#endregion

  constructor() {
    const desktopQuery: MediaQueryList | undefined = globalThis.matchMedia?.('(min-width: 1024px)');
    if (!desktopQuery) return;

    this.settingsTabsOrientation.set(desktopQuery.matches ? 'vertical' : 'horizontal');
    const onDesktopQueryChange = (event: MediaQueryListEvent): void =>
      this.settingsTabsOrientation.set(event.matches ? 'vertical' : 'horizontal');
    desktopQuery.addEventListener('change', onDesktopQueryChange);
    this.destroyRef.onDestroy(() =>
      desktopQuery.removeEventListener('change', onDesktopQueryChange),
    );
  }

  //#region Methods
  /**
   * Method onTabActivated
   * @method onTabActivated
   *
   * @description
   * Writes a user-picked tab back to the `?tab=` query parameter, which is
   * what actually moves {@link activeTab} — the tab list has no state of its
   * own.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} tabId - The tab id `hlm-tabs` reports.
   *
   * @returns {void}
   */
  protected onTabActivated(tabId: string): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: tabId },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  /**
   * Method saveGeneral
   * @method saveGeneral
   *
   * @description
   * Maps the general form's values onto the settings PATCH and calls the
   * store. An emptied description is sent as `null` rather than as `''`:
   * under merge-patch, `null` clears the field.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {OrganizationGeneralFormValues} values - What the user typed.
   *
   * @returns {void}
   */
  protected saveGeneral(values: OrganizationGeneralFormValues): void {
    const organizationId: string | null = this.organizationId();
    if (organizationId === null) return;

    this.settingsStore.save({
      organizationId,
      input: {
        name: values.name.trim(),
        slug: values.slug.trim(),
        description: values.description.trim().length > 0 ? values.description.trim() : null,
      },
    });
  }

  /**
   * Method uploadLogo
   * @method uploadLogo
   *
   * @description
   * Sends the picked logo. The picker applies no client-side check — the
   * store's own error surfaces on rejection.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {File} file - The picked image.
   *
   * @returns {void}
   */
  protected uploadLogo(file: File): void {
    const organizationId: string | null = this.organizationId();
    if (organizationId === null) return;

    this.settingsStore.uploadLogo({ organizationId, file, fileName: file.name });
  }

  /**
   * Method removeLogo
   * @method removeLogo
   *
   * @description
   * Clears the organization logo. The picker only offers the control while a
   * logo exists, so there is no empty-state case to guard here.
   *
   * @access protected
   * @since 1.1.0
   *
   * @returns {void}
   */
  protected removeLogo(): void {
    const organizationId: string | null = this.organizationId();
    if (organizationId === null) return;

    this.settingsStore.removeLogo({ organizationId });
  }

  /**
   * Method saveLegal
   * @method saveLegal
   *
   * @description
   * Persists the legal information section. Every field is sent as typed —
   * an empty string clears it, unlike {@link saveGeneral}'s `description`
   * (`UpdateOrganizationInput`'s doc block).
   *
   * @access protected
   * @since 1.6.0
   *
   * @param {OrganizationLegalFormValues} values - What the user typed.
   *
   * @returns {void}
   */
  protected saveLegal(values: OrganizationLegalFormValues): void {
    const organizationId: string | null = this.organizationId();
    if (organizationId === null) return;

    this.settingsStore.save({ organizationId, input: { ...values } });
  }

  /**
   * Method saveNotifications
   * @method saveNotifications
   *
   * @description
   * Persists the notification policy.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {OrganizationNotificationSettings} values - The edited policy.
   *
   * @returns {void}
   */
  protected saveNotifications(values: OrganizationNotificationSettings): void {
    const organizationId: string | null = this.organizationId();
    if (organizationId === null) return;

    this.settingsStore.save({ organizationId, input: { notifications: values } });
  }

  /**
   * Method saveRegional
   * @method saveRegional
   *
   * @description
   * Persists the regional and formatting preferences.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {OrganizationRegionalSettings} values - The edited preferences.
   *
   * @returns {void}
   */
  protected saveRegional(values: OrganizationRegionalSettings): void {
    const organizationId: string | null = this.organizationId();
    if (organizationId === null) return;

    this.settingsStore.save({ organizationId, input: { regional: values } });
  }

  /**
   * Method saveCompliance
   * @method saveCompliance
   *
   * @description
   * Persists the compliance policy: the two effective-value maps and the
   * reminder window.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {OrganizationComplianceFormValues} values - The edited policy.
   *
   * @returns {void}
   */
  protected saveCompliance(values: OrganizationComplianceFormValues): void {
    const organizationId: string | null = this.organizationId();
    if (organizationId === null) return;

    this.settingsStore.save({ organizationId, input: { compliance: values } });
  }

  /**
   * Method saveAutomation
   * @method saveAutomation
   *
   * @description
   * Persists the automation toggles.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {OrganizationAutomationSettings} values - The edited toggles.
   *
   * @returns {void}
   */
  protected saveAutomation(values: OrganizationAutomationSettings): void {
    const organizationId: string | null = this.organizationId();
    if (organizationId === null) return;

    this.settingsStore.save({ organizationId, input: { automation: values } });
  }

  /**
   * Method saveApproval
   * @method saveApproval
   *
   * @description
   * Persists the four-eyes approval policy: every catalog action type's
   * rule row, self-approval, and the request TTL. Writable now that the
   * approvals inbox exists to act on a gated request
   * (`features/approvals/FEATURE.md`).
   *
   * @access protected
   * @since 1.4.0
   *
   * @param {OrganizationApprovalFormValues} values - The edited policy.
   *
   * @returns {void}
   */
  protected saveApproval(values: OrganizationApprovalFormValues): void {
    const organizationId: string | null = this.organizationId();
    if (organizationId === null) return;

    this.settingsStore.save({ organizationId, input: { approval: values } });
  }

  /**
   * Method saveAssistant
   * @method saveAssistant
   *
   * @description
   * Persists the AI-assistant policy. The read-only model override is never
   * part of this payload.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {OrganizationAssistantFormValues} values - The edited policy.
   *
   * @returns {void}
   */
  protected saveAssistant(values: OrganizationAssistantFormValues): void {
    const organizationId: string | null = this.organizationId();
    if (organizationId === null) return;

    this.settingsStore.save({ organizationId, input: { assistant: values } });
  }

  /**
   * Method onCurrentPlanKeyChange
   * @method onCurrentPlanKeyChange
   *
   * @description
   * Captures the current plan's catalog key reported by
   * `OrganizationPlanSelector`.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string | null} key - The resolved key, or `null`.
   *
   * @returns {void}
   */
  protected onCurrentPlanKeyChange(key: string | null): void {
    this.currentPlanKey.set(key);
  }

  /**
   * Method startCheckout
   * @method startCheckout
   *
   * @description
   * Starts a hosted Checkout session for the organization's current plan —
   * the recovery path for an organization with no active subscription. The
   * store redirects the browser to Stripe on success.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected startCheckout(): void {
    const organizationId: string | null = this.organizationId();
    const planKey: string | null = this.currentPlanKey();
    if (organizationId === null || planKey === null) return;

    this.billingStore.startCheckout({ organizationId, planKey, interval: 'month' });
  }

  /**
   * Method startPortal
   * @method startPortal
   *
   * @description
   * Starts a hosted Billing Portal session. The store redirects the browser
   * to Stripe on success.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected startPortal(): void {
    const organizationId: string | null = this.organizationId();
    if (organizationId === null) return;

    this.billingStore.startPortal(organizationId);
  }

  /**
   * Method openCancelSubscriptionDialog
   * @method openCancelSubscriptionDialog
   *
   * @description
   * Opens the subscription cancellation confirmation dialog.
   *
   * @access protected
   * @since 1.6.0
   *
   * @returns {void}
   */
  protected openCancelSubscriptionDialog(): void {
    this.confirmingCancelSubscription.set(true);
  }

  /**
   * Method cancelSubscription
   * @method cancelSubscription
   *
   * @description
   * Schedules cancellation of the subscription at the end of the current
   * billing period once the reader confirms.
   *
   * @access protected
   * @since 1.6.0
   *
   * @returns {void}
   */
  protected cancelSubscription(): void {
    const organizationId: string | null = this.organizationId();
    if (organizationId === null) return;

    this.billingStore.cancelSubscription(organizationId);
  }

  /**
   * Method resumeSubscription
   * @method resumeSubscription
   *
   * @description
   * Clears a scheduled cancellation so the subscription renews normally. No
   * confirmation dialog: this undoes {@link cancelSubscription}, mirroring
   * how {@link restoreOrganization} needs none either.
   *
   * @access protected
   * @since 1.6.0
   *
   * @returns {void}
   */
  protected resumeSubscription(): void {
    const organizationId: string | null = this.organizationId();
    if (organizationId === null) return;

    this.billingStore.resumeSubscription(organizationId);
  }

  /**
   * Method openDeleteDialog
   * @method openDeleteDialog
   *
   * @description
   * Opens the danger-zone confirmation dialog.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected openDeleteDialog(): void {
    this.confirmingDelete.set(true);
  }

  /**
   * Method deleteOrganization
   * @method deleteOrganization
   *
   * @description
   * Archives the organization — a reversible soft delete — once the dialog's
   * typed-name gate has been satisfied.
   *
   * The endpoint's own confirmation is the **slug**, not the name, so it is
   * read from the resolved organization rather than from what was typed: the
   * dialog proves intent in the reader's own terms, and this supplies the
   * token the backend checks.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected deleteOrganization(): void {
    const organizationId: string | null = this.organizationId();
    const slug: string | undefined = this.organization()?.slug;
    if (organizationId === null || slug === undefined) return;

    this.settingsStore.deleteOrganization({ organizationId, slug });
  }

  /**
   * Method openSuspendDialog
   * @method openSuspendDialog
   * @description Opens the danger-zone suspend confirmation dialog.
   * @access protected
   * @since 1.6.0
   * @returns {void}
   */
  protected openSuspendDialog(): void {
    this.confirmingSuspend.set(true);
  }

  /**
   * Method suspendOrganization
   * @method suspendOrganization
   * @description Suspends the organization once the reader confirms.
   * @access protected
   * @since 1.6.0
   * @returns {void}
   */
  protected suspendOrganization(): void {
    const organizationId: string | null = this.organizationId();
    if (organizationId === null) return;

    this.settingsStore.suspend({ organizationId });
  }

  /**
   * Method restoreOrganization
   * @method restoreOrganization
   *
   * @description
   * Restores the organization to active. No confirmation dialog: restoring
   * is the undo, mirroring how {@link OrganizationMemberTable}'s Reactivate
   * needs none either.
   *
   * @access protected
   * @since 1.6.0
   *
   * @returns {void}
   */
  protected restoreOrganization(): void {
    const organizationId: string | null = this.organizationId();
    if (organizationId === null) return;

    this.settingsStore.restore({ organizationId });
  }

  /**
   * Method openTransferDialog
   * @method openTransferDialog
   * @description Opens the danger-zone ownership-transfer confirmation dialog.
   * @access protected
   * @since 1.6.0
   * @returns {void}
   */
  protected openTransferDialog(): void {
    this.confirmingTransfer.set(true);
  }

  /**
   * Method transferOwnership
   * @method transferOwnership
   *
   * @description
   * Hands ownership to the picked candidate once the dialog's typed-name
   * gate has been satisfied. The endpoint's own confirmation is the
   * **slug**, not the name, so — exactly like {@link deleteOrganization} — it
   * is read from the resolved organization rather than from what was typed.
   *
   * @access protected
   * @since 1.6.0
   *
   * @param {OrganizationTransferOwnershipConfirmedEvent} event - The dialog's confirmed payload.
   *
   * @returns {void}
   */
  protected transferOwnership(event: OrganizationTransferOwnershipConfirmedEvent): void {
    const organizationId: string | null = this.organizationId();
    const slug: string | undefined = this.organization()?.slug;
    if (organizationId === null || slug === undefined) return;

    this.settingsStore.transferOwnership({
      organizationId,
      newOwnerUserId: event.newOwnerUserId,
      slug,
    });
  }

  /**
   * Method openLeaveDialog
   * @method openLeaveDialog
   * @description Opens the danger-zone leave confirmation dialog.
   * @access protected
   * @since 1.6.0
   * @returns {void}
   */
  protected openLeaveDialog(): void {
    this.confirmingLeave.set(true);
  }

  /**
   * Method leaveOrganization
   * @method leaveOrganization
   * @description Deactivates the acting member's own membership once the reader confirms.
   * @access protected
   * @since 1.6.0
   * @returns {void}
   */
  protected leaveOrganization(): void {
    const organizationId: string | null = this.organizationId();
    if (organizationId === null) return;

    this.settingsStore.leave({ organizationId });
  }

  /**
   * Method memberDisplayName
   * @method memberDisplayName
   *
   * @description
   * The name a transfer-candidate option shows: the API's `displayName`, or
   * the first/last name pair, or the email, in that order — the same
   * fallback chain `OrganizationMemberTable.nameOf` applies to a row (two
   * consumers, not a third yet, so this stays page-local rather than
   * extracted, `ARCHITECTURE.md` §2.9).
   *
   * @access private
   * @since 1.6.0
   *
   * @param {OrganizationMemberOutput} member - The candidate member.
   *
   * @returns {string} The name to render.
   */
  private memberDisplayName(member: OrganizationMemberOutput): string {
    if (member.displayName) return member.displayName;

    const composed: string = [member.firstName, member.lastName]
      .filter((part): part is string => !!part)
      .join(' ');
    if (composed) return composed;

    return member.email ?? $localize`:@@org.settings.danger.transferMemberUnnamed:Member`;
  }

  /**
   * Method formatInvoiceAmount
   * @method formatInvoiceAmount
   *
   * @description
   * Renders an invoice's integer minor-unit amount as a localized currency
   * string.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InvoiceOutput} invoice - The invoice row.
   *
   * @returns {string} The formatted amount.
   */
  protected formatInvoiceAmount(invoice: InvoiceOutput): string {
    return new Intl.NumberFormat(this.locale, {
      style: 'currency',
      currency: invoice.currency,
    }).format(invoice.amount / 100);
  }

  /**
   * Method formatDate
   * @method formatDate
   *
   * @description
   * Renders an API timestamp as a readable date. Uses the platform's `Intl`
   * rather than a date library, matching `AccountProfilePage`'s
   * `formatDate` — two call sites do not justify introducing one
   * (`ARCHITECTURE.md` §2.9).
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string | null | undefined} iso - ISO-8601 timestamp, if any.
   *
   * @returns {string | null} The formatted date, or `null` when there is none.
   */
  protected formatDate(iso: string | null | undefined): string | null {
    if (!iso) return null;

    const parsed: number = Date.parse(iso);
    if (Number.isNaN(parsed)) return null;

    return new Intl.DateTimeFormat(this.locale, { dateStyle: 'long' }).format(parsed);
  }
  //#endregion
}
