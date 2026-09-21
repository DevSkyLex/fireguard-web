import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
  type InputSignal,
  type WritableSignal,
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
  lucideWebhook,
  lucidePlus,
  lucideSettings,
  lucideUsers,
} from '@ng-icons/lucide';
import { BrnCommandInput } from '@spartan-ng/brain/command';
import {
  formatShortcut as formatPlatformShortcut,
  INTERACTION_CAPABILITIES_PORT,
  type InteractionCapabilitiesPort,
  type ShortcutModifier,
} from '@core/interaction-capabilities';
import { OrganizationPermissionService } from '@features/organization/access';
import type { OrganizationOutput } from '@features/organization/models';
import { ORGANIZATION_SWITCHER_QUICK_LINKS } from '@features/organization/navigation';
import {
  ORGANIZATION_CONTEXT_PORT,
  type OrganizationContextPort,
} from '@features/organization/ports';
import { OrganizationStore } from '@features/organization/state';
import { getOrganizationInitials } from '@features/organization/utils';
import { HlmButton } from '@shared/ui/button';
import { HlmCommandImports } from '@shared/ui/command';
import { HlmDrawerImports } from '@shared/ui/drawer';
import {
  HlmDropdownMenu,
  HlmDropdownMenuItem,
  HlmDropdownMenuSeparator,
  HlmDropdownMenuShortcut,
  HlmDropdownMenuTrigger,
} from '@shared/ui/dropdown-menu';
import { HlmInputGroupImports } from '@shared/ui/input-group';
import {
  HlmSidebarMenu,
  HlmSidebarMenuButton,
  HlmSidebarMenuItem,
  HlmSidebarService,
} from '@shared/ui/sidebar';
import { HlmSkeleton } from '@shared/ui/skeleton';
import { OrganizationAvatar } from '../organization-avatar';
import type { OrganizationSwitcherOption, OrganizationSwitcherQuickLink } from './models';

/**
 * Component OrganizationSwitcher
 * @class OrganizationSwitcher
 *
 * @description
 * The organization picker used by the sidebar and mobile More page names the
 * current workspace and opens a surface to switch or create one. The paired chevrons are the affordance — without
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
 * Below it, five admin destinations (Settings, Billing, Members, Webhooks, Audit journal)
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
    BrnCommandInput,
    HlmInputGroupImports,
    OrganizationAvatar,
    NgIcon,
    RouterLink,
    HlmDropdownMenu,
    HlmDropdownMenuItem,
    HlmDropdownMenuSeparator,
    HlmDropdownMenuShortcut,
    HlmDropdownMenuTrigger,
    HlmSidebarMenu,
    HlmSidebarMenuButton,
    HlmSidebarMenuItem,
    HlmSkeleton,
    HlmButton,
    ...HlmDrawerImports,
    ...HlmCommandImports,
  ],
  providers: [
    OrganizationStore,
    provideIcons({
      lucideCheck,
      lucideChevronsUpDown,
      lucideCreditCard,
      lucideHistory,
      lucideWebhook,
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
  /**
   * Property triggerId
   * @readonly
   * @description Distinguishes the hub switcher from a simultaneously rendered desktop sidebar.
   * @access public
   * @since 4.0.0
   * @type {InputSignal<string>}
   */
  public readonly triggerId: InputSignal<string> = input('organization-switcher-trigger');

  /**
   * Property interactionCapabilities
   * @readonly
   * @description Central interaction-capabilities contract, independent of compact sidebar geometry.
   * @access protected
   * @since 4.0.0
   * @type {InteractionCapabilitiesPort}
   */
  protected readonly interactionCapabilities: InteractionCapabilitiesPort = inject(
    INTERACTION_CAPABILITIES_PORT,
  );

  /**
   * Property shortcutModifier
   * @readonly
   * @description Modifier displayed by the organization dropdown shortcut hints.
   * @access protected
   * @since 4.0.0
   * @type {Signal<ShortcutModifier>}
   */
  protected readonly shortcutModifier: Signal<ShortcutModifier> =
    this.interactionCapabilities.shortcutModifier;

  /**
   * Property mobileSwitcherState
   * @readonly
   * @description Closes keyboard-selected destinations as well as pointer selections.
   * @access protected
   * @since 4.0.0
   * @type {WritableSignal<'open' | 'closed'>}
   */
  protected readonly mobileSwitcherState: WritableSignal<'open' | 'closed'> = signal('closed');

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
        shortcutKey: definition.shortcutKey,
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
   * Method formatShortcut
   * @method formatShortcut
   * @description Formats one menu shortcut with the detected platform modifier.
   * @access protected
   * @since 4.0.0
   * @param {string} key - Shortcut key to display.
   * @returns {string} Platform-appropriate shortcut hint.
   */
  protected formatShortcut(key: string): string {
    return formatPlatformShortcut(this.shortcutModifier(), key);
  }

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
   * @returns {boolean} Whether another organization was selected.
   */
  protected select(option: OrganizationSwitcherOption): boolean {
    if (option.active) return false;

    void this.router.navigate(['/organizations', option.id]);
    return true;
  }

  //#endregion

  //#region Internals
  /**
   * Method toOption
   * @method toOption
   *
   * @description
   * Derives the rendered shape of one organization, normalizing omitted nullable fields.
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
      logoUrl: organization.logoUrl ?? null,
      planName: organization.planName ?? null,
      active,
    };
  }
  //#endregion
}
