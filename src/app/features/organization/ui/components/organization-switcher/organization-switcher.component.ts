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
import { lucideCheck, lucideChevronsUpDown, lucidePlus } from '@ng-icons/lucide';
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
 * The sidebar header: the organization currently open, and a menu to switch to
 * another or create one. The paired chevrons are the affordance — without them
 * the row reads as a title rather than as a control.
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
  providers: [OrganizationStore, provideIcons({ lucideCheck, lucideChevronsUpDown, lucidePlus })],
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
   * The organization currently open, or `null` before the route resolves.
   *
   * @access protected
   * @since 1.0.0
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
   * Whether the trigger has nothing to show yet.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly isLoading: Signal<boolean> = computed(
    (): boolean => this.active() === null && this.organizationContext.isLoadingOrganization(),
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
   * Switches the workspace to another organization, landing on its root.
   *
   * The previous shell carried the current section across when every
   * organization had it, which needs the feature's navigation catalog — removed
   * with the interface layer. Restore that behaviour with the catalog, not with
   * a hard-coded list.
   *
   * @access protected
   * @since 1.0.0
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
