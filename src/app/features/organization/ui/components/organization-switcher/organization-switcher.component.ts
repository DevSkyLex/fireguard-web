import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  Signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
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

    const currentUrl: string = this.router.url;
    const orgPattern: RegExp = /\/organizations\/[^/?#]+/;

    // If already on an organization page, swap the org segment and keep the sub-route.
    // Otherwise, redirect to the selected organization's dashboard.
    const newUrl: string = orgPattern.test(currentUrl)
      ? currentUrl.replace(orgPattern, `/organizations/${organization.id}`)
      : `/organizations/${organization.id}`;

    this.router.navigateByUrl(newUrl);
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
  //#endregion
}
