import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
  type EffectRef,
  type OnInit,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck, lucideChevronsUpDown, lucideLogOut, lucidePlus } from '@ng-icons/lucide';
import type { OrganizationOutput } from '@features/organization/models';
import {
  ORGANIZATION_CONTEXT_PORT,
  type OrganizationContextPort,
} from '@features/organization/ports';
import { ActiveOrganizationStore, OrganizationStore } from '@features/organization/state';
import { OrganizationSettingsStore } from '@features/organization/state/organization-settings';
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
import { OrganizationLeaveDialog } from '../../dialogs/organization-leave-dialog';
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
 * The menu's own "Leave organization…" entry is the only reachable path a
 * rank-and-file member has to leave the open organization — the settings
 * danger tab that already offers it is gated behind `organization.delete`,
 * which most members never hold. It renders unconditionally for every
 * member, including the owner: the backend's self-service
 * `LeaveOrganizationProcessor` checks nothing beyond active membership, and
 * its owner/last-administrator refusals surface as {@link OrganizationLeaveDialog}'s
 * inline error rather than being re-derived client-side here. Provides its
 * own {@link OrganizationSettingsStore} instance to reuse
 * {@link OrganizationSettingsStore.leave} rather than re-implement the call —
 * the store is designed for component-level provisioning, and this menu
 * needs only that one method of its wider mutation surface.
 *
 * @version 2.0.0
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
    OrganizationLeaveDialog,
  ],
  providers: [
    OrganizationStore,
    OrganizationSettingsStore,
    provideIcons({ lucideCheck, lucideChevronsUpDown, lucideLogOut, lucidePlus }),
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
   * Property settingsStore
   * @readonly
   *
   * @description
   * Component-scoped instance of the same store the settings danger tab
   * uses, provided fresh here so the menu's "Leave organization…" entry
   * reuses {@link OrganizationSettingsStore.leave} instead of duplicating
   * the call.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {OrganizationSettingsStore}
   */
  protected readonly settingsStore: OrganizationSettingsStore =
    inject<OrganizationSettingsStore>(OrganizationSettingsStore);

  /**
   * Property activeOrganizationStore
   * @readonly
   *
   * @description
   * Root-provided active-organization context, cleared once leaving
   * succeeds — mirroring `OrganizationSettingsPage`'s own post-leave
   * cleanup.
   *
   * @access private
   * @since 2.0.0
   *
   * @type {ActiveOrganizationStore}
   */
  private readonly activeOrganizationStore: ActiveOrganizationStore =
    inject<ActiveOrganizationStore>(ActiveOrganizationStore);

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
   * Property confirmingLeave
   * @readonly
   *
   * @description
   * Whether the "Leave organization…" confirmation dialog is open.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly confirmingLeave: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property previousLeaveStatus
   *
   * @description
   * The leave call state as of the last time {@link navigateAwayOnLeave} ran,
   * so it can spot the transition into success rather than the state of
   * being in it.
   *
   * @access private
   * @since 2.0.0
   *
   * @type {string}
   */
  private previousLeaveStatus: string = 'idle';

  /**
   * Property navigateAwayOnLeave
   * @readonly
   *
   * @description
   * Once leaving succeeds, closes the dialog, clears the active organization
   * context and returns to the organization redirector — mirroring
   * `OrganizationSettingsPage`'s own `navigateAwayOnLeave`.
   *
   * @access private
   * @since 2.0.0
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

  /**
   * Method openLeaveDialog
   * @method openLeaveDialog
   *
   * @description
   * Opens the "Leave organization…" confirmation for the open organization.
   * Rendered for every member regardless of role — the backend's own
   * owner/last-administrator refusals are what gate the actual departure.
   *
   * @access protected
   * @since 2.0.0
   *
   * @returns {void}
   */
  protected openLeaveDialog(): void {
    if (this.active() === null) return;

    this.confirmingLeave.set(true);
  }

  /**
   * Method leaveOrganization
   * @method leaveOrganization
   *
   * @description
   * Deactivates the acting member's own membership in the open organization
   * once the dialog is confirmed.
   *
   * @access protected
   * @since 2.0.0
   *
   * @returns {void}
   */
  protected leaveOrganization(): void {
    const organizationId: string | undefined = this.active()?.id;
    if (organizationId === undefined) return;

    this.settingsStore.leave({ organizationId });
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
