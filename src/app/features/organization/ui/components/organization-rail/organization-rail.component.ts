import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  type OnInit,
  type Signal,
} from '@angular/core';
import { Router, type UrlTree } from '@angular/router';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import type { OrganizationOutput } from '@features/organization/models';
import {
  ORGANIZATION_CONTEXT_PORT,
  type OrganizationContextPort,
} from '@features/organization/ports';
import { OrganizationStore } from '@features/organization/state';
import { deriveInitials } from '@shared/initials';
import type { OrganizationRailTile } from './models';

/**
 * Component OrganizationRail
 * @class OrganizationRail
 *
 * @description
 * Organization tiles for the workspace rail: one 38px tile per organization the
 * member belongs to, the active one ringed, followed by a dashed "add" tile.
 * Contributed to the workspace layout's `RAIL_SLOT` lead region.
 *
 * Feature-owned rather than layout-owned because it reads organization state
 * — the layout only provides the column (`ARCHITECTURE.md` §2.7).
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-organization-rail />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-rail',
  imports: [SkeletonModule, TooltipModule],
  // `OrganizationStore` is component-scoped by design (no `providedIn: 'root'`),
  // so each consumer owns an instance tied to its own lifecycle — the
  // organization switcher does the same.
  providers: [OrganizationStore],
  templateUrl: './organization-rail.component.html',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationRail implements OnInit {
  //#region Properties
  /**
   * Property organizationStore
   * @readonly
   *
   * @description
   * Root organization store holding the member's organizations and the
   * currently selected one.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {OrganizationStore}
   */
  private readonly organizationStore: OrganizationStore =
    inject<OrganizationStore>(OrganizationStore);

  /**
   * Property router
   * @readonly
   *
   * @description
   * Router used to switch organizations and to reach organization creation.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Router}
   */
  private readonly router: Router = inject<Router>(Router);

  /**
   * Property organizationContext
   * @readonly
   *
   * @description
   * Published contract for the routed organization. Read through the port
   * rather than the component-scoped list store, whose own selection is local
   * to that instance and would not follow the route.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {OrganizationContextPort}
   */
  private readonly organizationContext: OrganizationContextPort =
    inject<OrganizationContextPort>(ORGANIZATION_CONTEXT_PORT);

  /**
   * Property tiles
   * @readonly
   *
   * @description
   * One tile per organization, in list order, carrying its initials, logo and
   * selection state.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly OrganizationRailTile[]>}
   */
  protected readonly tiles: Signal<readonly OrganizationRailTile[]> = computed(
    (): readonly OrganizationRailTile[] => {
      const activeId: string | null = this.organizationContext.selectedOrganizationId();

      return this.organizationStore
        .organizations()
        .map((organization: OrganizationOutput): OrganizationRailTile => {
          // API Platform omits null fields, so `logoUrl` arrives `undefined`
          // rather than null — a `=== null` guard would let it through.
          const logoUrl: string | null = organization.logoUrl ?? null;

          return {
            id: organization.id,
            name: organization.name,
            initials: deriveInitials(organization.name),
            logoUrl,
            active: organization.id === activeId,
          };
        });
    },
  );

  /**
   * Property loading
   * @readonly
   *
   * @description
   * Whether the organization list is still loading, so the rail can render
   * placeholder tiles instead of collapsing to nothing.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly loading: Signal<boolean> = computed((): boolean =>
    this.organizationStore.isLoadingOrganizations(),
  );
  //#endregion

  //#region Lifecycle
  /**
   * Method ngOnInit
   * @method ngOnInit
   *
   * @description
   * Loads the organization list when nothing has fetched it yet. In the
   * dashboard shell the organization switcher is what triggers this; the
   * workspace rail has no switcher above it, so without this the rail renders
   * empty for a member who lands directly on a workspace URL.
   *
   * @access public
   * @since 1.0.0
   *
   * @return {void}
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
   * Switches the workspace to another organization, preserving the current
   * sub-path where possible.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {OrganizationRailTile} tile - Tile the member activated.
   *
   * @return {void}
   */
  protected select(tile: OrganizationRailTile): void {
    if (tile.active) return;

    const target: UrlTree = this.router.createUrlTree(['/organizations', tile.id]);

    void this.router.navigateByUrl(target);
  }

  /**
   * Method createOrganization
   * @method createOrganization
   *
   * @description
   * Opens the organization creation flow. That flow lives in onboarding, not
   * under `/organizations` — same destination the organization switcher uses.
   *
   * @access protected
   * @since 1.0.0
   *
   * @return {void}
   */
  protected createOrganization(): void {
    void this.router.navigate(['/onboarding']);
  }
  //#endregion
}
