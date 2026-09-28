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
import {
  lucideArchive,
  lucideArchiveRestore,
  lucideArrowDown,
  lucideArrowUp,
  lucideChevronsUpDown,
  lucideEllipsis,
  lucideNetwork,
  lucideSquareArrowOutUpRight,
} from '@ng-icons/lucide';
import type {
  FacilityListSort,
  FacilityOutput,
  FacilitySortField,
} from '@features/organization/features/facilities/models';
import { CollectionSurface } from '@shared/collection-surface';
import {
  DEFAULT_REGIONAL_FORMAT_SETTINGS,
  OrgDatePipe,
  type RegionalFormatSettings,
} from '@shared/regional-format';
import { HlmButton } from '@shared/ui/button';
import { HlmDropdownMenuImports } from '@shared/ui/dropdown-menu';
import { HlmItemImports } from '@shared/ui/item';
import { HlmTableImports } from '@shared/ui/table';
import { HlmTooltipImports } from '@shared/ui/tooltip';
import { facilityTypeLabel } from '../../../utils';
import { FacilityStatusTag } from '../../components/facility-status-tag';

/**
 * Component FacilityTable
 * @class FacilityTable
 *
 * @description
 * The root-facility list view: `hlmTable` inside the shared collection
 * surface, one row per facility, and a trailing `…` menu offering the row
 * actions this list still owns — Archive and Restore — since the record
 * itself is where every other property is edited (`FEATURE.md` "The record
 * is the edit surface").
 *
 * Presentational (`ARCHITECTURE.md` §10.3) — it injects no store and calls
 * no service. The page decides what to load, filter and paginate; a menu
 * choice only asks for the write through an `output()`. The bordered,
 * scrollable shell, the first-load skeleton and the below-`2xl` card
 * fallback all come from the shared `CollectionSurface`, and the row menu is
 * declared once as a template both the row and the card project. Name, Type,
 * Status and Updated are sortable — the backend's own sort whitelist
 * (`ListFacilitiesProvider`) also covers Code and `createdAt`, which this
 * table does not render as a column — each head is a ghost button carrying
 * the direction glyph, mirroring `InterventionTable`'s sortable-head pattern.
 * Equipment is a read-only count, not sortable. Name and Type also carry the
 * address and Updated reads the organization's regional date format through
 * {@link regionalFormatting}, injected by the page.
 *
 * @version 2.1.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-facility-table',
  imports: [
    NgTemplateOutlet,
    RouterLink,
    NgIcon,
    CollectionSurface,
    FacilityStatusTag,
    HlmButton,
    OrgDatePipe,
    ...HlmDropdownMenuImports,
    ...HlmItemImports,
    ...HlmTableImports,
    ...HlmTooltipImports,
  ],
  providers: [
    provideIcons({
      lucideArchive,
      lucideArchiveRestore,
      lucideArrowDown,
      lucideArrowUp,
      lucideChevronsUpDown,
      lucideEllipsis,
      lucideNetwork,
      lucideSquareArrowOutUpRight,
    }),
  ],
  templateUrl: './facility-table.component.html',
  host: { class: 'block min-h-0 w-full flex-1' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilityTable {
  //#region Inputs
  /**
   * Property items
   * @readonly
   * @description The rows to render — already filtered, ordered and paged by the page.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly FacilityOutput[]>}
   */
  public readonly items: InputSignal<readonly FacilityOutput[]> =
    input.required<readonly FacilityOutput[]>();

  /**
   * Property loading
   * @readonly
   * @description Whether to draw placeholder rows instead of the data.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property sortOrder
   * @readonly
   * @description The active ordering, deciding what each sortable head announces and which direction glyph it shows.
   * @access public
   * @since 1.2.0
   * @type {InputSignal<FacilityListSort>}
   */
  public readonly sortOrder: InputSignal<FacilityListSort> = input.required<FacilityListSort>();

  /**
   * Property canWrite
   * @readonly
   * @description Whether the row menu may offer Archive/Restore. False hides both rather than showing controls that would be refused.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly canWrite: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property detailRouteBase
   * @readonly
   * @description Path segments the row link appends the facility id to.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly string[]>}
   */
  public readonly detailRouteBase: InputSignal<readonly string[]> =
    input.required<readonly string[]>();

  /**
   * Property regionalFormatting
   * @readonly
   * @description The active organization's date pattern and timezone, read by the Updated column's `appOrgDate` binding.
   * @access public
   * @since 2.1.0
   * @type {InputSignal<RegionalFormatSettings>}
   */
  public readonly regionalFormatting: InputSignal<RegionalFormatSettings> =
    input<RegionalFormatSettings>(DEFAULT_REGIONAL_FORMAT_SETTINGS);
  //#endregion

  //#region Outputs
  /**
   * Property sortChanged
   * @readonly
   * @description A sortable head was activated; carries the field. Re-emitting the active field means "reverse it" — the page owns the direction.
   * @access public
   * @since 1.2.0
   * @type {OutputEmitterRef<FacilitySortField>}
   */
  public readonly sortChanged: OutputEmitterRef<FacilitySortField> = output<FacilitySortField>();

  /**
   * Property archiveRequested
   * @readonly
   * @description A row menu asked for the facility to be archived. The table never archives: the page confirms and calls the store.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<FacilityOutput>}
   */
  public readonly archiveRequested: OutputEmitterRef<FacilityOutput> = output<FacilityOutput>();

  /**
   * Property restoreRequested
   * @readonly
   * @description A row menu asked for the facility to be restored.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<FacilityOutput>}
   */
  public readonly restoreRequested: OutputEmitterRef<FacilityOutput> = output<FacilityOutput>();
  //#endregion

  //#region Properties
  /**
   * Property skeletonColumnWidths
   * @readonly
   * @description One literal Tailwind width per rendered column, handed to the shared surface's skeleton rows. Literal strings because Tailwind scans source text, and column-aware because a skeleton whose blocks do not line up with the header it replaces reads as a broken table rather than a loading one.
   * @access protected
   * @since 2.0.0
   * @type {readonly string[]}
   */
  protected readonly skeletonColumnWidths: readonly string[] = [
    'w-40 max-w-full',
    'w-24',
    'w-16',
    'w-20',
    'ms-auto w-10',
    'w-20',
    'ms-auto size-6',
  ];
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

  /**
   * Method columnCount
   * @description How many cells a row has, so the empty-state message can span the full width.
   * @access protected
   * @since 1.1.0
   * @returns {number} The rendered column count.
   */
  protected columnCount(): number {
    return 7;
  }

  /**
   * Method ariaSort
   * @description What a sortable head announces for the active ordering.
   * @access protected
   * @since 1.2.0
   * @param {FacilitySortField} field - The head's field.
   * @returns {'ascending' | 'descending' | 'none'} The `aria-sort` value.
   */
  protected ariaSort(field: FacilitySortField): 'ascending' | 'descending' | 'none' {
    const active: FacilityListSort = this.sortOrder();

    if (active.field !== field) return 'none';

    return active.direction === 'asc' ? 'ascending' : 'descending';
  }

  /**
   * Method sortIcon
   * @description The glyph a sortable head shows: a direction when it is the active one, a neutral pair otherwise.
   * @access protected
   * @since 1.2.0
   * @param {FacilitySortField} field - The head's field.
   * @returns {string} A registered lucide name.
   */
  protected sortIcon(field: FacilitySortField): string {
    const active: FacilityListSort = this.sortOrder();

    if (active.field !== field) return 'lucideChevronsUpDown';

    return active.direction === 'asc' ? 'lucideArrowUp' : 'lucideArrowDown';
  }
  //#endregion
}
