import { ChangeDetectionStrategy, Component, input, type InputSignal } from '@angular/core';
import { provideIcons } from '@ng-icons/core';
import { lucideCircleAlert, lucideMapPin } from '@ng-icons/lucide';
import type {
  FacilityOutput,
  FacilityType,
} from '@features/organization/features/facilities/models';
import { EmptyState } from '@shared/empty-state';
import { HlmBadge } from '@shared/ui/badge';
import { HlmSpinnerImports } from '@shared/ui/spinner';
import { HlmTableImports } from '@shared/ui/table';
import { InterventionTag } from '../../components/intervention-tag';

/**
 * The localized label for each facility type, resolved through a component
 * method rather than a template branch — a plain taxonomy, not a severity
 * status, so it renders as an outline badge with no tag-registry entry, the
 * same treatment `InterventionWorkItemTable` gives a work item's `source`.
 */
const FACILITY_TYPE_LABEL: Readonly<Record<FacilityType, string>> = {
  site: $localize`:@@facilityType.site:Site`,
  building: $localize`:@@facilityType.building:Building`,
  floor: $localize`:@@facilityType.floor:Floor`,
  zone: $localize`:@@facilityType.zone:Zone`,
  area: $localize`:@@facilityType.area:Area`,
};

/**
 * Component InterventionLinkedFacilitiesTable
 * @class InterventionLinkedFacilitiesTable
 *
 * @description
 * The Facilities tab of the intervention detail page's "Linked" surface: a
 * read-only `hlmTable` of the facilities scoped to this intervention through
 * the backend's canonical `intervention` search filter. No pagination, no
 * search, no row actions — the linked set a single intervention holds is
 * small, and this is a lookup, not a management surface (that stays in the
 * facilities feature's own upcoming pages).
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-linked-facilities-table',
  imports: [EmptyState, HlmBadge, InterventionTag, ...HlmSpinnerImports, ...HlmTableImports],
  providers: [provideIcons({ lucideCircleAlert, lucideMapPin })],
  templateUrl: './intervention-linked-facilities-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionLinkedFacilitiesTable {
  //#region Inputs
  /**
   * Property items
   * @readonly
   * @description The facilities linked to this intervention.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly FacilityOutput[]>}
   */
  public readonly items: InputSignal<readonly FacilityOutput[]> =
    input.required<readonly FacilityOutput[]>();

  /**
   * Property loading
   * @readonly
   * @description Whether the tab's own fetch is in flight.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property error
   * @readonly
   * @description The tab's own fetch error, or `null`.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string | null>}
   */
  public readonly error: InputSignal<string | null> = input<string | null>(null);
  //#endregion

  //#region Methods
  /**
   * Method typeLabelOf
   * @description The facility's type, resolved to its display label.
   * @access protected
   * @since 1.0.0
   * @param {FacilityOutput} item - The facility being rendered.
   * @returns {string} The localized type label.
   */
  protected typeLabelOf(item: FacilityOutput): string {
    return FACILITY_TYPE_LABEL[item.type];
  }
  //#endregion
}
