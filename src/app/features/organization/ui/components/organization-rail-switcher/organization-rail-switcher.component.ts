import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  type Signal,
} from '@angular/core';
import { PRIMARY_OUTLET, Router, type UrlTree } from '@angular/router';
import { TooltipModule } from 'primeng/tooltip';
import type { OrganizationOutput } from '@features/organization/models';
import { OrganizationStore } from '@features/organization/state';

/**
 * Component OrganizationRailSwitcher
 * @class OrganizationRailSwitcher
 *
 * @description
 * The organization tiles of the shell's left rail: one 38px tile per
 * workspace (logo when the organization has one, initial otherwise), the
 * active workspace highlighted, and a dashed "add" tile leading to
 * onboarding. Selecting another workspace preserves the current sub-route,
 * query parameters and fragment — the member lands on the same page in the
 * other organization.
 *
 * Replaces the former sidebar dropdown switcher: with a permanent rail, a
 * second switching surface would only compete with it.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-rail-switcher',
  imports: [TooltipModule],
  providers: [OrganizationStore],
  templateUrl: './organization-rail-switcher.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationRailSwitcher implements OnInit {
  //#region Properties
  /**
   * Property organizationStore
   * @readonly
   *
   * @description
   * Organization store backing the tile list and the active workspace.
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
   * Router used to rewrite the organization segment of the current URL.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Router}
   */
  private readonly router: Router = inject<Router>(Router);

  /**
   * Property organizations
   * @readonly
   *
   * @description
   * Reactive organization list rendered as rail tiles.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<ReadonlyArray<OrganizationOutput>>}
   */
  protected readonly organizations: Signal<ReadonlyArray<OrganizationOutput>> = computed(
    (): ReadonlyArray<OrganizationOutput> => this.organizationStore.organizations(),
  );

  /**
   * Property activeOrganizationId
   * @readonly
   *
   * @description
   * Identifier of the currently selected workspace, if any.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string | null>}
   */
  protected readonly activeOrganizationId: Signal<string | null> = computed(
    (): string | null => this.organizationStore.selectedOrganization()?.id ?? null,
  );
  //#endregion

  //#region Lifecycle
  /**
   * Eagerly loads the organization list so the rail does not render empty
   * on first paint.
   *
   * @since 1.0.0
   */
  public ngOnInit(): void {
    this.ensureOrganizationsLoaded();
  }
  //#endregion

  //#region Methods
  /**
   * Method initialOf
   *
   * @description
   * First grapheme of the organization name, upper-cased, for logo-less tiles.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {OrganizationOutput} organization - Organization to label.
   *
   * @returns {string} Tile initial.
   */
  protected initialOf(organization: OrganizationOutput): string {
    return organization.name.trim().charAt(0).toUpperCase() || '?';
  }

  /**
   * Method switchTo
   *
   * @description
   * Navigates to the selected workspace, preserving the current sub-route
   * when the member is already inside `/organizations/:id`.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {OrganizationOutput} organization - Target workspace.
   *
   * @returns {void}
   */
  protected switchTo(organization: OrganizationOutput): void {
    if (organization.id === this.activeOrganizationId()) {
      return;
    }

    this.router.navigateByUrl(this.buildOrganizationTargetUrlTree(organization.id));
  }

  /**
   * Method addOrganization
   *
   * @description
   * Opens the onboarding flow to create a new workspace.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected addOrganization(): void {
    this.router.navigate(['/onboarding']);
  }

  /**
   * Method ensureOrganizationsLoaded
   *
   * @description
   * Loads organizations unless a list is already cached or in flight.
   *
   * @access private
   * @since 1.0.0
   *
   * @returns {void}
   */
  private ensureOrganizationsLoaded(): void {
    if (this.organizations().length || this.organizationStore.isLoadingOrganizations()) {
      return;
    }

    this.organizationStore.loadOrganizations();
  }

  /**
   * Method buildOrganizationTargetUrlTree
   *
   * @description
   * Rewrites the organization segment of the current URL, keeping the
   * sub-route, query parameters and fragment; falls back to the workspace
   * root from non-organization areas.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {string} organizationId - Target organization identifier.
   *
   * @returns {UrlTree} Navigation target.
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
