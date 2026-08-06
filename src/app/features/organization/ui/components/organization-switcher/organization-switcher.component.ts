import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  type OnInit,
  type Signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideBuilding2, lucideCheck, lucideChevronsUpDown, lucidePlus } from '@ng-icons/lucide';
import type { OrganizationOutput } from '@features/organization/models';
import {
  ORGANIZATION_CONTEXT_PORT,
  type OrganizationContextPort,
} from '@features/organization/ports';
import { OrganizationStore } from '@features/organization/state';
import { getOrganizationInitials } from '@features/organization/utils';
import { HlmAvatar, HlmAvatarFallback, HlmAvatarImage } from '@shared/ui/avatar';
import {
  HlmDropdownMenu,
  HlmDropdownMenuItem,
  HlmDropdownMenuLabel,
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
import type { OrganizationSwitcherOption } from './models';

/**
 * Component OrganizationSwitcher
 * @class OrganizationSwitcher
 *
 * @description
 * The sidebar header: the organization currently selected, and a menu to switch
 * to another or create one. The paired chevrons are the affordance — without
 * them the row reads as a title rather than as a control.
 *
 * "None selected" is a state of its own, not an empty trigger: it says so, and
 * says whether that is because the reader has to choose one or because they
 * have none yet. It is also the ordinary state of every global page — the URL
 * is what selects an organization, and those name none — which is why picking
 * one simply navigates to `/organizations/:organizationId`.
 *
 * Feature-owned rather than layout-owned because it reads organization state;
 * the shell only lends it a slot (`ARCHITECTURE.md` §2.7). It is contributed
 * through `withOrganizationSwitcher()`.
 *
 * @version 1.0.0
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
    NgIcon,
    HlmAvatar,
    HlmAvatarFallback,
    HlmAvatarImage,
    HlmDropdownMenu,
    HlmDropdownMenuItem,
    HlmDropdownMenuLabel,
    HlmDropdownMenuSeparator,
    HlmDropdownMenuTrigger,
    HlmSidebarMenu,
    HlmSidebarMenuButton,
    HlmSidebarMenuItem,
    HlmSkeleton,
  ],
  providers: [
    OrganizationStore,
    provideIcons({ lucideBuilding2, lucideCheck, lucideChevronsUpDown, lucidePlus }),
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
   * The organization currently selected, or `null` when none is — which is the
   * ordinary state of every global page, since only the URL selects one.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<OrganizationSwitcherOption | null>}
   */
  protected readonly active: Signal<OrganizationSwitcherOption | null> = computed(
    (): OrganizationSwitcherOption | null => {
      const organization: OrganizationOutput | null =
        this.organizationContext.selectedOrganization();

      return organization ? this.toOption(organization, true) : null;
    },
  );

  /**
   * Property isLoading
   * @readonly
   *
   * @description
   * Whether the trigger has nothing to show *yet*, as opposed to nothing to
   * show at all — the difference between a skeleton and the empty state.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly isLoading: Signal<boolean> = computed(
    (): boolean => this.active() === null && this.organizationContext.isLoadingOrganization(),
  );

  /**
   * Property hasOrganizations
   * @readonly
   *
   * @description
   * Whether the reader belongs to any organization at all, which decides
   * whether "none selected" means "pick one" or "create your first".
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly hasOrganizations: Signal<boolean> = computed(
    (): boolean => this.options().length > 0,
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
