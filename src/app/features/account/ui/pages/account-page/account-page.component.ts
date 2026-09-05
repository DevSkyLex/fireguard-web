import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  type Signal,
  type TemplateRef,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideBell, lucideBuilding2, lucideShieldCheck, lucideUserRound } from '@ng-icons/lucide';
import { filter, map, startWith } from 'rxjs';
import { PageTabsService, registerPageTabs } from '@core/page-tabs';
import { HlmTabsImports } from '@shared/ui/tabs';

/**
 * Constant ACCOUNT_SECTION_IDS
 *
 * @description
 * Route segments exposed by the account settings tab navigation.
 *
 * @since 1.0.0
 */
const ACCOUNT_SECTION_IDS: ReadonlySet<string> = new Set<string>([
  'profile',
  'security',
  'organizations',
  'notifications',
]);

/**
 * Component AccountPage
 * @class AccountPage
 *
 * @description
 * Shared account settings page using the same paginated Spartan `line` tabs
 * in the dashboard page header as organization settings. Each tab changes the
 * child route, whose page keeps ownership of its account workflow.
 *
 * @version 1.1.1
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-account-page',
  imports: [NgIcon, RouterOutlet, ...HlmTabsImports],
  providers: [
    provideIcons({
      lucideBell,
      lucideBuilding2,
      lucideShieldCheck,
      lucideUserRound,
    }),
  ],
  templateUrl: './account-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountPage {
  //#region Properties
  /**
   * Property route
   * @readonly
   *
   * @description
   * Parent account route used to resolve and navigate its child sections.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {ActivatedRoute}
   */
  private readonly route: ActivatedRoute = inject<ActivatedRoute>(ActivatedRoute);

  /**
   * Property router
   * @readonly
   *
   * @description
   * Drives section navigation and publishes completed child-route changes.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Router}
   */
  private readonly router: Router = inject<Router>(Router);

  /**
   * Property pageTabsService
   * @readonly
   *
   * @description
   * Shell registry receiving the account section navigation.
   *
   * @access private
   * @since 1.1.0
   *
   * @type {PageTabsService}
   */
  private readonly pageTabsService: PageTabsService = inject(PageTabsService);

  /**
   * Property pageTabs
   * @readonly
   *
   * @description
   * Account section tabs rendered beneath the active account page title.
   *
   * @access private
   * @since 1.1.0
   *
   * @type {Signal<TemplateRef<unknown> | undefined>}
   */
  private readonly pageTabs: Signal<TemplateRef<unknown> | undefined> =
    viewChild<TemplateRef<unknown>>('pageTabs');

  /**
   * Property activeSection
   * @readonly
   *
   * @description
   * Current child route projected into the Spartan tab selection.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly activeSection: Signal<string> = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((): string => this.resolveActiveSection()),
      startWith(this.resolveActiveSection()),
    ),
    { initialValue: 'profile' },
  );

  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Projects the persistent account navigation into the dashboard page header.
   *
   * @access public
   * @since 1.1.0
   */
  public constructor() {
    registerPageTabs(this.pageTabs, this.pageTabsService, inject(DestroyRef));
  }
  //#endregion

  //#region Methods
  /**
   * Method onSectionActivated
   * @method onSectionActivated
   *
   * @description
   * Navigates to the route represented by a user-selected account tab.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} sectionId - Child route segment selected by Spartan tabs.
   * @returns {void}
   */
  protected onSectionActivated(sectionId: string): void {
    if (sectionId === this.activeSection()) return;
    void this.router.navigate([sectionId], { relativeTo: this.route });
  }

  /**
   * Method resolveActiveSection
   * @method resolveActiveSection
   *
   * @description
   * Resolves the first child route segment to a known tab, falling back to profile.
   * During an in-shell navigation Angular can attach the child route before
   * publishing its snapshot, so every part of that transient chain is guarded.
   *
   * @access private
   * @since 1.0.0
   *
   * @returns {string} A recognized account section id.
   */
  private resolveActiveSection(): string {
    const sectionId: string | undefined = this.route.firstChild?.snapshot?.url[0]?.path;
    return sectionId !== undefined && ACCOUNT_SECTION_IDS.has(sectionId) ? sectionId : 'profile';
  }
  //#endregion
}
