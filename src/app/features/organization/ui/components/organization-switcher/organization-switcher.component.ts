import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  type OnInit,
  type Signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCheck,
  lucideChevronsUpDown,
  lucideCreditCard,
  lucideHistory,
  lucidePlus,
  lucideSettings,
  lucideUsers,
} from '@ng-icons/lucide';
import { OrganizationPermissionService } from '@features/organization/access';
import type { OrganizationOutput } from '@features/organization/models';
import {
  ORGANIZATION_CONTEXT_PORT,
  type OrganizationContextPort,
} from '@features/organization/ports';
import { OrganizationStore } from '@features/organization/state';
import { getOrganizationInitials } from '@features/organization/utils';
import {
  HlmDropdownMenu,
  HlmDropdownMenuItem,
  HlmDropdownMenuSeparator,
  HlmDropdownMenuTrigger,
} from '@shared/ui/dropdown-menu';
import {
  HlmSidebarMenu,
  HlmSidebarMenuButton,
  HlmSidebarMenuItem,
  HlmSidebarService,
} from '@shared/ui/sidebar';
import { HlmSkeleton } from '@shared/ui/skeleton';
import { OrganizationAvatar } from '../organization-avatar';
import { ORGANIZATION_SWITCHER_QUICK_LINKS } from './constants/organization-switcher-quick-link.constants';
import type { OrganizationSwitcherOption, OrganizationSwitcherQuickLink } from './models';

/**
 * Component OrganizationSwitcher
 * @class OrganizationSwitcher
 *
 * @description
 * The sidebar header: the organization currently selected, and a menu to switch
 * to another or create one. The paired chevrons are the affordance — without
 * them the row reads as a title rather than as a control.
 *
 * There is no "none selected" state: the workspace last worked in stays open
 * on the account and every other global page, so the trigger always has an
 * organization to name once the list has arrived. Picking another simply
 * navigates to `/organizations/:organizationId` — the URL is still what
 * chooses; it is only the memory of it that outlives the route.
 *
 * Feature-owned rather than layout-owned because it reads organization state;
 * the shell only lends it a slot (`ARCHITECTURE.md` §2.7). It is contributed
 * through `withOrganizationSwitcher()`.
 *
 * The menu header repeats the trigger's identity (logo, name, plan) so the
 * open panel still names the workspace once the trigger itself is covered.
 * Below it, four admin shortcuts (Settings, Billing, Members, Audit journal)
 * are filtered through {@link OrganizationPermissionService} and rendered as
 * real `routerLink`s — the same permission mechanism
 * `organization-navigation.config.ts` uses for the sidebar, reused rather
 * than re-implemented. The organization list panel below that caps itself to
 * three visible rows and scrolls for the rest.
 *
 * "Leave organization…" is not offered here — it lives at
 * `/account/organizations`, reachable by every signed-in member regardless
 * of organization permission (`features/account/FEATURE.md`).
 *
 * @version 3.0.0
 *
 * @example
 * ```html
 * <app-organization-switcher />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-switcher',
  imports: [
    OrganizationAvatar,
    NgIcon,
    RouterLink,
    HlmDropdownMenu,
    HlmDropdownMenuItem,
    HlmDropdownMenuSeparator,
    HlmDropdownMenuTrigger,
    HlmSidebarMenu,
    HlmSidebarMenuButton,
    HlmSidebarMenuItem,
    HlmSkeleton,
  ],
  providers: [
    OrganizationStore,
    provideIcons({
      lucideCheck,
      lucideChevronsUpDown,
      lucideCreditCard,
      lucideHistory,
      lucidePlus,
      lucideSettings,
      lucideUsers,
    }),
  ],
  templateUrl: './organization-switcher.component.html',
  host: { class: 'block min-w-0' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationSwitcher implements OnInit {
  //#region Properties
  /**
   * Property organizationStore
   * @readonly
   *
   * @description
   * Component-scoped list of the organizations the member belongs to.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {OrganizationStore}
   */
  private readonly organizationStore: OrganizationStore =
    inject<OrganizationStore>(OrganizationStore);

  /**
   * Property permissions
   * @readonly
   *
   * @description
   * Feature-owned permission checks, reused to gate the menu's admin
   * shortcuts with the same mechanism `organization-navigation.config.ts`
   * uses for the sidebar.
   *
   * @access private
   * @since 3.0.0
   *
   * @type {OrganizationPermissionService}
   */
  private readonly permissions: OrganizationPermissionService =
    inject<OrganizationPermissionService>(OrganizationPermissionService);

  /**
   * Property organizationContext
   * @readonly
   *
   * @description
   * The routed organization, read through the port rather than through the
   * component-scoped list store, whose own selection would not follow the URL.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {OrganizationContextPort}
   */
  private readonly organizationContext: OrganizationContextPort =
    inject<OrganizationContextPort>(ORGANIZATION_CONTEXT_PORT);

  /**
   * Property router
   * @readonly
   *
   * @description
   * Used to switch organization and to reach organization creation.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Router}
   */
  private readonly router: Router = inject<Router>(Router);

  /**
   * Property sidebar
   * @readonly
   *
   * @description
   * Shell state, read only to place the menu.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {HlmSidebarService}
   */
  private readonly sidebar: HlmSidebarService = inject<HlmSidebarService>(HlmSidebarService);

  /**
   * Property options
   * @readonly
   *
   * @description
   * One option per organization the member belongs to, in list order.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly OrganizationSwitcherOption[]>}
   */
  protected readonly options: Signal<readonly OrganizationSwitcherOption[]> = computed(
    (): readonly OrganizationSwitcherOption[] => {
      const activeId: string | null = this.organizationContext.selectedOrganizationId();

      return this.organizationStore
        .organizations()
        .map((organization: OrganizationOutput): OrganizationSwitcherOption =>
          this.toOption(organization, organization.id === activeId),
        );
    },
  );

  /**
   * Property active
   * @readonly
   *
   * @description
   * The organization currently open, taken from the resolved resource and
   * falling back to the matching row of the list — which is what a global page
   * reached directly has, since nothing resolved the resource there.
   *
   * `null` means the trigger has nothing to show *yet*, and the header renders
   * a skeleton: a signed-in reader always has a workspace, the landing guard
   * having sent anyone without one to onboarding.
   *
   * @access protected
   * @since 3.0.0
   *
   * @type {Signal<OrganizationSwitcherOption | null>}
   */
  protected readonly active: Signal<OrganizationSwitcherOption | null> = computed(
    (): OrganizationSwitcherOption | null => {
      const organization: OrganizationOutput | null =
        this.organizationContext.selectedOrganization();

      if (organization) return this.toOption(organization, true);

      return (
        this.options().find((option: OrganizationSwitcherOption): boolean => option.active) ?? null
      );
    },
  );

  /**
   * Property menuSide
   * @readonly
   *
   * @description
   * Where the menu opens: beside the column on desktop, above it once the
   * sidebar is a bottom-anchored sheet.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<'top' | 'right'>}
   */
  protected readonly menuSide: Signal<'top' | 'right'> = computed((): 'top' | 'right' =>
    this.sidebar.isMobile() ? 'top' : 'right',
  );

  /**
   * Property quickLinks
   * @readonly
   *
   * @description
   * The menu's admin shortcuts the active member may actually reach, routes
   * already prefixed by the open organization. Empty before an organization
   * has resolved, or once none of the four permissions is granted — the
   * template drops the whole block, separator included, in that case.
   *
   * @access protected
   * @since 3.0.0
   *
   * @type {Signal<ReadonlyArray<OrganizationSwitcherQuickLink>>}
   */
  protected readonly quickLinks: Signal<ReadonlyArray<OrganizationSwitcherQuickLink>> = computed(
    (): ReadonlyArray<OrganizationSwitcherQuickLink> => {
      const organizationId: string | undefined = this.active()?.id;
      if (organizationId === undefined) return [];

      const prefix = `/organizations/${organizationId}`;

      return ORGANIZATION_SWITCHER_QUICK_LINKS.filter((definition): boolean =>
        definition.match === 'any'
          ? this.permissions.hasAnyPermission(definition.permissions)
          : this.permissions.hasAllPermissions(definition.permissions),
      ).map((definition): OrganizationSwitcherQuickLink => ({
        id: definition.id,
        label: definition.label,
        icon: definition.icon,
        route: `${prefix}/${definition.path}`,
        queryParams: definition.queryParams,
      }));
    },
  );

  //#endregion

  //#region Lifecycle
  /**
   * Method ngOnInit
   * @method ngOnInit
   *
   * @description
   * Loads the organization list when nothing has fetched it yet — a member
   * landing straight on a workspace URL has no other trigger.
   *
   * @access public
   * @since 1.0.0
   *
   * @returns {void}
   */
  public ngOnInit(): void {
    if (this.organizationStore.organizations().length > 0) return;
    if (this.organizationStore.isLoadingOrganizations()) return;

    this.organizationStore.loadOrganizations();
  }
  //#endregion

  //#region Methods
  /**
   * Method select
   * @method select
   *
   * @description
   * Selects an organization by navigating to its main page — the URL is what
   * makes an organization active, so nothing else here has to be set.
   *
   * The previous shell carried the current section across when every
   * organization had it, which needs the feature's navigation catalog — removed
   * with the interface layer. Restore that behaviour with the catalog, not with
   * a hard-coded list.
   *
   * @access protected
   * @since 2.0.0
   *
   * @param {OrganizationSwitcherOption} option - Organization the member picked.
   *
   * @returns {void}
   */
  protected select(option: OrganizationSwitcherOption): void {
    if (option.active) return;

    void this.router.navigate(['/organizations', option.id]);
  }

  /**
   * Method createOrganization
   * @method createOrganization
   *
   * @description
   * Sends the member to the guided organization setup.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected createOrganization(): void {
    void this.router.navigate(['/onboarding']);
  }

  //#endregion

  //#region Internals
  /**
   * Method toOption
   * @method toOption
   *
   * @description
   * Derives the rendered shape of one organization.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {OrganizationOutput} organization - The transport resource.
   * @param {boolean} active - Whether it is the one currently routed.
   *
   * @returns {OrganizationSwitcherOption} The option the template renders.
   */
  private toOption(organization: OrganizationOutput, active: boolean): OrganizationSwitcherOption {
    return {
      id: organization.id,
      name: organization.name,
      initials: getOrganizationInitials(organization.name),
      // API Platform omits null fields, so these arrive `undefined` rather than
      // null — a `=== null` guard would let them through.
      logoUrl: organization.logoUrl ?? null,
      planName: organization.planName ?? null,
      active,
    };
  }
  //#endregion
}
