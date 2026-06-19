import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService, type MenuItem } from 'primeng/api';
import { CardModule, type CardPassThroughOptions } from 'primeng/card';
import { MenuModule, type MenuPassThroughOptions } from 'primeng/menu';
import { MessageModule } from 'primeng/message';
import { map } from 'rxjs';
import { OrganizationPermissionService } from '@features/organization/access';
import {
  ORGANIZATION_PERMISSION,
  type UpdateOrganizationInput,
} from '@features/organization/models';
import { ActiveOrganizationStore, OrganizationSettingsStore } from '@features/organization/state';
import { OrganizationDangerZone } from '@features/organization/ui/components';
import {
  OrganizationGeneralForm,
  OrganizationNotificationsForm,
  OrganizationRegionalForm,
} from '@features/organization/ui/forms';
import { OrganizationDeleteDialog } from '../../dialogs/organization-delete-dialog';
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
interface OrganizationSettingsNavItem {
  readonly id: OrganizationSettingsTab;
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
    MessageModule,
    OrganizationGeneralForm,
    OrganizationNotificationsForm,
    OrganizationRegionalForm,
    OrganizationDangerZone,
    OrganizationDeleteDialog,
  ],
  providers: [OrganizationSettingsStore],
  templateUrl: './organization-settings.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationSettingsPage {
  //#region Properties
  /** Active route used to read and update the selected settings section. */
  private readonly route: ActivatedRoute = inject(ActivatedRoute);
  /** Router used to persist the selected section in the URL. */
  private readonly router: Router = inject(Router);
  /** PrimeNG message service used for save feedback. */
  private readonly messageService: MessageService = inject(MessageService);
  /** Active organization context store. */
  protected readonly activeOrganizationStore: ActiveOrganizationStore =
    inject(ActiveOrganizationStore);
  /** Page-scoped settings workflow store. */
  protected readonly store: OrganizationSettingsStore = inject(OrganizationSettingsStore);
  /** Permission helper used to gate the danger-zone actions. */
  private readonly permissionService: OrganizationPermissionService = inject(
    OrganizationPermissionService,
  );

  /** Whether the active member may delete the organization. */
  protected readonly canDeleteOrganization: Signal<boolean> = computed(() =>
    this.permissionService.hasPermission(ORGANIZATION_PERMISSION.DELETE),
  );

  /** Visibility of the delete confirmation dialog. */
  protected readonly deleteDialogVisible: WritableSignal<boolean> = signal<boolean>(false);

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
        label: 'General',
        icon: 'pi pi-cog',
        description: 'Name, slug, description, logo and active status.',
      },
      {
        id: 'notifications',
        label: 'Notifications',
        icon: 'pi pi-bell',
        description: 'Delivery channels and event notifications.',
      },
      {
        id: 'regional',
        label: 'Regional & formats',
        icon: 'pi pi-globe',
        description: 'Timezone, locale, date format and units.',
      },
    ];

    if (this.canDeleteOrganization()) {
      items.push({
        id: 'danger',
        label: 'Danger zone',
        icon: 'pi pi-exclamation-triangle',
        description: 'Irreversible actions for this organization.',
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

  /** Bordered flat surface for the section content card (matches the account page). */
  protected readonly sectionCardPt: CardPassThroughOptions = {
    root: {
      class:
        'border border-surface-200 dark:border-surface-800 bg-surface-0 dark:bg-surface-900 shadow-none',
    },
    body: { class: 'p-6' },
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
        command: (): void => this.onTabChange(item.id),
      }),
    ),
  );
  //#endregion

  //#region Methods
  /** Surfaces save and logo-upload outcomes as toasts. */
  public constructor() {
    effect(() => {
      if (this.store.saveSucceeded()) {
        this.messageService.add({
          severity: 'success',
          summary: 'Settings saved',
          detail: 'The organization settings have been updated.',
        });
      }
    });

    effect(() => {
      if (this.store.uploadLogoSucceeded()) {
        this.messageService.add({
          severity: 'success',
          summary: 'Logo updated',
          detail: 'The organization logo has been updated.',
        });
      }
    });

    effect(() => {
      if (this.store.deleteSucceeded()) {
        this.deleteDialogVisible.set(false);
        this.activeOrganizationStore.clear();
        this.messageService.add({
          severity: 'success',
          summary: 'Organization deleted',
          detail: 'The organization has been permanently deleted.',
        });
        void this.router.navigate(['/organizations']);
      }
    });
  }

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

  /**
   * Method openDeleteDialog
   *
   * @description
   * Opens the delete confirmation dialog.
   *
   * @returns {void}
   */
  protected openDeleteDialog(): void {
    this.deleteDialogVisible.set(true);
  }

  /**
   * Method confirmDelete
   *
   * @description
   * Triggers permanent deletion of the active organization.
   *
   * @returns {void}
   */
  protected confirmDelete(): void {
    const organizationId = this.activeOrganizationStore.selectedOrganization()?.id;
    if (organizationId) this.store.deleteOrganization({ organizationId });
  }
  //#endregion
}
