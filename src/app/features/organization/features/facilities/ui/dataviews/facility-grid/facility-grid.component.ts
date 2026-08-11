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
import {
  lucideArchive,
  lucideArchiveRestore,
  lucideBuilding2,
  lucideEllipsis,
  lucideNetwork,
} from '@ng-icons/lucide';
import type {
  FacilityOutput,
  FacilityType,
} from '@features/organization/features/facilities/models';
import { FACILITY_TYPE_OPTIONS } from '@features/organization/features/facilities/options';
import { HlmButton } from '@shared/ui/button';
import { HlmCardImports } from '@shared/ui/card';
import { HlmDropdownMenuImports } from '@shared/ui/dropdown-menu';
import { HlmSkeleton } from '@shared/ui/skeleton';
import { FacilityStatusTag } from '../../components/facility-status-tag';

/** Placeholder cards drawn while the first page loads. */
const SKELETON_CARDS: ReadonlyArray<number> = [1, 2, 3, 4, 5, 6];

/**
 * Component FacilityGrid
 * @class FacilityGrid
 *
 * @description
 * The root-facility grid view: one `hlmCard` per facility in a responsive
 * CSS grid, offered alongside {@link FacilityTable} behind the list page's
 * layout toggle (`FEATURE.md` "Facility Listing (Roots-Only DataView)").
 * Carries the same row actions as the table — Archive and Restore — through
 * a card-corner `…` menu, since the record remains the edit surface for
 * everything else.
 *
 * Presentational (`ARCHITECTURE.md` §10.3) — it injects no store and calls
 * no service.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-facility-grid',
  imports: [
    RouterLink,
    NgIcon,
    FacilityStatusTag,
    HlmButton,
    HlmSkeleton,
    ...HlmCardImports,
    ...HlmDropdownMenuImports,
  ],
  providers: [
    provideIcons({
      lucideArchive,
      lucideArchiveRestore,
      lucideBuilding2,
      lucideEllipsis,
      lucideNetwork,
    }),
  ],
  templateUrl: './facility-grid.component.html',
  host: { class: 'block w-full' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilityGrid {
  //#region Inputs
  /**
   * Property items
   * @readonly
   * @description The cards to render — already filtered, ordered and paged by the page.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly FacilityOutput[]>}
   */
  public readonly items: InputSignal<readonly FacilityOutput[]> =
    input.required<readonly FacilityOutput[]>();

  /**
   * Property loading
   * @readonly
   * @description Whether to draw placeholder cards instead of the data.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property canWrite
   * @readonly
   * @description Whether a card's menu may offer Archive/Restore.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly canWrite: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property detailRouteBase
   * @readonly
   * @description Path segments a card's link appends the facility id to.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly string[]>}
   */
  public readonly detailRouteBase: InputSignal<readonly string[]> =
    input.required<readonly string[]>();
  //#endregion

  //#region Outputs
  /**
   * Property archiveRequested
   * @readonly
   * @description A card's menu asked for the facility to be archived.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<FacilityOutput>}
   */
  public readonly archiveRequested: OutputEmitterRef<FacilityOutput> = output<FacilityOutput>();

  /**
   * Property restoreRequested
   * @readonly
   * @description A card's menu asked for the facility to be restored.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<FacilityOutput>}
   */
  public readonly restoreRequested: OutputEmitterRef<FacilityOutput> = output<FacilityOutput>();
  //#endregion

  //#region Properties
  /** Placeholder cards for the loading render. */
  protected readonly skeletonCards: ReadonlyArray<number> = SKELETON_CARDS;
  //#endregion

  //#region Methods
  /**
   * Method typeLabelOf
   * @description The facility's type, humanized through the shared type catalog.
   * @access protected
   * @since 1.0.0
   * @param {string} type - The raw type value.
   * @returns {string} The localized label, or the raw value humanized if unknown.
   */
  protected typeLabelOf(type: string): string {
    return (
      FACILITY_TYPE_OPTIONS.find((option) => option.value === (type as FacilityType))?.label ??
      type.replace(/_/g, ' ')
    );
  }
  //#endregion
}
