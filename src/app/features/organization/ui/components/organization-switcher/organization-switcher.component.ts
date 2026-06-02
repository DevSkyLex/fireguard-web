import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  Signal,
  viewChild,
} from '@angular/core';
import { PRIMARY_OUTLET, Router, UrlTree } from '@angular/router';
import { Popover, PopoverModule, PopoverPassThroughOptions } from 'primeng/popover';
import type { OrganizationOutput } from '@features/organization/models';
import { OrganizationStore } from '@features/organization/state';
import {
  OrganizationSwitcherFooter,
  OrganizationSwitcherHeader,
  OrganizationSwitcherList,
  OrganizationSwitcherNav,
  OrganizationSwitcherTrigger,
} from './components';

/**
 * Component OrganizationSwitcher
 * @class OrganizationSwitcher
 *
 * @description
 * Shared dropdown selector that lets the user switch between
 * organizations. Selecting a different organization navigates
 * to `/organizations/{id}` while preserving the current sub-route.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-switcher',
  imports: [
    PopoverModule,
    OrganizationSwitcherHeader,
    OrganizationSwitcherTrigger,
    OrganizationSwitcherList,
    OrganizationSwitcherNav,
    OrganizationSwitcherFooter,
  ],
  providers: [OrganizationStore],
  templateUrl: './organization-switcher.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationSwitcher implements OnInit {
  //#region Properties
  /**
   * Property organizationStore
   * @readonly
   *
   * @description
   * Organization store for accessing the list of organizations and
   * the currently selected organization.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {OrganizationStore}
   */
  protected readonly organizationStore: OrganizationStore =
    inject<OrganizationStore>(OrganizationStore);

  /**
   * Property organizations
   * @readonly
   *
   * @description
   * Reactive organization list used by the switcher template.
   *
   * @access protected
   * @since 2.3.0
   *
   * @type {Signal<readonly OrganizationOutput[]>}
   */
  protected readonly organizations: Signal<OrganizationOutput[]> = computed(
    (): OrganizationOutput[] => [...this.organizationStore.organizations()],
  );

  /**
   * Property organizationCount
   * @readonly
   *
   * @description
   * Number of organizations available in the switcher list.
   *
   * @access protected
   * @since 2.3.0
   *
   * @type {Signal<number>}
   */
  protected readonly organizationCount: Signal<number> = computed(
    (): number => this.organizations().length,
  );

  /**
   * Property router
   * @readonly
   *
   * @description
   * Angular Router instance for imperatively navigating to the new
   * organization's dashboard when the user selects a different organization.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Router}
   */
  private readonly router: Router = inject<Router>(Router);

  /**
   * Property popover
   * @readonly
   *
   * @description
   * Reference to the PrimeNG Popover instance used to toggle the menu.
   *
   * @access private
   * @since 2.0.0
   *
   * @type {Signal<Popover>}
   */
  private readonly popover: Signal<Popover> = viewChild.required<Popover>('popover');

  /**
   * Property popoverPt
   * @readonly
   *
   * @description
   * PrimeNG Popover passthrough options to style the popover content.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {PopoverPassThroughOptions}
   */
  protected readonly popoverPt: PopoverPassThroughOptions = {
    content: {
      class: 'p-0 overflow-hidden',
    },
  };
  //#endregion

  //#region Lifecycle
  /**
   * Method ngOnInit
   * @method ngOnInit
   *
   * @description
   * Eagerly loads the organization list as soon as the switcher is mounted,
   * so the header trigger does not start fetching on hover.
   *
   * @access public
   * @since 2.2.0
   *
   * @returns {void}
   */
  public ngOnInit(): void {
    this.ensureOrganizationsLoaded();
  }
  //#endregion

  //#region Methods
  /**
   * Method onOrganizationChange
   * @method onOrganizationChange
   *
   * @description
   * When the user selects a different organization from the
   * dropdown, navigate to the new organization's dashboard.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {OrganizationOutput} organization - The newly selected organization.
   *
   *
   */
  protected onOrganizationChange(organization: OrganizationOutput): void {
    if (!organization) return;

    const popover: Popover = this.popover();
    popover.hide();

    const targetUrlTree: UrlTree = this.buildOrganizationTargetUrlTree(organization.id);
    this.router.navigateByUrl(targetUrlTree);
  }

  /**
   * Method toggle
   * @method toggle
   *
   * @description
   * Toggles the organization menu popover.
   *
   * @access protected
   * @since 2.0.0
   *
   * @param {Event} event - The click event from the trigger button.
   * @returns {void}
   */
  protected toggle(event: MouseEvent): void {
    this.ensureOrganizationsLoaded();

    const popover: Popover = this.popover();
    popover.toggle(event);
  }

  /**
   * Method closePopover
   * @method closePopover
   *
   * @description
   * Closes the popover. Called from child components that need
   * to dismiss the panel (e.g. navigation links).
   *
   * @access protected
   * @since 2.0.0
   *
   * @returns {void}
   */
  protected closePopover(): void {
    this.popover().hide();
  }

  /**
   * Method navigateToNewOrganization
   * @method navigateToNewOrganization
   *
   * @description
   * Navigates to the new organization creation page.
   *
   * @access protected
   * @since 2.0.0
   *
   * @returns {void}
   */
  protected navigateToNewOrganization(): void {
    const popover: Popover = this.popover();
    popover.hide();

    this.router.navigate(['/onboarding']);
  }

  /**
   * Method ensureOrganizationsLoaded
   * @method ensureOrganizationsLoaded
   *
   * @description
    * Loads organizations when the switcher mounts or is explicitly opened,
    * provided no list is already available and no request is in flight.
   *
   * @access private
   * @since 2.0.0
   *
   * @returns {void}
   */
  private ensureOrganizationsLoaded(): void {
    const organizations: readonly OrganizationOutput[] = this.organizationStore.organizations();
    if (organizations.length || this.organizationStore.isLoadingOrganizations()) {
      return;
    }

    this.organizationStore.loadOrganizations();
  }

  /**
   * Method buildOrganizationTargetUrlTree
   * @method buildOrganizationTargetUrlTree
   *
   * @description
   * Builds a navigation target that preserves the current sub-route, query
   * parameters and fragment when the user is already inside `/organizations/:id`.
   * Falls back to `/organizations/:id` from other areas.
   *
   * @access private
   * @since 2.3.0
   *
   * @param {string} organizationId - Target organization identifier.
   * @returns {UrlTree} Navigation target URL tree.
   */
  private buildOrganizationTargetUrlTree(organizationId: string): UrlTree {
    const currentUrlTree: UrlTree = this.router.parseUrl(this.router.url);
    const primarySegments: string[] =
      currentUrlTree.root.children[PRIMARY_OUTLET]?.segments.map((segment) => segment.path) ?? [];

    const organizationsIndex: number = primarySegments.indexOf('organizations');
    const hasOrganizationSegment: boolean =
      organizationsIndex >= 0 && organizationsIndex + 1 < primarySegments.length;

    const nextPrimarySegments: string[] = hasOrganizationSegment
      ? primarySegments.map((segment: string, index: number): string =>
          index === organizationsIndex + 1 ? organizationId : segment,
        )
      : ['organizations', organizationId];

    return this.router.createUrlTree(nextPrimarySegments, {
      queryParams: currentUrlTree.queryParams,
      fragment: currentUrlTree.fragment ?? undefined,
    });
  }
  //#endregion
}
