import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
} from '@angular/core';
import { provideIcons } from '@ng-icons/core';
import { lucideCircleAlert, lucideMapPin } from '@ng-icons/lucide';
import type {
  FacilityOutput,
  FacilityType,
} from '@features/organization/features/facilities/models';
import { EmptyState } from '@shared/empty-state';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmSkeleton } from '@shared/ui/skeleton';
import { HlmTableImports } from '@shared/ui/table';
import { InterventionTag } from '../../components/intervention-tag';

/** Placeholder rows drawn while the tab's own fetch is in flight. */
const SKELETON_ROWS: ReadonlyArray<number> = [1, 2, 3];

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
 * Component InterventionFacilitiesTable
 * @class InterventionFacilitiesTable
 *
 * @description
 * The Facilities tab of the intervention detail page's "Linked" surface: a
 * read-only `hlmTable` of the facilities scoped to this intervention through
 * the backend's canonical `intervention` search filter, with a "Show more"
 * button appending further pages. No search, no row actions — the linked set
 * is a lookup, not a management surface (that stays in the facilities
 * feature's own upcoming pages).
 *
 * @version 1.2.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-facilities-table',
  imports: [EmptyState, HlmBadge, HlmButton, HlmSkeleton, InterventionTag, ...HlmTableImports],
  providers: [provideIcons({ lucideCircleAlert, lucideMapPin })],
  templateUrl: './intervention-facilities-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionFacilitiesTable {
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

  /**
   * Property totalItems
   * @readonly
   * @description Total linked facilities the server reports, across all pages.
   * @access public
   * @since 1.2.0
   * @type {InputSignal<number>}
   */
  public readonly totalItems: InputSignal<number> = input<number>(0);

  /**
   * Property loadingMore
   * @readonly
   * @description Whether the next page of linked facilities is being fetched.
   * @access public
   * @since 1.2.0
   * @type {InputSignal<boolean>}
   */
  public readonly loadingMore: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /**
   * Property loadMoreRequested
   * @readonly
   * @description Emits when the user asks for the next page of linked facilities.
   * @access public
   * @since 1.2.0
   * @type {OutputEmitterRef<void>}
   */
  public readonly loadMoreRequested: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Properties
  /** Placeholder rows for the loading render. */
  protected readonly skeletonRows: ReadonlyArray<number> = SKELETON_ROWS;
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
