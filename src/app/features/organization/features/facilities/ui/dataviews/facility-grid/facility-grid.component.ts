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
  lucideBox,
  lucideEllipsis,
  lucideNetwork,
} from '@ng-icons/lucide';
import type { FacilityOutput } from '@features/organization/features/facilities/models';
import { HlmButton } from '@shared/ui/button';
import { HlmCardImports } from '@shared/ui/card';
import { HlmDropdownMenuImports } from '@shared/ui/dropdown-menu';
import { HlmSkeleton } from '@shared/ui/skeleton';
import { HlmTooltipImports } from '@shared/ui/tooltip';
import { hlm } from '@shared/ui/utils';
import { facilityTypeLabel } from '../../../utils';
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
    ...HlmTooltipImports,
  ],
  providers: [
    provideIcons({
      lucideArchive,
      lucideArchiveRestore,
      lucideBox,
      lucideEllipsis,
      lucideNetwork,
    }),
  ],
  templateUrl: './facility-grid.component.html',
  host: { class: 'block w-full @container' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilityGrid {
  /**
   * Property hlm
   * @readonly
   * @description The Tailwind class-merge helper, exposed for the template's conditional card-title padding.
   * @access protected
   * @since 2.2.0
   * @type {typeof hlm}
   */
  protected readonly hlm: typeof hlm = hlm;

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
   * @returns {string} The localized label, or a localized "Unknown type" fallback.
   */
  protected typeLabelOf(type: string): string {
    return facilityTypeLabel(type);
  }
  //#endregion
}
