import {
  ChangeDetectionStrategy,
  Component,
  computed,
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
  lucideBan,
  lucideCircleAlert,
  lucideCircleCheck,
  lucideClock,
  lucideCreditCard,
  lucideDownload,
  lucideExternalLink,
  lucideReceipt,
  lucideRefreshCw,
  lucideTrash2,
  lucideTriangleAlert,
} from '@ng-icons/lucide';
import { OrganizationPermissionService } from '@features/organization/access';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import type {
  InvoiceOutput,
  OrganizationNotificationSettings,
  OrganizationOutput,
  OrganizationRegionalSettings,
} from '@features/organization/models';
import { ActiveOrganizationStore, OrganizationQuotaStore } from '@features/organization/state';
import { OrganizationBillingStore } from '@features/organization/state/organization-billing';
import { OrganizationSettingsStore } from '@features/organization/state/organization-settings';
import { OrganizationPageHeader } from '@features/organization/ui/components';
import { EmptyState } from '@shared/empty-state';
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmItemImports } from '@shared/ui/item';
import { HlmSkeleton } from '@shared/ui/skeleton';
import { HlmTabsImports } from '@shared/ui/tabs';
import { OrganizationLogoPicker } from '../../components/organization-logo-picker';
import { OrganizationPlanSelector } from '../../components/organization-plan-selector';
import { OrganizationUsagePanel } from '../../components/organization-usage-panel';
import { OrganizationDeleteDialog } from '../../dialogs/organization-delete-dialog';
import {
  OrganizationGeneralForm,
  type OrganizationGeneralFormValues,
} from '../../forms/organization-general-form';
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
 * Component OrganizationSettingsPage
 * @class OrganizationSettingsPage
 *
 * @description
 * The organization settings route: six sections synced two-way with the
 * `?tab=` query parameter (`FEATURE.md`) — general & branding, subscription,
 * usage, notifications, regional & formats, and a permission-gated danger
 * zone. Tab content is deferred with `hlmTabsContentLazy`, so subscription
 * data (Stripe subscription, pricing, invoices, and the plan catalog owned by
 * `OrganizationPlanSelector`) loads only once the reader opens that tab, per
 * `AGENTS.md`'s hidden-UI SSR guidance.
 *
 * The page owns orchestration: it holds the settings and billing stores,
 * resolves permissions, seeds every form from the active organization, and
 * performs navigation; its children only render (`ARCHITECTURE.md` §10.1).
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-settings-page',
  imports: [
    NgIcon,
    EmptyState,
    OrganizationDeleteDialog,
    OrganizationGeneralForm,
    OrganizationLogoPicker,
    OrganizationNotificationsForm,
    OrganizationPageHeader,
    OrganizationPlanSelector,
    OrganizationRegionalForm,
    OrganizationUsagePanel,
    HlmBadge,
    HlmButton,
    HlmSkeleton,
    ...HlmAlertImports,
    ...HlmItemImports,
    ...HlmTabsImports,
  ],
  providers: [
    OrganizationSettingsStore,
    OrganizationBillingStore,
    provideIcons({
      lucideBan,
      lucideCircleAlert,
      lucideCircleCheck,
      lucideClock,
      lucideCreditCard,
      lucideDownload,
      lucideExternalLink,
      lucideReceipt,
      lucideRefreshCw,
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
  //#endregion

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
