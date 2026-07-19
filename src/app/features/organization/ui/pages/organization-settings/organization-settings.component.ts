import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { type MenuItem } from 'primeng/api';
import { CardModule, type CardPassThroughOptions } from 'primeng/card';
import { MenuModule, type MenuPassThroughOptions } from 'primeng/menu';
import { map } from 'rxjs';
import { OrganizationPermissionService } from '@features/organization/access';
import {
  ORGANIZATION_PERMISSION,
  type UpdateOrganizationInput,
} from '@features/organization/models';
import { ActiveOrganizationStore } from '@features/organization/state';
import { OrganizationSettingsStore } from '@features/organization/state/organization-settings';
import {
  OrganizationPlanSelector,
  OrganizationUsagePanel,
} from '@features/organization/ui/components';
import {
  OrganizationGeneralForm,
  OrganizationNotificationsForm,
  OrganizationRegionalForm,
} from '@features/organization/ui/forms';
import { DEFAULT_ORGANIZATION_SETTINGS_TAB, ORGANIZATION_SETTINGS_TABS } from './constants';
import type { OrganizationSettingsTab } from './models';

/**
 * Type OrganizationSettingsNavItem
 *
 * @description
 * Vertical-navigation entry describing one settings section.
 *
 * @since 1.0.0
 */
type OrganizationSettingsRoute = 'legal' | 'danger';

/** Whether a menu entry leaves the page for a sibling settings route. */
function isSettingsRoute(
  id: OrganizationSettingsTab | OrganizationSettingsRoute,
): id is OrganizationSettingsRoute {
  return id === 'legal' || id === 'danger';
}

interface OrganizationSettingsNavItem {
  /**
   * Either an in-page section (`?tab=`) or a sibling settings **route**.
   * `legal` and `danger` are routes — they carry their own guard — but they
   * still belong in this menu, which is where users look for them.
   */
  readonly id: OrganizationSettingsTab | OrganizationSettingsRoute;
  readonly label: string;
  readonly icon: string;
  readonly description: string;
}

/**
 * Page OrganizationSettingsPage
 * @class OrganizationSettingsPage
 *
 * @description
 * Single entry page for an organization's settings. Presents a sticky vertical
 * navigation that switches between settings sections, synchronized with the
 * `tab` query parameter: general & branding, notifications, regional & formats,
 * and a permission-gated danger zone (organization deletion).
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-settings',
  imports: [
    CardModule,
    MenuModule,
    OrganizationGeneralForm,
    OrganizationNotificationsForm,
    OrganizationRegionalForm,
    OrganizationPlanSelector,
    OrganizationUsagePanel,
  ],
  providers: [OrganizationSettingsStore],
  templateUrl: './organization-settings.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationSettingsPage {
  //#region Properties
  /** Active route used to read and update the selected settings section. */
  private readonly route: ActivatedRoute = inject<ActivatedRoute>(ActivatedRoute);
  /** Router used to persist the selected section in the URL. */
  private readonly router: Router = inject<Router>(Router);
  /** Active organization context store. */
  protected readonly activeOrganizationStore: ActiveOrganizationStore =
    inject<ActiveOrganizationStore>(ActiveOrganizationStore);
  /** Page-scoped settings workflow store. */
  protected readonly store: OrganizationSettingsStore =
    inject<OrganizationSettingsStore>(OrganizationSettingsStore);
  /** Permission helper used to gate the danger-zone actions. */
  private readonly permissionService: OrganizationPermissionService = inject(
    OrganizationPermissionService,
  );

  /** Whether the active member may delete the organization. */
  protected readonly canDeleteOrganization: Signal<boolean> = computed(() =>
    this.permissionService.hasPermission(ORGANIZATION_PERMISSION.DELETE),
  );

  /** Currently selected settings section derived from the `tab` query parameter. */
  protected readonly activeTab: Signal<OrganizationSettingsTab> = toSignal(
    this.route.queryParamMap.pipe(
      map((params): OrganizationSettingsTab => {
        const tab: string | null = params.get('tab');
        return tab !== null && ORGANIZATION_SETTINGS_TABS.has(tab)
          ? (tab as OrganizationSettingsTab)
          : DEFAULT_ORGANIZATION_SETTINGS_TAB;
      }),
    ),
    { initialValue: DEFAULT_ORGANIZATION_SETTINGS_TAB },
  );

  /**
   * Settings sections rendered as entries in the vertical navigation menu. The
   * danger-zone entry is only present when the active member may delete the
   * organization.
   */
  protected readonly navItems: Signal<ReadonlyArray<OrganizationSettingsNavItem>> = computed(() => {
    const items: OrganizationSettingsNavItem[] = [
      {
        id: 'general',
        label: $localize`:@@org.settings.general:General`,
        icon: 'pi pi-cog',
        description: $localize`:@@org.settings.generalDesc:Name, slug, description, logo and active status.`,
      },
      {
        id: 'legal',
        label: $localize`:@@org.settings.legal:Legal profile`,
        icon: 'pi pi-id-card',
        description: $localize`:@@org.settings.legalDesc:Registered name, entity type, registration and VAT numbers.`,
      },
      {
        id: 'subscription',
        label: $localize`:@@org.settings.subscription:Subscription`,
        icon: 'pi pi-star',
        description: $localize`:@@org.settings.subscriptionDesc:Choose the plan that fits your organization.`,
      },
      {
        id: 'usage',
        label: $localize`:@@org.settings.usage:Usage`,
        icon: 'pi pi-gauge',
        description: $localize`:@@org.settings.usageDesc:Resource consumption against your plan limits.`,
      },
      {
        id: 'notifications',
        label: $localize`:@@org.settings.notifications:Notifications`,
        icon: 'pi pi-bell',
        description: $localize`:@@org.settings.notificationsDesc:Delivery channels and event notifications.`,
      },
      {
        id: 'regional',
        label: $localize`:@@org.settings.regional:Regional & formats`,
        icon: 'pi pi-globe',
        description: $localize`:@@org.settings.regionalDesc:Timezone, locale, date format and units.`,
      },
    ];

    if (this.canDeleteOrganization()) {
      items.push({
        id: 'danger',
        label: $localize`:@@org.settings.danger:Danger zone`,
        icon: 'pi pi-exclamation-triangle',
        description: $localize`:@@org.settings.dangerDesc:Irreversible actions for this organization.`,
      });
    }

    return items;
  });

  /** Navigation entry matching the active section, used for the content header. */
  protected readonly activeSection: Signal<OrganizationSettingsNavItem> = computed(() => {
    const tab: OrganizationSettingsTab = this.activeTab();
    return this.navItems().find((item) => item.id === tab) ?? this.navItems()[0];
  });

  /** Borderless, transparent navigation menu styling (matches the account page). */
  protected readonly navMenuPt: MenuPassThroughOptions = {
    root: { class: 'w-full border-0 bg-transparent p-0' },
    list: { class: 'flex flex-col gap-0.5 p-0' },
    itemIcon: { class: 'text-surface-500 dark:text-surface-400' },
  };

  /**
   * Bordered section content card; background, radius and per-theme elevation
   * come from the PrimeNG card preset tokens.
   */
  protected readonly sectionCardPt: CardPassThroughOptions = {
    root: {
      class: 'border border-surface-200 dark:border-surface-800',
    },
  };

  /** PrimeNG menu model derived from the settings sections. */
  protected readonly menuItems: Signal<MenuItem[]> = computed(() =>
    this.navItems().map(
      (item): MenuItem => ({
        id: item.id,
        label: item.label,
        icon: item.icon,
        styleClass:
          this.activeTab() === item.id
            ? 'relative before:absolute before:-left-2 before:inset-y-1.5 before:w-1 before:rounded-full before:bg-primary ' +
              '[&>.p-menu-item-content]:bg-surface-100 dark:[&>.p-menu-item-content]:bg-surface-800 ' +
              '[&_.p-menu-item-label]:font-semibold [&_.p-menu-item-label]:text-surface-900 dark:[&_.p-menu-item-label]:text-surface-50'
            : undefined,
        command: (): void =>
          isSettingsRoute(item.id)
            ? void this.router.navigate([`../${item.id}`], { relativeTo: this.route })
            : this.onTabChange(item.id),
      }),
    ),
  );
  //#endregion

  //#region Methods
  /**
   * Reacts to a successful deletion by clearing the active organization context
   * and navigating away. Save, logo-upload and deletion toasts (success and
   * error) are produced centrally from the settings store's feedback events.
   */
  /**
   * Method onTabChange
   *
   * @description
   * Persists the selected settings section in the `tab` query parameter.
   *
   * @param {string | number | undefined} value - Selected tab identifier.
   * @returns {void}
   */
  protected onTabChange(value: string | number | undefined): void {
    if (value === undefined) return;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: value },
      queryParamsHandling: 'merge',
    });
  }

  /**
   * Method save
   *
   * @description
   * Persists the general settings emitted by the form for the active organization.
   *
   * @param {UpdateOrganizationInput} input - Settings fields to persist.
   * @returns {void}
   */
  protected save(input: UpdateOrganizationInput): void {
    const organizationId = this.activeOrganizationStore.selectedOrganization()?.id;
    if (organizationId) this.store.save({ organizationId, input });
  }

  /**
   * Method uploadLogo
   *
   * @description
   * Uploads the selected logo file for the active organization.
   *
   * @param {File} file - The logo image to upload.
   * @returns {void}
   */
  protected uploadLogo(file: File): void {
    const organizationId = this.activeOrganizationStore.selectedOrganization()?.id;
    if (organizationId) this.store.uploadLogo({ organizationId, file, fileName: file.name });
  }

  //#endregion
}
