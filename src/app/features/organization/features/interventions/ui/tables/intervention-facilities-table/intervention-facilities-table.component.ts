import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircleAlert, lucideCircleDotDashed, lucideMapPin } from '@ng-icons/lucide';
import type {
  FacilityOutput,
  FacilityType,
} from '@features/organization/features/facilities/models';
import { CollectionSurface } from '@shared/collection-surface';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmTableImports } from '@shared/ui/table';
import { InterventionTag } from '../../components/intervention-tag';

/** Placeholder rows drawn while the tab's own fetch is in flight. */
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
 * feature's own upcoming pages). A row's name links to the facility's own
 * record, unless it is still an intervention-scoped draft — those do not
 * resolve on the canonical route yet, so they render as plain text with an
 * outline "Draft" badge beside it (icon + label, never colour-only).
 *
 * @version 1.4.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-facilities-table',
  imports: [
    NgIcon,
    ...HlmEmptyImports,
    NgTemplateOutlet,
    CollectionSurface,
    RouterLink,
    HlmBadge,
    HlmButton,
    InterventionTag,
    ...HlmTableImports,
  ],
  providers: [provideIcons({ lucideCircleAlert, lucideCircleDotDashed, lucideMapPin })],
  templateUrl: './intervention-facilities-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionFacilitiesTable {
  //#region Inputs
  /**
   * Property organizationId
   * @readonly
   * @description The workspace owning the intervention, so a row can link into its facility's own record.
   * @access public
   * @since 1.3.0
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input.required<string>();

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
  /** One literal Tailwind width per column, handed to the shared surface's skeleton rows. */
  protected readonly skeletonColumnWidths: readonly string[] = [
    'h-4 w-40 max-w-full',
    'h-4 w-20',
    'h-4 w-20',
  ];
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

  /**
   * Method isDraftRecord
   *
   * @description
   * Whether the row is an intervention-scoped draft, which does not resolve
   * on the canonical `/facilities/:id` route — such a row renders as plain
   * text instead of a broken link.
   *
   * @access protected
   * @since 1.3.0
   *
   * @param {FacilityOutput} item - The facility being rendered.
   *
   * @returns {boolean} `true` while the record is still a draft.
   */
  protected isDraftRecord(item: FacilityOutput): boolean {
    return item.recordStatus === 'draft';
  }
  //#endregion
}
