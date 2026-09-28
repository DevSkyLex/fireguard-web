import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  untracked,
  viewChild,
  type InputSignal,
  type Signal,
  type TemplateRef,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircleAlert, lucideList, lucideMapPinOff } from '@ng-icons/lucide';
import { PageActionsService, registerPageActions } from '@core/page-actions';
import {
  COMPLIANCE_BUCKET_ATTENTION_THRESHOLD,
  COMPLIANCE_BUCKET_OK_THRESHOLD,
} from '@features/organization/constants';
import type { FacilityOutput } from '@features/organization/features/facilities/models';
import { FacilityMapStore } from '@features/organization/features/facilities/state';
import {
  facilityToComplianceMapMarker,
  facilityToMapMarker,
} from '@features/organization/features/facilities/utils';
import { Map, type MapMarker } from '@shared/map';
import { ResourceIllustration } from '@shared/resource-illustration';
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmButton } from '@shared/ui/button';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmSkeleton } from '@shared/ui/skeleton';
import { HlmSpinnerImports } from '@shared/ui/spinner';
import { HlmSwitch } from '@shared/ui/switch';
import { FacilityComplianceWorstSites } from '../../components/facility-compliance-worst-sites';

/**
 * Component FacilityMapPage
 * @class FacilityMapPage
 *
 * @description
 * Route entry page for the organization's facility map
 * (`/organizations/:organizationId/facilities/map`): every facility with
 * both coordinates set, rendered through the domain-agnostic `@shared/map`
 * primitive. Selecting a marker navigates to that facility's record.
 *
 * An `hlmAlert` names how many facilities still lack coordinates
 * (`FacilityMapStore.unplacedCount`) and links back to the list, where they
 * can be found and placed. When no facility has coordinates at all, or the
 * mapped-facilities load fails ({@link reloadMapped}), the map is replaced
 * by the Spartan `hlmEmpty` composition (`FEATURE.md` "Unplaced facilities
 * affordance").
 *
 * An optional, off-by-default **compliance layer** (`FacilityMapStore.complianceVisible`)
 * swaps each pin's bucket from the facility's lifecycle status to its
 * compliance rate, and folds the rate into the pin's label so the signal is
 * never colour/glyph-only; a text legend, overlaid in the map's own corner,
 * spells out the four buckets. Switching it on for the first time lazily loads the
 * Compliance-owned facility tree (`FacilityMapStore.loadCompliance`,
 * browser-only, {@link reloadCompliance} on failure) and reveals the "worst
 * sites" ranking (`FacilityComplianceWorstSites`) — announced as skeletons in
 * a `role="status"` region while that load is pending, so the confirmed-empty
 * message never shows mid-fetch; selecting a marker or a ranked entry both
 * navigate to the facility's record — `@shared/map`'s `Map` primitive only
 * ever sets its camera center once, at mount, so re-centering it
 * programmatically on a later selection is not something it supports today
 * (`FEATURE.md` "Compliance layer"). The map/side-column split is a
 * `@container` query, not a viewport breakpoint, since it must fit the
 * content column rather than the window.
 *
 * Its "Back to list" link registers on the shell header through
 * `PageActionsService`, per `DESIGN.md`'s page grammar — the content column
 * carries no back-link of its own, and no in-page toggle duplicates it: the
 * list/map choice has exactly one navigating control.
 *
 * @version 1.3.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-facility-map-page',
  imports: [
    NgIcon,
    ...HlmEmptyImports,
    ...HlmAlertImports,
    RouterLink,
    Map,
    ResourceIllustration,
    HlmButton,
    HlmSkeleton,
    HlmSwitch,
    ...HlmSpinnerImports,
    FacilityComplianceWorstSites,
    ...HlmFieldImports,
  ],
  providers: [FacilityMapStore, provideIcons({ lucideCircleAlert, lucideList, lucideMapPinOff })],
  templateUrl: './facility-map-page.component.html',
  host: { class: 'flex min-h-0 flex-1 flex-col' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilityMapPage {
  //#region Inputs
  /**
   * Property organizationId
   * @readonly
   * @description The workspace whose facilities are mapped, bound from the route.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input.required<string>();
  //#endregion

  //#region Properties
  /** The map dataset, provided by this route. */
  protected readonly store: FacilityMapStore = inject<FacilityMapStore>(FacilityMapStore);

  /** Router used to open the record a marker resolves to. */
  private readonly router: Router = inject(Router);

  /**
   * Property markers
   *
   * @readonly
   * @description
   * Every located facility, mapped onto the map primitive's generic shape.
   * While the compliance layer is on, each marker's bucket and label come
   * from its compliance rate instead of the facility's lifecycle status.
   *
   * @access protected
   * @since 1.1.0
   * @type {Signal<readonly MapMarker[]>}
   */
  protected readonly markers: Signal<readonly MapMarker[]> = computed<readonly MapMarker[]>(() => {
    const facilities: readonly FacilityOutput[] = this.store.mappedFacilities();

    if (this.store.complianceVisible()) {
      const complianceMap: ReadonlyMap<string, number | null> = this.store.complianceMap();
      return facilities
        .map((facility: FacilityOutput): MapMarker | null =>
          facilityToComplianceMapMarker(facility, complianceMap.get(facility.id) ?? null),
        )
        .filter((marker): marker is MapMarker => marker !== null);
    }

    return facilities
      .map((facility: FacilityOutput): MapMarker | null => facilityToMapMarker(facility))
      .filter((marker): marker is MapMarker => marker !== null);
  });

  /**
   * Property complianceOkThreshold
   * @readonly
   * @description The whole-percentage rate at or above which a facility's compliance bucket reads as "good" — the legend's own source of truth for {@link resolveComplianceBucket}'s cutoff, so the text never drifts from the map's actual bucketing.
   * @access protected
   * @since 2.2.0
   * @type {number}
   */
  protected readonly complianceOkThreshold: number = COMPLIANCE_BUCKET_OK_THRESHOLD;

  /**
   * Property complianceAttentionThreshold
   * @readonly
   * @description The whole-percentage rate at or above which a facility's compliance bucket reads as "warning" rather than "critical".
   * @access protected
   * @since 2.2.0
   * @type {number}
   */
  protected readonly complianceAttentionThreshold: number = COMPLIANCE_BUCKET_ATTENTION_THRESHOLD;

  /** Where the "Back to list" link and the layout toggle's list/grid entries point. */
  protected readonly listRouteBase: Signal<readonly string[]> = computed<readonly string[]>(() => [
    '/organizations',
    this.organizationId(),
    'facilities',
  ]);

  /** Registers {@link pageActions} on the shell header. */
  private readonly pageActionsService: PageActionsService = inject(PageActionsService);

  /** The "Back to list" link, registered on the shell header instead of the content column. */
  private readonly pageActions: Signal<TemplateRef<unknown> | undefined> =
    viewChild<TemplateRef<unknown>>('pageActions');
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Loads the located facilities and the unplaced count whenever the
   * organization changes. Also registers {@link pageActions}.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    registerPageActions(this.pageActions, this.pageActionsService, inject(DestroyRef));

    effect((): void => {
      const organizationId: string = this.organizationId();

      untracked((): void => {
        this.store.loadMapped({ organizationId });
        this.store.loadUnplacedCount({ organizationId });
      });
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method onMarkerSelected
   * @description Opens the record for the selected marker's facility.
   * @access protected
   * @since 1.0.0
   * @param {MapMarker} marker - The activated marker.
   * @returns {void}
   */
  protected onMarkerSelected(marker: MapMarker): void {
    void this.router.navigate([...this.listRouteBase(), marker.id]);
  }

  /**
   * Method onComplianceLayerToggled
   *
   * @description
   * Flips the compliance layer, lazily triggering the tree load the first
   * time it is switched on (`FacilityMapStore.loadCompliance`) — never on
   * every toggle, and never on page init.
   *
   * @access protected
   * @since 1.1.0
   * @param {boolean} visible - Whether the compliance layer was switched on.
   * @returns {void}
   */
  protected onComplianceLayerToggled(visible: boolean): void {
    this.store.setComplianceVisible(visible);
    if (visible && !this.store.hasLoadedCompliance()) {
      this.store.loadCompliance({ organizationId: this.organizationId() });
    }
  }

  /**
   * Method onWorstSiteSelected
   * @description Opens the record for a facility picked from the "worst sites" ranking.
   * @access protected
   * @since 1.1.0
   * @param {FacilityOutput} facility - The selected facility.
   * @returns {void}
   */
  protected onWorstSiteSelected(facility: FacilityOutput): void {
    void this.router.navigate([...this.listRouteBase(), facility.id]);
  }

  /**
   * Method reloadMapped
   * @description The mapped-facilities load-failed state's retry.
   * @access protected
   * @since 1.3.0
   * @returns {void}
   */
  protected reloadMapped(): void {
    this.store.loadMapped({ organizationId: this.organizationId() });
  }

  /**
   * Method reloadCompliance
   * @description The compliance-layer load-failed state's retry.
   * @access protected
   * @since 1.3.0
   * @returns {void}
   */
  protected reloadCompliance(): void {
    this.store.loadCompliance({ organizationId: this.organizationId() });
  }
  //#endregion
}
