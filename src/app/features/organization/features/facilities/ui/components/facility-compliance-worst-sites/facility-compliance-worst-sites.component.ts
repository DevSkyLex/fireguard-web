import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCircleAlert,
  lucideCircleCheck,
  lucideCircleHelp,
  lucideTriangleAlert,
} from '@ng-icons/lucide';
import type { FacilityOutput } from '@features/organization/features/facilities/models';
import type { WorstFacility } from '@features/organization/features/facilities/state';
import { resolveComplianceBucket } from '@features/organization/features/facilities/utils';
import type { MapMarkerStatusKind } from '@shared/map';
import { HlmBadge } from '@shared/ui/badge';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmItemImports } from '@shared/ui/item';
import { HlmProgressImports } from '@shared/ui/progress';

/**
 * Constant WORST_SITE_BADGE_VARIANT
 *
 * @description
 * Badge variant per compliance bucket, so severity is never colour-only — the rate itself is
 * already in the row's text.
 *
 * @since 1.0.0
 */
const WORST_SITE_BADGE_VARIANT: Readonly<
  Record<MapMarkerStatusKind, 'default' | 'destructive' | 'outline' | 'secondary'>
> = {
  positive: 'secondary',
  warning: 'outline',
  critical: 'destructive',
  muted: 'outline',
  neutral: 'outline',
};

/**
 * Constant WORST_SITE_BUCKET_ICON
 *
 * @description
 * Registered lucide icon per compliance bucket, paired with the badge so severity reads through
 * shape as well as colour.
 *
 * @since 2.2.0
 */
const WORST_SITE_BUCKET_ICON: Readonly<Record<MapMarkerStatusKind, string>> = {
  positive: 'lucideCircleCheck',
  warning: 'lucideTriangleAlert',
  critical: 'lucideCircleAlert',
  muted: 'lucideCircleHelp',
  neutral: 'lucideCircleHelp',
};

/**
 * Component FacilityComplianceWorstSites
 * @class FacilityComplianceWorstSites
 *
 * @description
 * The facility map's compliance layer "worst sites" affordance: a compact,
 * pre-ranked list of the lowest compliance rates (`FacilityMapStore.worstFacilities`,
 * already capped and sorted). Selecting an entry asks the page to act — this
 * stays presentational, taking only `facilities` and emitting `selected`
 * (`ARCHITECTURE.md` §10.3).
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-facility-compliance-worst-sites',
  imports: [...HlmEmptyImports, HlmBadge, ...HlmItemImports, ...HlmProgressImports, NgIcon],
  providers: [
    provideIcons({ lucideCircleAlert, lucideCircleCheck, lucideCircleHelp, lucideTriangleAlert }),
  ],
  templateUrl: './facility-compliance-worst-sites.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilityComplianceWorstSites {
  //#region Inputs
  /**
   * Property facilities
   * @readonly
   *
   * @description
   * The lowest-rate located facilities to list, already ranked and capped by the store.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly WorstFacility[]>}
   */
  public readonly facilities: InputSignal<readonly WorstFacility[]> = input<
    readonly WorstFacility[]
  >([]);
  //#endregion

  //#region Outputs
  /**
   * Property selected
   * @readonly
   *
   * @description
   * A listed facility was activated.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<FacilityOutput>}
   */
  public readonly selected: OutputEmitterRef<FacilityOutput> = output<FacilityOutput>();
  //#endregion

  //#region Properties
  /**
   * Property regionLabel
   * @readonly
   *
   * @description
   * The list's accessible name.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {string}
   */
  protected readonly regionLabel: string = $localize`:@@facility.map.compliance.worstSitesTitle:Worst performing sites`;

  /**
   * Property rows
   * @readonly
   *
   * @description
   * Each entry paired with the badge variant its bucket resolves to, and an accessible name that
   * keeps a separator between the facility name and its rate — the visible name+badge concatenate
   * without one. Reuses the marker label's i18n unit (`utils/facility-compliance-marker`) so both
   * surfaces share one translation.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<
   *   ReadonlyArray<{
   *     readonly entry: WorstFacility;
   *     readonly badgeVariant: 'default' | 'destructive' | 'outline' | 'secondary';
   *     readonly ariaLabel: string;
   *   }>
   * >}
   */
  protected readonly rows: Signal<
    ReadonlyArray<{
      readonly entry: WorstFacility;
      readonly badgeVariant: 'default' | 'destructive' | 'outline' | 'secondary';
      readonly icon: string;
      readonly ariaLabel: string;
    }>
  > = computed(() =>
    this.facilities().map((entry) => {
      const bucket: MapMarkerStatusKind = resolveComplianceBucket(entry.complianceRate);

      return {
        entry,
        badgeVariant: WORST_SITE_BADGE_VARIANT[bucket],
        icon: WORST_SITE_BUCKET_ICON[bucket],
        ariaLabel: $localize`:@@facility.map.compliance.markerLabel:${entry.facility.name}:facilityName: — ${entry.complianceRate}:rate:% compliant`,
      };
    }),
  );
  //#endregion

  //#region Methods
  /**
   * Method onEntrySelected
   * @method onEntrySelected
   *
   * @description
   * Forwards the activated row's facility to the page.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {FacilityOutput} facility - The selected facility.
   *
   * @returns {void}
   */
  protected onEntrySelected(facility: FacilityOutput): void {
    this.selected.emit(facility);
  }
  //#endregion
}
